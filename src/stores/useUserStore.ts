import { create } from 'zustand';
import type { Channel, HistoryItem } from '../core/domain/types';
import { storageAdapter } from '../adapters/storage/IndexedDbAdapter';

interface UserState {
  favorites: Set<string>;
  orderedFavoriteIds: string[];
  history: HistoryItem[];
  isLoaded: boolean;
  loadUserData: () => Promise<void>;
  toggleFavorite: (channelId: string) => Promise<void>;
  reorderFavorites: (newOrder: string[]) => Promise<void>;
  isFavorite: (channelId: string) => boolean;
  addToHistory: (channel: Channel) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  favorites: new Set<string>(),
  orderedFavoriteIds: [],
  history: [],
  isLoaded: false,

  loadUserData: async () => {
    const [savedFavorites, savedHistory] = await Promise.all([
      storageAdapter.getFavorites(),
      storageAdapter.getHistory(),
    ]);

    set({
      favorites: new Set(savedFavorites),
      orderedFavoriteIds: savedFavorites,
      history: savedHistory,
      isLoaded: true,
    });
  },

  toggleFavorite: async (channelId: string) => {
    const { favorites, orderedFavoriteIds } = get();
    const nextFavorites = new Set(favorites);
    let nextOrder = [...orderedFavoriteIds];

    if (nextFavorites.has(channelId)) {
      nextFavorites.delete(channelId);
      nextOrder = nextOrder.filter((id) => id !== channelId);
    } else {
      nextFavorites.add(channelId);
      if (!nextOrder.includes(channelId)) {
        nextOrder.push(channelId);
      }
    }

    set({ favorites: nextFavorites, orderedFavoriteIds: nextOrder });
    await storageAdapter.saveFavorites(nextOrder);
  },

  reorderFavorites: async (newOrder: string[]) => {
    set({ orderedFavoriteIds: newOrder, favorites: new Set(newOrder) });
    await storageAdapter.saveFavorites(newOrder);
  },

  isFavorite: (channelId: string) => {
    return get().favorites.has(channelId);
  },

  addToHistory: async (channel: Channel) => {
    const { history } = get();
    // Filter out existing occurrence to push this one to the top (LRU)
    const filtered = history.filter((item) => item.channelId !== channel.id);

    const newItem: HistoryItem = {
      channelId: channel.id,
      channelName: channel.name,
      channelLogo: channel.logo,
      group: channel.group,
      timestamp: Date.now(),
    };

    // Keep up to 50 items
    const nextHistory = [newItem, ...filtered].slice(0, 50);

    set({ history: nextHistory });
    await storageAdapter.saveHistory(nextHistory);
  },

  clearHistory: async () => {
    set({ history: [] });
    await storageAdapter.saveHistory([]);
  },
}));
