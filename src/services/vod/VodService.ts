// VOD and TV Series Service ported and adapted
// Manages Movies & Series extraction, Xtream catalog requests, and "Continue Watching" resume state.

import { get, set } from 'idb-keyval';
import type { Channel } from '../../core/domain/types';
import type { PlaylistRecord } from '../../stores/useMultiPlaylistStore';
import {
  XtreamClient,
  type XtreamVodItem,
  type XtreamSeriesItem,
  type XtreamSeriesDetails,
} from '../portal/XtreamClient';

export interface VodItem {
  id: string;
  name: string;
  url: string;
  logo?: string;
  category: string;
  categoryId?: string;
  rating?: string;
  releaseDate?: string;
  containerExtension?: string;
  plot?: string;
  streamId?: number | string;
  sourceType: 'm3u' | 'xtream';
}

export interface SeriesItem {
  id: string;
  seriesId: number | string;
  name: string;
  cover?: string;
  category: string;
  categoryId?: string;
  rating?: string;
  releaseDate?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  sourceType: 'm3u' | 'xtream';
}

export interface PlaybackPosition {
  id: string; // unique item / stream ID
  playlistId: string;
  title: string;
  poster?: string;
  url: string;
  currentTime: number; // in seconds
  duration: number; // in seconds
  percentage: number; // 0 to 100
  lastWatchedTimestamp: number;
  isFinished: boolean;
  isSeries?: boolean;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

const STORAGE_KEY_POSITIONS = 'tokerian_vod_playback_positions';

// Heuristic regex from m3u-vod-detection
const VOD_CONTAINER_EXTENSIONS = new Set([
  'avi', 'asf', 'divx', 'flv', 'm2ts', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'rm', 'rmvb', 'vob', 'webm', 'wmv',
]);

const MOVIE_PATH_SEGMENTS = new Set(['movie', 'movies', 'vod']);
const SERIES_PATH_SEGMENT = 'series';

const SEASON_EPISODE_CODE = /(?:^|[^a-z0-9])s\d{1,2}[\s._-]*e\d{1,3}(?![a-z0-9])/i;
const CROSS_EPISODE_CODE = /(?:^|[^0-9])\d{1,2}x\d{2,3}(?![0-9])/;
const EPISODE_WORD_MARKER = /(?:episode|episodio|folge|odcinek|aflevering|season|saison|temporada)[\s._-]*\d{1,3}/i;

export class VodService {
  /**
   * Evaluates whether an M3U stream entry represents a VOD asset or TV episode rather than a live channel.
   */
  static isM3uVod(url: string): boolean {
    if (!url) return false;
    const cleanUrl = url.toLowerCase();
    
    // Check file extension
    const extMatch = cleanUrl.match(/\.([a-z0-9]{2,4})(?:[?#]|$)/);
    if (extMatch && VOD_CONTAINER_EXTENSIONS.has(extMatch[1])) {
      return true;
    }

    // Check URL path segments
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.toLowerCase().split('/').filter(Boolean);
      return segments.some((s) => MOVIE_PATH_SEGMENTS.has(s) || s === SERIES_PATH_SEGMENT);
    } catch {
      return false;
    }
  }

  /**
   * Checks if channel name or URL contains season/episode identifiers.
   */
  static hasEpisodeMarker(name: string, url: string): boolean {
    const target = `${name} ${url}`.toLowerCase();
    return (
      SEASON_EPISODE_CODE.test(target) ||
      CROSS_EPISODE_CODE.test(target) ||
      EPISODE_WORD_MARKER.test(target) ||
      url.toLowerCase().includes('/series/')
    );
  }

  /**
   * Partitions a list of M3U channels into Live Channels, Movies, and Series.
   */
  static partitionM3uChannels(channels: Channel[]): {
    movies: VodItem[];
    series: SeriesItem[];
  } {
    const movies: VodItem[] = [];
    const seriesMap = new Map<string, SeriesItem>();

    for (const ch of channels) {
      if (this.isM3uVod(ch.url)) {
        if (this.hasEpisodeMarker(ch.name, ch.url)) {
          // Extract base series title by removing S01E01 etc.
          const baseName = ch.name.replace(/s\d{1,2}[\s._-]*e\d{1,3}.*$/i, '').trim() || ch.name;
          if (!seriesMap.has(baseName)) {
            seriesMap.set(baseName, {
              id: `m3u-series-${encodeURIComponent(baseName)}`,
              seriesId: baseName,
              name: baseName,
              cover: ch.logo,
              category: ch.group || 'TV Series',
              sourceType: 'm3u',
            });
          }
        } else {
          movies.push({
            id: ch.id,
            name: ch.name,
            url: ch.url,
            logo: ch.logo,
            category: ch.group || 'Movies',
            sourceType: 'm3u',
          });
        }
      }
    }

    return {
      movies,
      series: Array.from(seriesMap.values()),
    };
  }

  /**
   * Fetches full VOD Movie catalog from Xtream server.
   */
  static async fetchXtreamMovies(playlist: PlaylistRecord): Promise<{
    movies: VodItem[];
    categories: Array<{ id: string; name: string }>;
  }> {
    if (!playlist.credentials) return { movies: [], categories: [] };
    const creds = playlist.credentials;

    try {
      const [categories, streams] = await Promise.all([
        XtreamClient.getVodCategories(creds).catch(() => []),
        XtreamClient.getVodStreams(creds).catch(() => []),
      ]);

      const categoryNameMap = new Map<string, string>();
      categories.forEach((cat) => {
        categoryNameMap.set(String(cat.category_id), cat.category_name);
      });

      const movies: VodItem[] = streams.map((item: XtreamVodItem) => ({
        id: `xtream-vod-${item.stream_id}`,
        streamId: item.stream_id,
        name: item.name,
        url: XtreamClient.buildVodStreamUrl(creds, item.stream_id, item.container_extension || 'mp4'),
        logo: item.stream_icon,
        category: categoryNameMap.get(String(item.category_id)) || 'Movies',
        categoryId: String(item.category_id),
        rating: item.rating,
        releaseDate: item.added ? new Date(Number(item.added) * 1000).getFullYear().toString() : undefined,
        containerExtension: item.container_extension,
        sourceType: 'xtream',
      }));

      return {
        movies,
        categories: categories.map((c) => ({ id: String(c.category_id), name: c.category_name })),
      };
    } catch (err) {
      console.error('[VodService] Failed to fetch Xtream movies:', err);
      return { movies: [], categories: [] };
    }
  }

  /**
   * Fetches full TV Series catalog from Xtream server.
   */
  static async fetchXtreamSeries(playlist: PlaylistRecord): Promise<{
    series: SeriesItem[];
    categories: Array<{ id: string; name: string }>;
  }> {
    if (!playlist.credentials) return { series: [], categories: [] };
    const creds = playlist.credentials;

    try {
      const [categories, seriesList] = await Promise.all([
        XtreamClient.getSeriesCategories(creds).catch(() => []),
        XtreamClient.getSeries(creds).catch(() => []),
      ]);

      const categoryNameMap = new Map<string, string>();
      categories.forEach((cat) => {
        categoryNameMap.set(String(cat.category_id), cat.category_name);
      });

      const series: SeriesItem[] = seriesList.map((item: XtreamSeriesItem) => ({
        id: `xtream-series-${item.series_id}`,
        seriesId: item.series_id,
        name: item.name,
        cover: item.cover,
        category: categoryNameMap.get(String(item.category_id)) || 'TV Series',
        categoryId: String(item.category_id),
        rating: item.rating,
        releaseDate: item.releaseDate,
        plot: item.plot,
        cast: item.cast,
        director: item.director,
        genre: item.genre,
        sourceType: 'xtream',
      }));

      return {
        series,
        categories: categories.map((c) => ({ id: String(c.category_id), name: c.category_name })),
      };
    } catch (err) {
      console.error('[VodService] Failed to fetch Xtream series:', err);
      return { series: [], categories: [] };
    }
  }

  /**
   * Fetches detailed seasons and episode links for an Xtream series.
   */
  static async fetchXtreamSeriesDetails(
    playlist: PlaylistRecord,
    seriesId: number | string
  ): Promise<XtreamSeriesDetails | null> {
    if (!playlist.credentials) return null;
    try {
      return await XtreamClient.getSeriesDetails(playlist.credentials, seriesId);
    } catch (err) {
      console.error(`[VodService] Failed to fetch series details for ${seriesId}:`, err);
      return null;
    }
  }

  // --- "CONTINUE WATCHING" RESUME STATE PERSISTENCE ---

  /**
   * Saves playback position for an active stream.
   */
  static async savePosition(pos: PlaybackPosition): Promise<void> {
    try {
      const map = (await get<Record<string, PlaybackPosition>>(STORAGE_KEY_POSITIONS)) || {};
      map[pos.id] = pos;
      await set(STORAGE_KEY_POSITIONS, map);
    } catch (err) {
      console.warn('Failed to save playback position to IndexedDB:', err);
    }
  }

  /**
   * Retrieves saved resume position for a stream.
   */
  static async getPosition(id: string): Promise<PlaybackPosition | null> {
    try {
      const map = (await get<Record<string, PlaybackPosition>>(STORAGE_KEY_POSITIONS)) || {};
      return map[id] || null;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves all unfinished "Continue Watching" items, sorted newest first.
   */
  static async getContinueWatchingList(): Promise<PlaybackPosition[]> {
    try {
      const map = (await get<Record<string, PlaybackPosition>>(STORAGE_KEY_POSITIONS)) || {};
      const items = Object.values(map).filter(
        (p) => !p.isFinished && p.currentTime > 15 && p.percentage < 95
      );
      items.sort((a, b) => b.lastWatchedTimestamp - a.lastWatchedTimestamp);
      return items;
    } catch {
      return [];
    }
  }

  /**
   * Clears saved position (e.g. user manually marked as finished/cleared).
   */
  static async clearPosition(id: string): Promise<void> {
    try {
      const map = (await get<Record<string, PlaybackPosition>>(STORAGE_KEY_POSITIONS)) || {};
      delete map[id];
      await set(STORAGE_KEY_POSITIONS, map);
    } catch (err) {
      console.warn('Failed to clear playback position:', err);
    }
  }
}
