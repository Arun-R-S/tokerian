// EPG Store ported and adapted
// Manages EPG data ingestion, live schedule matching, and periodic ticker for progress bars.

import { create } from 'zustand';
import { get } from 'idb-keyval';
import { EpgService, type EpgProgramItem, type LiveProgramInfo } from '../services/epg/EpgService';
import type { XtreamCredentials } from '../services/portal/XtreamClient';

interface EpgState {
  programsMap: Record<string, EpgProgramItem[]>;
  isLoading: boolean;
  activeEpgUrl: string | null;
  currentTimeMs: number;
  error: string | null;

  // Actions
  loadEpgUrl: (url: string, force?: boolean) => Promise<void>;
  loadXtreamEpg: (credentials: XtreamCredentials, streamId: number | string) => Promise<void>;
  getChannelPrograms: (tvgId?: string, channelName?: string) => EpgProgramItem[];
  getLiveProgramInfo: (tvgId?: string, channelName?: string) => LiveProgramInfo;
  updateCurrentTime: () => void;
}

export const useEpgStore = create<EpgState>((setStore, getStore) => ({
  programsMap: {},
  isLoading: false,
  activeEpgUrl: null,
  currentTimeMs: Date.now(),
  error: null,

  updateCurrentTime: () => {
    setStore({ currentTimeMs: Date.now() });
  },

  loadEpgUrl: async (url: string, force = false) => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setStore({ isLoading: true, activeEpgUrl: trimmed, error: null });

    try {
      // 1. Check local IndexedDB cache if not forced
      if (!force) {
        const cacheKey = `tokerian_epg_cache_${encodeURIComponent(trimmed)}`;
        const cached = await get<Record<string, EpgProgramItem[]>>(cacheKey);
        if (cached && Object.keys(cached).length > 0) {
          setStore({
            programsMap: cached,
            isLoading: false,
          });
          return;
        }
      }

      // 2. Fetch fresh XMLTV from remote
      const programsMap = await EpgService.fetchAndParseXmltv(trimmed);
      setStore({
        programsMap,
        isLoading: false,
      });
    } catch (err) {
      setStore({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load EPG guide',
      });
    }
  },

  loadXtreamEpg: async (credentials: XtreamCredentials, streamId: number | string) => {
    try {
      const programs = await EpgService.fetchXtreamShortEpg(credentials, streamId);
      if (programs.length > 0) {
        const key = String(streamId).toLowerCase();
        setStore((state) => ({
          programsMap: {
            ...state.programsMap,
            [key]: programs,
          },
        }));
      }
    } catch {}
  },

  getChannelPrograms: (tvgId?: string, channelName?: string): EpgProgramItem[] => {
    const { programsMap } = getStore();

    if (tvgId) {
      const match = programsMap[tvgId.toLowerCase()];
      if (match && match.length > 0) return match;
    }

    if (channelName) {
      const normalizedName = channelName.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [key, programs] of Object.entries(programsMap)) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedKey && (normalizedKey === normalizedName || normalizedName.includes(normalizedKey))) {
          return programs;
        }
      }
    }

    return [];
  },

  getLiveProgramInfo: (tvgId?: string, channelName?: string): LiveProgramInfo => {
    const programs = getStore().getChannelPrograms(tvgId, channelName);
    const now = getStore().currentTimeMs;
    return EpgService.resolveLiveProgram(programs, now);
  },
}));
