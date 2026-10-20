import { create } from 'zustand';
import type { Settings } from '../core/domain/types';
import { DEFAULT_PLAYLIST_URL, DEFAULT_CORS_PROXY } from '../core/presets/iptvPresets';
import { storageAdapter } from '../adapters/storage/IndexedDbAdapter';

import {
  hashParentalPin,
  verifyParentalPin,
  DEFAULT_ADULT_KEYWORDS,
} from '../utils/parentalLock';

interface SettingsState extends Settings {
  isSessionUnlocked: boolean;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  loadInitialSettings: () => Promise<void>;
  resolveStreamUrl: (rawUrl: string, forceMode?: 'direct' | 'proxy') => string;
  unlockParentalSession: (pin: string) => Promise<boolean>;
  lockParentalSession: () => void;
  setParentalPin: (newPin: string) => Promise<void>;
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
  defaultExternalPlayer: 'vlc',
  customVlcPath: '',
  customMpvPath: '',
  cleanChannelTitles: false,
  parentalLockEnabled: false,
  parentalLockPinHash: null,
  lockedKeywords: DEFAULT_ADULT_KEYWORDS,
  recordingFolder: 'C:\\Users\\arunr\\Downloads\\TokerianRecordings',
  recordingFormat: 'mp4',
  isSessionUnlocked: false,

  unlockParentalSession: async (pin: string) => {
    const { parentalLockPinHash } = get();
    if (!parentalLockPinHash) {
      set({ isSessionUnlocked: true });
      return true;
    }
    const ok = await verifyParentalPin(pin, parentalLockPinHash);
    if (ok) {
      set({ isSessionUnlocked: true });
    }
    return ok;
  },

  lockParentalSession: () => {
    set({ isSessionUnlocked: false });
  },

  setParentalPin: async (newPin: string) => {
    const hash = await hashParentalPin(newPin);
    const updates = {
      parentalLockPinHash: hash,
      parentalLockEnabled: true,
    };
    set(updates);
    await storageAdapter.saveSettings(updates);
  },

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
