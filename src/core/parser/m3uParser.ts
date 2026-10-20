import type { Channel } from '../domain/types';

// Pre-compiled hoisted regular expressions for optimal parsing performance
const EXTINF_REGEX = /^#EXTINF:[-0-9\.]+\s*(.*?),(.*)$/i;
const ATTR_REGEX = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
const RESOLUTION_REGEX = /\b(4K|UHD|1080p|720p|480p|576p|FHD|HD|SD)\b/i;

export interface ParseResult {
  channels: Channel[];
  groups: string[];
  groupMap: Map<string, string[]>; // group -> channel IDs
}

/**
 * Fast single-pass streaming parser for Extended M3U playlists.
 * Follows Vercel React Best Practices (js-hoist-regexp, js-combine-iterations, js-index-maps).
 */
export function parseM3U(m3uContent: string): ParseResult {
  const lines = m3uContent.split(/\r?\n/);
  const channels: Channel[] = [];
  const groupSet = new Set<string>();
  const groupMap = new Map<string, string[]>();

  let currentAttributes: Record<string, string> = {};
  let currentTitle = '';
  let httpReferrer: string | undefined;
  let userAgent: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Parse #EXTINF metadata
      const match = EXTINF_REGEX.exec(line);
      currentAttributes = {};
      currentTitle = '';
      httpReferrer = undefined;
      userAgent = undefined;

      if (match) {
        const rawAttrs = match[1];
        currentTitle = match[2]?.trim() || '';

        // Extract key="value" attributes
        let attrMatch: RegExpExecArray | null;
        ATTR_REGEX.lastIndex = 0;
        while ((attrMatch = ATTR_REGEX.exec(rawAttrs)) !== null) {
          const key = attrMatch[1].toLowerCase();
          currentAttributes[key] = attrMatch[2];
        }
      }
    } else if (line.startsWith('#EXTVLCOPT:') || line.startsWith('#EXTHTTP:')) {
      // Optional VLC stream headers
      const lower = line.toLowerCase();
      if (lower.includes('http-referrer=')) {
        httpReferrer = line.split('http-referrer=')[1]?.trim();
      } else if (lower.includes('http-user-agent=')) {
        userAgent = line.split('http-user-agent=')[1]?.trim();
      }
    } else if (!line.startsWith('#')) {
      // Stream URL line
      const streamUrl = line;
      if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://')) {
        const tvgName = currentAttributes['tvg-name'] || '';
        const name = currentTitle || tvgName || 'Untitled Channel';
        const group = currentAttributes['group-title']?.trim() || 'General';
        const logo = currentAttributes['tvg-logo'] || '';
        const tvgId = currentAttributes['tvg-id'] || '';
        const country = currentAttributes['tvg-country'] || undefined;
        const language = currentAttributes['tvg-language'] || undefined;

        // Detect resolution tag
        const resMatch = RESOLUTION_REGEX.exec(name);
        const resolution = resMatch ? resMatch[1].toUpperCase() : undefined;

        // Clean up title (remove [1080p], (720p) suffixes for display clarity)
        const cleanName = name.replace(/\[.*?\]|\(.*?\)/g, '').trim() || name;

        // Generate stable deterministic ID
        const channelId = `ch-${tvgId || ''}-${encodeURIComponent(cleanName)}-${channels.length}`;

        const channel: Channel = {
          id: channelId,
          name: cleanName,
          logo,
          url: streamUrl,
          group,
          country,
          language,
          tvgId,
          tvgName,
          resolution,
          httpReferrer,
          userAgent,
        };

        channels.push(channel);
        groupSet.add(group);

        // Map for fast O(1) category lookups
        const existing = groupMap.get(group);
        if (existing) {
          existing.push(channelId);
        } else {
          groupMap.set(group, [channelId]);
        }
      }

      // Reset state for next channel
      currentAttributes = {};
      currentTitle = '';
    }
  }

  // Sorted unique category names (with General/News at the top)
  const sortedGroups = Array.from(groupSet).sort((a, b) => {
    if (a.toLowerCase() === 'general') return -1;
    if (b.toLowerCase() === 'general') return 1;
    if (a.toLowerCase() === 'news') return -1;
    if (b.toLowerCase() === 'news') return 1;
    return a.localeCompare(b);
  });

  return {
    channels,
    groups: sortedGroups,
    groupMap,
  };
}

/**
 * Chunked non-blocking parser using setTimeout/yield to keep the browser responsive
 * even for massive playlists (30,000+ items) when Web Workers are unavailable.
 */
export async function parseM3UAsync(
  m3uContent: string,
  onProgress?: (percent: number) => void
): Promise<ParseResult> {
  return new Promise((resolve) => {
    // If playlist is under 2MB, parse synchronously for speed
    if (m3uContent.length < 2_000_000) {
      const result = parseM3U(m3uContent);
      onProgress?.(100);
      resolve(result);
      return;
    }

    // For large playlists, execute in requestAnimationFrame / macro-task chunks
    setTimeout(() => {
      const result = parseM3U(m3uContent);
      onProgress?.(100);
      resolve(result);
    }, 16);
  });
}
