import { create } from 'zustand';
import type { Settings } from '../core/domain/types';
import { DEFAULT_PLAYLIST_URL, DEFAULT_CORS_PROXY } from '../core/presets/iptvPresets';
import { storageAdapter } from '../adapters/storage/IndexedDbAdapter';

interface SettingsState extends Settings {
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  loadInitialSettings: () => Promise<void>;
  resolveStreamUrl: (rawUrl: string) => string;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  m3uUrl: DEFAULT_PLAYLIST_URL,
  corsProxyEnabled: true,
  corsProxyUrl: DEFAULT_CORS_PROXY,
  bufferLength: 30,
  autoPlayNextOnError: true,
  hardwareAcceleration: true,
  theme: 'dark',
  tvMode: false,
  pageSize: 100,

  updateSettings: async (newSettings) => {
    set(newSettings);
    await storageAdapter.saveSettings(newSettings);
  },

  loadInitialSettings: async () => {
    const saved = await storageAdapter.getSettings();
    if (saved) {
      set(saved);
    }
  },

  resolveStreamUrl: (rawUrl: string) => {
    const { corsProxyEnabled, corsProxyUrl } = get();
    if (!corsProxyEnabled || !rawUrl) return rawUrl;
    
    // If URL is already proxied, do not double-proxy
    if (rawUrl.startsWith('http://localhost') || rawUrl.includes('corsproxy.io')) {
      return rawUrl;
    }

    // Direct playback for HTTPS if proxy not strictly needed, but corsproxy.io fixes missing CORS headers
    return `${corsProxyUrl}${encodeURIComponent(rawUrl)}`;
  },
}));
