import { create } from 'zustand';
import type { Settings } from '../core/domain/types';
import { DEFAULT_PLAYLIST_URL, DEFAULT_CORS_PROXY } from '../core/presets/iptvPresets';
import { storageAdapter } from '../adapters/storage/IndexedDbAdapter';

interface SettingsState extends Settings {
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  loadInitialSettings: () => Promise<void>;
  resolveStreamUrl: (rawUrl: string, forceMode?: 'direct' | 'proxy') => string;
}

const getPreferredProxy = () => {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return '/api/proxy?url=';
  }
  return DEFAULT_CORS_PROXY;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  m3uUrl: DEFAULT_PLAYLIST_URL,
  corsProxyEnabled: false,
  corsProxyUrl: getPreferredProxy(),
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
      if (
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
        saved.corsProxyUrl?.includes('corsproxy.io')
      ) {
        saved.corsProxyUrl = '/api/proxy?url=';
      }
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
