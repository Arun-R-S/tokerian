import { get, set, del, clear } from 'idb-keyval';
import type { IStoragePort } from '../../core/ports/IStoragePort';
import type { Channel, HistoryItem, Settings } from '../../core/domain/types';

const STORAGE_KEYS = {
  CHANNELS_PREFIX: 'tokerian_channels_',
  FAVORITES: 'tokerian_favorites',
  HISTORY: 'tokerian_history',
  SETTINGS: 'tokerian_settings',
} as const;

export class IndexedDbAdapter implements IStoragePort {
  async saveChannels(playlistKey: string, channels: Channel[]): Promise<void> {
    try {
      await set(`${STORAGE_KEYS.CHANNELS_PREFIX}${playlistKey}`, channels);
    } catch (e) {
      console.warn('Failed to cache channels in IndexedDB:', e);
    }
  }

  async getChannels(playlistKey: string): Promise<Channel[] | null> {
    try {
      const data = await get<Channel[]>(`${STORAGE_KEYS.CHANNELS_PREFIX}${playlistKey}`);
      return data || null;
    } catch (e) {
      console.warn('Failed to read channels from IndexedDB:', e);
      return null;
    }
  }

  async clearChannels(playlistKey?: string): Promise<void> {
    try {
      if (playlistKey) {
        await del(`${STORAGE_KEYS.CHANNELS_PREFIX}${playlistKey}`);
      }
    } catch (e) {
      console.warn('Failed to clear channels from IndexedDB:', e);
    }
  }

  async saveFavorites(favorites: string[]): Promise<void> {
    try {
      await set(STORAGE_KEYS.FAVORITES, favorites);
    } catch (e) {
      console.warn('Failed to save favorites:', e);
    }
  }

  async getFavorites(): Promise<string[]> {
    try {
      const data = await get<string[]>(STORAGE_KEYS.FAVORITES);
      return data || [];
    } catch (e) {
      console.warn('Failed to load favorites:', e);
      return [];
    }
  }

  async saveHistory(history: HistoryItem[]): Promise<void> {
    try {
      await set(STORAGE_KEYS.HISTORY, history);
    } catch (e) {
      console.warn('Failed to save history:', e);
    }
  }

  async getHistory(): Promise<HistoryItem[]> {
    try {
      const data = await get<HistoryItem[]>(STORAGE_KEYS.HISTORY);
      return data || [];
    } catch (e) {
      console.warn('Failed to load history:', e);
      return [];
    }
  }

  async saveSettings(settings: Partial<Settings>): Promise<void> {
    try {
      const existing = (await this.getSettings()) || {};
      await set(STORAGE_KEYS.SETTINGS, { ...existing, ...settings });
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  async getSettings(): Promise<Settings | null> {
    try {
      const data = await get<Settings>(STORAGE_KEYS.SETTINGS);
      return data || null;
    } catch (e) {
      console.warn('Failed to load settings:', e);
      return null;
    }
  }

  async clearAll(): Promise<void> {
    try {
      await clear();
    } catch (e) {
      console.warn('Failed to clear IndexedDB:', e);
    }
  }
}

// Singleton storage adapter instance
export const storageAdapter = new IndexedDbAdapter();
