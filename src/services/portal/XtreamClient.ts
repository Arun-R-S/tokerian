// Xtream Codes API Client ported and adapted from IPTVnator
// Handles authentication, catalog querying (Live, VOD, Series), and URL construction.

export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
  outputFormat?: 'm3u8' | 'ts';
}

export interface XtreamAccountInfo {
  status: 'Active' | 'Banned' | 'Disabled' | 'Expired' | string;
  expDate: string | null;
  isTrial: boolean;
  activeConnections: number;
  maxConnections: number;
  serverTimezone?: string;
  message?: string;
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface XtreamLiveItem {
  num?: number;
  name: string;
  stream_type: 'live';
  stream_id: number;
  stream_icon?: string;
  epg_channel_id?: string;
  added?: string;
  category_id: string;
  custom_sid?: string;
  tv_archive?: number;
  direct_source?: string;
}

export interface XtreamVodItem {
  num?: number;
  name: string;
  stream_type: 'movie';
  stream_id: number;
  stream_icon?: string;
  rating?: string;
  rating_5based?: number;
  added?: string;
  category_id: string;
  container_extension: string;
  direct_source?: string;
}

export interface XtreamSeriesItem {
  num?: number;
  name: string;
  series_id: number;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  rating?: string;
  rating_5based?: number;
  category_id: string;
}

export interface XtreamEpisode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info?: {
    plot?: string;
    duration_secs?: number;
    duration?: string;
    movie_image?: string;
  };
}

export interface XtreamSeriesDetails {
  seasons: Array<{
    air_date?: string;
    episode_count?: number;
    id?: number;
    name?: string;
    overview?: string;
    season_number: number;
    cover?: string;
  }>;
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    rating: string;
  };
  episodes: Record<string, XtreamEpisode[]>;
}

export class XtreamClient {
  /**
   * Normalizes the server URL ensuring proper protocol and no trailing slash.
   */
  static normalizeServerUrl(url: string): string {
    let trimmed = url.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `http://${trimmed}`;
    }
    return trimmed.replace(/\/+$/, '');
  }

  /**
   * Builds the base API endpoint URL with credentials.
   */
  private static buildApiUrl(
    credentials: XtreamCredentials,
    action?: string,
    params: Record<string, string | number> = {}
  ): string {
    const base = this.normalizeServerUrl(credentials.serverUrl);
    const url = new URL(`${base}/player_api.php`);
    url.searchParams.set('username', credentials.username.trim());
    url.searchParams.set('password', credentials.password.trim());

    if (action) {
      url.searchParams.set('action', action);
    }

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  /**
   * Authenticates against the Xtream server and returns account & server status.
   */
  static async authenticate(
    credentials: XtreamCredentials
  ): Promise<{ ok: boolean; account?: XtreamAccountInfo; error?: string }> {
    try {
      const url = this.buildApiUrl(credentials);
      const res = await fetch(url);
      if (!res.ok) {
        return { ok: false, error: `Server responded with HTTP ${res.status}` };
      }

      const data = await res.json();
      if (!data || typeof data !== 'object') {
        return { ok: false, error: 'Invalid response from Xtream server' };
      }

      const userInfo = data.user_info;
      if (!userInfo || userInfo.auth === 0) {
        return {
          ok: false,
          error: userInfo?.message || 'Authentication failed: Invalid username or password',
        };
      }

      const serverInfo = data.server_info;
      const account: XtreamAccountInfo = {
        status: userInfo.status || 'Active',
        expDate: userInfo.exp_date ? new Date(Number(userInfo.exp_date) * 1000).toLocaleDateString() : null,
        isTrial: Boolean(Number(userInfo.is_trial)),
        activeConnections: Number(userInfo.active_cons || 0),
        maxConnections: Number(userInfo.max_connections || 1),
        serverTimezone: serverInfo?.timezone,
      };

      return { ok: true, account };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Network error connecting to Xtream server',
      };
    }
  }

  /**
   * Fetch live stream categories.
   */
  static async getLiveCategories(credentials: XtreamCredentials): Promise<XtreamCategory[]> {
    const url = this.buildApiUrl(credentials, 'get_live_categories');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Fetch live streams (optionally filtered by categoryId).
   */
  static async getLiveStreams(
    credentials: XtreamCredentials,
    categoryId?: string | number
  ): Promise<XtreamLiveItem[]> {
    const params: Record<string, string | number> = categoryId !== undefined ? { category_id: categoryId } : {};
    const url = this.buildApiUrl(credentials, 'get_live_streams', params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Fetch VOD (Movies) categories.
   */
  static async getVodCategories(credentials: XtreamCredentials): Promise<XtreamCategory[]> {
    const url = this.buildApiUrl(credentials, 'get_vod_categories');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Fetch VOD movie streams.
   */
  static async getVodStreams(
    credentials: XtreamCredentials,
    categoryId?: string | number
  ): Promise<XtreamVodItem[]> {
    const params: Record<string, string | number> = categoryId !== undefined ? { category_id: categoryId } : {};
    const url = this.buildApiUrl(credentials, 'get_vod_streams', params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Fetch TV Series categories.
   */
  static async getSeriesCategories(credentials: XtreamCredentials): Promise<XtreamCategory[]> {
    const url = this.buildApiUrl(credentials, 'get_series_categories');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Fetch TV Series list.
   */
  static async getSeries(
    credentials: XtreamCredentials,
    categoryId?: string | number
  ): Promise<XtreamSeriesItem[]> {
    const params: Record<string, string | number> = categoryId !== undefined ? { category_id: categoryId } : {};
    const url = this.buildApiUrl(credentials, 'get_series', params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Fetch detailed metadata and episodes for a TV Series.
   */
  static async getSeriesDetails(
    credentials: XtreamCredentials,
    seriesId: number | string
  ): Promise<XtreamSeriesDetails> {
    const url = this.buildApiUrl(credentials, 'get_series_info', { series_id: seriesId });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Construct playable Live Stream URL.
   * Format: {serverUrl}/live/{username}/{password}/{streamId}.{format}
   */
  static buildLiveStreamUrl(
    credentials: XtreamCredentials,
    streamId: number | string,
    format?: 'm3u8' | 'ts'
  ): string {
    const base = this.normalizeServerUrl(credentials.serverUrl);
    const ext = format || credentials.outputFormat || 'm3u8';
    return `${base}/live/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${streamId}.${ext}`;
  }

  /**
   * Construct playable VOD Movie Stream URL.
   * Format: {serverUrl}/movie/{username}/{password}/{streamId}.{container_extension}
   */
  static buildVodStreamUrl(
    credentials: XtreamCredentials,
    streamId: number | string,
    containerExtension: string = 'mp4'
  ): string {
    const base = this.normalizeServerUrl(credentials.serverUrl);
    return `${base}/movie/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${streamId}.${containerExtension}`;
  }

  /**
   * Construct playable TV Series Episode Stream URL.
   * Format: {serverUrl}/series/{username}/{password}/{episodeId}.{container_extension}
   */
  static buildSeriesStreamUrl(
    credentials: XtreamCredentials,
    episodeId: number | string,
    containerExtension: string = 'mp4'
  ): string {
    const base = this.normalizeServerUrl(credentials.serverUrl);
    return `${base}/series/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${episodeId}.${containerExtension}`;
  }
}
