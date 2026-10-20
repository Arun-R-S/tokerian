// VOD and Series Store ported and adapted from Xtream & VOD modules
// Manages Movies, Series, Categories, Resume State, and Details presentation.

import { create } from 'zustand';
import {
  VodService,
  type VodItem,
  type SeriesItem,
  type PlaybackPosition,
} from '../services/vod/VodService';
import type { PlaylistRecord } from './useMultiPlaylistStore';
import type { Channel } from '../core/domain/types';
import type { XtreamSeriesDetails } from '../services/portal/XtreamClient';

export type VodSortOption = 'recent' | 'rating' | 'name';

interface VodState {
  movies: VodItem[];
  series: SeriesItem[];
  movieCategories: Array<{ id: string; name: string }>;
  seriesCategories: Array<{ id: string; name: string }>;
  selectedCategory: string; // 'ALL' or category ID/name
  searchQuery: string;
  sortBy: VodSortOption;
  continueWatching: PlaybackPosition[];
  isLoading: boolean;

  // Detail Modal State
  activeItem: VodItem | SeriesItem | null;
  activeSeriesDetails: XtreamSeriesDetails | null;
  isLoadingDetails: boolean;

  // Actions
  loadCatalog: (playlist: PlaylistRecord, channels: Channel[]) => Promise<void>;
  setSelectedCategory: (catId: string) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: VodSortOption) => void;
  openDetail: (item: VodItem | SeriesItem, playlist?: PlaylistRecord) => Promise<void>;
  closeDetail: () => void;
  saveProgress: (pos: PlaybackPosition) => Promise<void>;
  clearProgress: (id: string) => Promise<void>;
  refreshContinueWatching: () => Promise<void>;
}

export const useVodStore = create<VodState>((set) => ({
  movies: [],
  series: [],
  movieCategories: [],
  seriesCategories: [],
  selectedCategory: 'ALL',
  searchQuery: '',
  sortBy: 'recent',
  continueWatching: [],
  isLoading: false,

  activeItem: null,
  activeSeriesDetails: null,
  isLoadingDetails: false,

  loadCatalog: async (playlist: PlaylistRecord, channels: Channel[]) => {
    set({ isLoading: true });

    try {
      // 1. Load Continue Watching List
      const continueWatching = await VodService.getContinueWatchingList();

      if (playlist.type === 'xtream' && playlist.credentials) {
        // 2a. Fetch from Xtream API
        const [moviesRes, seriesRes] = await Promise.all([
          VodService.fetchXtreamMovies(playlist),
          VodService.fetchXtreamSeries(playlist),
        ]);

        set({
          movies: moviesRes.movies,
          series: seriesRes.series,
          movieCategories: moviesRes.categories,
          seriesCategories: seriesRes.categories,
          continueWatching,
          isLoading: false,
        });
      } else {
        // 2b. Partition standard M3U Playlist channels
        const { movies, series } = VodService.partitionM3uChannels(channels);

        // Derive unique categories
        const movieCatSet = new Set<string>();
        movies.forEach((m) => movieCatSet.add(m.category));
        const movieCategories = Array.from(movieCatSet).map((cat) => ({ id: cat, name: cat }));

        const seriesCatSet = new Set<string>();
        series.forEach((s) => seriesCatSet.add(s.category));
        const seriesCategories = Array.from(seriesCatSet).map((cat) => ({ id: cat, name: cat }));

        set({
          movies,
          series,
          movieCategories,
          seriesCategories,
          continueWatching,
          isLoading: false,
        });
      }
    } catch (err) {
      console.error('[useVodStore] Failed to load VOD catalog:', err);
      set({ isLoading: false });
    }
  },

  setSelectedCategory: (catId: string) => {
    set({ selectedCategory: catId });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSortBy: (sort: VodSortOption) => {
    set({ sortBy: sort });
  },

  openDetail: async (item: VodItem | SeriesItem, playlist?: PlaylistRecord) => {
    set({ activeItem: item, activeSeriesDetails: null, isLoadingDetails: false });

    // If it's a TV series and has an Xtream source, fetch full seasons and episodes
    if ('seriesId' in item && playlist?.type === 'xtream') {
      set({ isLoadingDetails: true });
      const details = await VodService.fetchXtreamSeriesDetails(playlist, item.seriesId);
      set({ activeSeriesDetails: details, isLoadingDetails: false });
    }
  },

  closeDetail: () => {
    set({ activeItem: null, activeSeriesDetails: null, isLoadingDetails: false });
  },

  saveProgress: async (pos: PlaybackPosition) => {
    await VodService.savePosition(pos);
    const continueWatching = await VodService.getContinueWatchingList();
    set({ continueWatching });
  },

  clearProgress: async (id: string) => {
    await VodService.clearPosition(id);
    const continueWatching = await VodService.getContinueWatchingList();
    set({ continueWatching });
  },

  refreshContinueWatching: async () => {
    const continueWatching = await VodService.getContinueWatchingList();
    set({ continueWatching });
  },
}));
