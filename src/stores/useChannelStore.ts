import { create } from 'zustand';
import type { Channel } from '../core/domain/types';
import { parseM3UAsync } from '../core/parser/m3uParser';
import { storageAdapter } from '../adapters/storage/IndexedDbAdapter';

interface ChannelState {
  channels: Channel[];
  groups: string[];
  groupMap: Map<string, string[]>;
  activeCategory: string;
  searchQuery: string;
  isLoading: boolean;
  loadingProgress: number;
  loadingStatusText: string;
  error: string | null;
  activePlaylistUrl: string;

  // Actions
  loadPlaylist: (url: string, forceRefresh?: boolean) => Promise<void>;
  setActiveCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  getFilteredChannels: () => Channel[];
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  groups: [],
  groupMap: new Map(),
  activeCategory: 'All',
  searchQuery: '',
  isLoading: false,
  loadingProgress: 0,
  loadingStatusText: '',
  error: null,
  activePlaylistUrl: '',

  loadPlaylist: async (url: string, forceRefresh = false) => {
    if (!url) return;

    set({
      isLoading: true,
      error: null,
      loadingProgress: 10,
      loadingStatusText: 'Checking local cache...',
      activePlaylistUrl: url,
    });

    const cacheKey = encodeURIComponent(url);

    // 1. Try local cache if not forcing refresh
    if (!forceRefresh) {
      const cached = await storageAdapter.getChannels(cacheKey);
      if (cached && cached.length > 0) {
        // Build groups from cached channels
        const groupSet = new Set<string>();
        const groupMap = new Map<string, string[]>();

        for (const ch of cached) {
          groupSet.add(ch.group);
          const list = groupMap.get(ch.group);
          if (list) {
            list.push(ch.id);
          } else {
            groupMap.set(ch.group, [ch.id]);
          }
        }

        const groups = Array.from(groupSet).sort((a, b) => a.localeCompare(b));

        set({
          channels: cached,
          groups: ['All', ...groups],
          groupMap,
          isLoading: false,
          loadingProgress: 100,
          loadingStatusText: `Loaded ${cached.length.toLocaleString()} channels from cache`,
        });
        return;
      }
    }

    // 2. Fetch fresh playlist from network
    try {
      set({ loadingProgress: 25, loadingStatusText: 'Downloading playlist...' });

      let response: Response;
      try {
        response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (networkErr) {
        // Fallback to CORS proxy if browser blocks direct fetch
        console.warn('Direct fetch failed, attempting via CORS proxy...', networkErr);
        set({ loadingProgress: 35, loadingStatusText: 'Direct connection blocked, routing via CORS proxy...' });
        const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
        response = await fetch(proxyUrl);
      }

      if (!response.ok) {
        throw new Error(`Failed to download playlist: HTTP ${response.status} ${response.statusText}`);
      }

      set({ loadingProgress: 50, loadingStatusText: 'Reading playlist content...' });
      const m3uText = await response.text();

      set({ loadingProgress: 70, loadingStatusText: 'Parsing channels & categories...' });
      const parsed = await parseM3UAsync(m3uText, (pct) => {
        set({ loadingProgress: 70 + Math.round(pct * 0.25) });
      });

      // Save to IndexedDB cache in background
      storageAdapter.saveChannels(cacheKey, parsed.channels);

      set({
        channels: parsed.channels,
        groups: ['All', ...parsed.groups],
        groupMap: parsed.groupMap,
        isLoading: false,
        loadingProgress: 100,
        loadingStatusText: `Ready: ${parsed.channels.length.toLocaleString()} channels`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown network error';
      set({
        isLoading: false,
        error: `Could not load playlist: ${msg}. Please check the URL or your connection.`,
        loadingStatusText: 'Error loading playlist',
      });
    }
  },

  setActiveCategory: (category: string) => {
    set({ activeCategory: category });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  getFilteredChannels: () => {
    const { channels, activeCategory, searchQuery } = get();
    const query = searchQuery.trim().toLowerCase();

    // Fast path: No category filter, no search query
    if (activeCategory === 'All' && !query) {
      return channels;
    }

    // Filter by category and search term
    return channels.filter((ch) => {
      const matchesCategory = activeCategory === 'All' || ch.group === activeCategory;
      if (!matchesCategory) return false;

      if (!query) return true;

      return (
        ch.name.toLowerCase().includes(query) ||
        (ch.tvgName && ch.tvgName.toLowerCase().includes(query)) ||
        (ch.country && ch.country.toLowerCase().includes(query)) ||
        (ch.language && ch.language.toLowerCase().includes(query))
      );
    });
  },
}));
