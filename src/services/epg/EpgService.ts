// Electronic Program Guide (EPG) Service ported and adapted from IPTVnator
// Parses XMLTV (.xml, .xml.gz) data, normalizes timestamps, caches in IndexedDB,
// and resolves "Now Playing" and "Next Up" schedules with real-time progress.

import epgParser from 'epg-parser';
import { set } from 'idb-keyval';
import type { XtreamCredentials } from '../portal/XtreamClient';

export interface EpgProgramItem {
  channel: string;
  title: string;
  desc: string | null;
  category: string | null;
  start: string; // ISO
  stop: string;  // ISO
  startTimestamp: number;
  stopTimestamp: number;
  iconUrl?: string | null;
}

export interface LiveProgramInfo {
  current: EpgProgramItem | null;
  next: EpgProgramItem | null;
  progressPct: number;
  remainingMinutes: number;
}

const STORAGE_KEY_EPG_PROGRAMS = 'tokerian_epg_cache_';
const STORAGE_KEY_EPG_META = 'tokerian_epg_meta';

export class EpgService {
  /**
   * Parses standard XMLTV date string: "YYYYMMDDHHMMSS +ZZZZ" or "YYYYMMDDHHMMSS"
   */
  static parseXmltvDate(dateStr: string): number | null {
    if (!dateStr || typeof dateStr !== 'string') return null;

    const trimmed = dateStr.trim();
    const match = trimmed.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-]\d{4}|Z))?/);
    if (!match) {
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? null : d.getTime();
    }

    const [, year, month, day, hour, min, sec, tz] = match;
    let iso = `${year}-${month}-${day}T${hour}:${min}:${sec}`;
    if (tz) {
      if (tz === 'Z') {
        iso += 'Z';
      } else {
        iso += `${tz.substring(0, 3)}:${tz.substring(3)}`;
      }
    } else {
      iso += 'Z';
    }

    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  /**
   * Normalizes raw epg-parser output into structured EpgProgramItem records.
   */
  static normalizeRawPrograms(rawPrograms: any[]): Record<string, EpgProgramItem[]> {
    const map: Record<string, EpgProgramItem[]> = {};

    for (const raw of rawPrograms) {
      if (!raw || !raw.channel) continue;

      const channelId = String(raw.channel).trim().toLowerCase();
      const startMs = this.parseXmltvDate(raw.start);
      const stopMs = this.parseXmltvDate(raw.stop);

      if (!startMs || !stopMs || stopMs <= startMs) continue;

      // Extract title string (handling epg-parser language arrays)
      let title = 'No title';
      if (typeof raw.title === 'string') {
        title = raw.title;
      } else if (Array.isArray(raw.title) && raw.title[0]?.value) {
        title = raw.title[0].value;
      } else if (raw.title && typeof raw.title === 'object' && raw.title.value) {
        title = raw.title.value;
      }

      // Extract description
      let desc: string | null = null;
      if (typeof raw.desc === 'string') {
        desc = raw.desc;
      } else if (Array.isArray(raw.desc) && raw.desc[0]?.value) {
        desc = raw.desc[0].value;
      }

      // Extract category
      let category: string | null = null;
      if (typeof raw.category === 'string') {
        category = raw.category;
      } else if (Array.isArray(raw.category) && raw.category[0]?.value) {
        category = raw.category[0].value;
      }

      const item: EpgProgramItem = {
        channel: channelId,
        title,
        desc,
        category,
        start: new Date(startMs).toISOString(),
        stop: new Date(stopMs).toISOString(),
        startTimestamp: startMs,
        stopTimestamp: stopMs,
        iconUrl: raw.icon?.[0]?.src || null,
      };

      if (!map[channelId]) {
        map[channelId] = [];
      }
      map[channelId].push(item);
    }

    // Sort each channel's programs chronologically
    for (const chId in map) {
      map[chId].sort((a, b) => a.startTimestamp - b.startTimestamp);
    }

    return map;
  }

  /**
   * Fetches XMLTV data from a URL (with CORS proxy fallback), parses it, and returns normalized map.
   */
  static async fetchAndParseXmltv(url: string): Promise<Record<string, EpgProgramItem[]>> {
    const trimmed = url.trim();
    if (!trimmed) throw new Error('EPG URL is empty');

    let xmlText = '';
    try {
      const res = await fetch(trimmed);
      if (res.ok) {
        xmlText = await res.text();
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      // Fallback via CORS proxy
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(trimmed)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} from proxy`);
      xmlText = await res.text();
    }

    if (!xmlText || !xmlText.includes('<tv')) {
      throw new Error('Invalid XMLTV document: missing <tv> root tag');
    }

    const parsed = epgParser.parse(xmlText);
    const programsMap = this.normalizeRawPrograms(parsed.programs || []);

    // Cache in IndexedDB
    try {
      const cacheKey = `${STORAGE_KEY_EPG_PROGRAMS}${encodeURIComponent(trimmed)}`;
      await set(cacheKey, programsMap);
      await set(STORAGE_KEY_EPG_META, { lastUpdated: Date.now(), sourceUrl: trimmed });
    } catch (err) {
      console.warn('Failed to cache EPG in IndexedDB:', err);
    }

    return programsMap;
  }

  /**
   * Fetches short EPG for a live channel directly from Xtream Codes server.
   */
  static async fetchXtreamShortEpg(
    credentials: XtreamCredentials,
    streamId: number | string
  ): Promise<EpgProgramItem[]> {
    const base = credentials.serverUrl.replace(/\/+$/, '');
    const url = new URL(`${base}/player_api.php`);
    url.searchParams.set('username', credentials.username);
    url.searchParams.set('password', credentials.password);
    url.searchParams.set('action', 'get_short_epg');
    url.searchParams.set('stream_id', String(streamId));
    url.searchParams.set('limit', '6');

    try {
      const res = await fetch(url.toString());
      if (!res.ok) return [];

      const data = await res.json();
      const listings = data?.epg_listings;
      if (!Array.isArray(listings)) return [];

      const programs: EpgProgramItem[] = [];
      for (const item of listings) {
        // Xtream gives timestamps or formatted strings
        let startMs = item.start_timestamp ? Number(item.start_timestamp) * 1000 : this.parseXmltvDate(item.start);
        let stopMs = item.stop_timestamp ? Number(item.stop_timestamp) * 1000 : this.parseXmltvDate(item.end || item.stop);

        if (!startMs || !stopMs) continue;

        programs.push({
          channel: String(streamId),
          title: atob(item.title || '') || item.title || 'Broadcast Event',
          desc: item.description ? (atob(item.description) || item.description) : null,
          category: null,
          start: new Date(startMs).toISOString(),
          stop: new Date(stopMs).toISOString(),
          startTimestamp: startMs,
          stopTimestamp: stopMs,
        });
      }

      programs.sort((a, b) => a.startTimestamp - b.startTimestamp);
      return programs;
    } catch {
      return [];
    }
  }

  /**
   * Resolves the "Now Playing" and "Next Up" program from a list of programs.
   */
  static resolveLiveProgram(
    programs: EpgProgramItem[] | undefined,
    now: number = Date.now()
  ): LiveProgramInfo {
    if (!programs || programs.length === 0) {
      return {
        current: null,
        next: null,
        progressPct: 0,
        remainingMinutes: 0,
      };
    }

    let current: EpgProgramItem | null = null;
    let next: EpgProgramItem | null = null;

    for (let i = 0; i < programs.length; i++) {
      const p = programs[i];
      if (now >= p.startTimestamp && now < p.stopTimestamp) {
        current = p;
        next = programs[i + 1] || null;
        break;
      } else if (p.startTimestamp > now) {
        // Future program (show hasn't started yet or gap in schedule)
        if (!next) {
          next = p;
        }
        break;
      }
    }

    let progressPct = 0;
    let remainingMinutes = 0;

    if (current) {
      const totalDuration = current.stopTimestamp - current.startTimestamp;
      const elapsed = now - current.startTimestamp;
      progressPct = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
      remainingMinutes = Math.max(0, Math.round((current.stopTimestamp - now) / 60000));
    }

    return {
      current,
      next,
      progressPct,
      remainingMinutes,
    };
  }
}
