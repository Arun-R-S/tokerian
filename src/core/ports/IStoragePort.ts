import type { Channel, HistoryItem, Settings } from '../domain/types';

export interface IStoragePort {
  saveChannels(playlistKey: string, channels: Channel[]): Promise<void>;
  getChannels(playlistKey: string): Promise<Channel[] | null>;
  clearChannels(playlistKey?: string): Promise<void>;

  saveFavorites(favorites: string[]): Promise<void>;
  getFavorites(): Promise<string[]>;

  saveHistory(history: HistoryItem[]): Promise<void>;
  getHistory(): Promise<HistoryItem[]>;

  saveSettings(settings: Partial<Settings>): Promise<void>;
  getSettings(): Promise<Settings | null>;
}
