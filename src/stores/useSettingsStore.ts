import { create } from 'zustand';
import type { Settings } from '../core/domain/types';
import { DEFAULT_PLAYLIST_URL, DEFAULT_CORS_PROXY } from '../core/presets/iptvPresets';
import { storageAdapter } from '../adapters/storage/IndexedDbAdapter';

interface SettingsState extends Settings {
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  loadInitialSettings: () => Promise<void>;
  resolveStreamUrl: (rawUrl: string, forceMode?: 'direct' | 'proxy') => string;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  m3uUrl: DEFAULT_PLAYLIST_URL,
  corsProxyEnabled: false,
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

  resolveStreamUrl: (rawUrl: string, forceMode?: 'direct' | 'proxy') => {
    if (!rawUrl) return '';

    // If already proxied, do not double proxy
    if (rawUrl.startsWith('http://localhost') || rawUrl.includes('corsproxy.io')) {
      return rawUrl;
    }

    if (forceMode === 'direct') return rawUrl;

    const { corsProxyEnabled, corsProxyUrl } = get();
    const shouldUseProxy = forceMode === 'proxy' || corsProxyEnabled;

    if (shouldUseProxy) {
      return `${corsProxyUrl}${encodeURIComponent(rawUrl)}`;
    }

    return rawUrl;
  },
}));
