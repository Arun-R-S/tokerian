// M3U Playlist Importer ported and adapted from IPTVnator
// Supports local file upload (.m3u, .m3u8), remote URL download, and raw text pasting.

import parser from 'iptv-playlist-parser';
import type { Channel } from '../../core/domain/types';

export interface ParsedPlaylistResult {
  title: string;
  channels: Channel[];
  epgUrls: string[];
  rawCount: number;
}

export class M3UImporter {
  /**
   * Cleans filename or URL into a displayable playlist title.
   */
  static cleanTitle(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return 'Untitled Playlist';
    const base = trimmed.split(/[\\/]/).pop() || trimmed;
    return base.replace(/\.(m3u8?|pls|txt)$/i, '') || base;
  }

  /**
   * Parses raw M3U text content into structured Tokerian Channel objects.
   */
  static parseRaw(content: string, defaultTitle: string = 'Custom Playlist'): ParsedPlaylistResult {
    if (!content || !content.trim()) {
      throw new Error('Playlist content is empty');
    }

    const parsed = parser.parse(content);
    const epgUrls: string[] = [];

    // Extract EPG URLs from header attributes
    const attrs = parsed.header?.attrs as Record<string, string> | undefined;
    const headerTvg = attrs?.['x-tvg-url'] || attrs?.['url-tvg'];
    if (headerTvg) {
      const urls = headerTvg.split(',').map((u: string) => u.trim()).filter(Boolean);
      epgUrls.push(...urls);
    }

    const channels: Channel[] = [];
    let idx = 0;

    for (const item of parsed.items) {
      if (!item.url) continue;

      const id = item.tvg?.id || `m3u-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      const name = item.name?.trim() || item.tvg?.name?.trim() || `Channel ${idx + 1}`;
      const group = item.group?.title?.trim() || 'General';
      const logo = item.tvg?.logo?.trim() || '';

      channels.push({
        id: `${id}-${idx}`,
        name,
        logo,
        url: item.url,
        group,
        tvgId: item.tvg?.id || undefined,
        tvgName: item.tvg?.name || undefined,
        httpReferrer: item.http?.referrer || undefined,
        userAgent: item.http?.['user-agent'] || undefined,
      });

      idx++;
    }

    return {
      title: defaultTitle,
      channels,
      epgUrls,
      rawCount: channels.length,
    };
  }

  /**
   * Imports an M3U from an uploaded File (drag-and-drop or file picker).
   */
  static async importFromFile(file: File): Promise<ParsedPlaylistResult> {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.m3u') && !lower.endsWith('.m3u8') && !lower.endsWith('.txt')) {
      throw new Error('Unsupported file extension. Please select a .m3u or .m3u8 file.');
    }

    const text = await file.text();
    const title = this.cleanTitle(file.name);
    return this.parseRaw(text, title);
  }

  /**
   * Imports an M3U from a remote URL, with automatic CORS proxy fallback.
   */
  static async importFromUrl(url: string): Promise<ParsedPlaylistResult> {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      throw new Error('Please enter a valid URL');
    }

    let text = '';
    try {
      const res = await fetch(trimmedUrl);
      if (res.ok) {
        text = await res.text();
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      // Fallback via our local Vite / Electron proxy
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(trimmedUrl)}`;
      const proxyRes = await fetch(proxyUrl);
      if (!proxyRes.ok) {
        throw new Error(`Failed to load playlist: HTTP ${proxyRes.status}`);
      }
      text = await proxyRes.text();
    }

    const title = this.cleanTitle(trimmedUrl);
    return this.parseRaw(text, title);
  }
}
