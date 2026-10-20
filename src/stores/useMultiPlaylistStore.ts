// Multi-Playlist Store ported and adapted from m3u-state & portal
// Manages multiple playlists, local M3U files, Xtream accounts, and active source switching with IndexedDB.

import { create } from 'zustand';
import { get, set, del } from 'idb-keyval';
import type { Channel } from '../core/domain/types';
import { useChannelStore } from './useChannelStore';
import { XtreamClient, type XtreamCredentials, type XtreamAccountInfo } from '../services/portal/XtreamClient';

export type PlaylistSourceType = 'built-in' | 'm3u-url' | 'm3u-file' | 'xtream';

export interface PlaylistRecord {
  id: string;
  title: string;
  type: PlaylistSourceType;
  count: number;
  createdAt: number;
  url?: string;
  filename?: string;
  credentials?: XtreamCredentials;
  accountInfo?: XtreamAccountInfo;
  epgUrls?: string[];
  vodCount?: number;
  seriesCount?: number;
}

const STORAGE_KEY_PLAYLISTS = 'tokerian_playlists_meta';
const STORAGE_PREFIX_DATA = 'tokerian_playlist_channels_';

const BUILT_IN_PLAYLIST: PlaylistRecord = {
  id: 'built-in',
  title: 'Tokerian Global Catalog (30,000+)',
  type: 'built-in',
  count: 30000,
  createdAt: 0,
  url: 'https://iptv-org.github.io/iptv/index.m3u',
};

interface MultiPlaylistState {
  playlists: PlaylistRecord[];
  activePlaylistId: string;
  isSwitching: boolean;
  initialized: boolean;

  // Actions
  initPlaylists: () => Promise<void>;
  selectPlaylist: (id: string) => Promise<void>;
  addM3uUrlPlaylist: (title: string, url: string, channels: Channel[], epgUrls?: string[]) => Promise<void>;
  addM3uFilePlaylist: (title: string, filename: string, channels: Channel[], epgUrls?: string[]) => Promise<void>;
  addXtreamPlaylist: (
    title: string,
    credentials: XtreamCredentials,
    accountInfo: XtreamAccountInfo | undefined,
    channels: Channel[],
    vodCount?: number,
    seriesCount?: number
  ) => Promise<void>;
  removePlaylist: (id: string) => Promise<void>;
  renamePlaylist: (id: string, newTitle: string) => Promise<void>;
}

export const useMultiPlaylistStore = create<MultiPlaylistState>((setStore, getStore) => ({
  playlists: [BUILT_IN_PLAYLIST],
  activePlaylistId: 'built-in',
  isSwitching: false,
  initialized: false,

  initPlaylists: async () => {
    try {
      const saved = await get<PlaylistRecord[]>(STORAGE_KEY_PLAYLISTS);
      const activeId = await get<string>('tokerian_active_playlist_id') || 'built-in';

      const playlists = saved && Array.isArray(saved) ? [BUILT_IN_PLAYLIST, ...saved] : [BUILT_IN_PLAYLIST];
      setStore({ playlists, activePlaylistId: activeId, initialized: true });

      // If active playlist is a custom one, load its channels into useChannelStore
      if (activeId !== 'built-in') {
        await getStore().selectPlaylist(activeId);
      }
    } catch (err) {
      console.warn('Failed to initialize playlists storage:', err);
      setStore({ initialized: true });
    }
  },

  selectPlaylist: async (id: string) => {
    const { playlists } = getStore();
    const target = playlists.find((p) => p.id === id);
    if (!target) return;

    setStore({ isSwitching: true, activePlaylistId: id });
    await set('tokerian_active_playlist_id', id);

    try {
      if (target.type === 'built-in') {
        // Load default iptv-org directory
        await useChannelStore.getState().loadPlaylist(target.url || 'https://iptv-org.github.io/iptv/index.m3u');
      } else {
        // Load custom channels from IndexedDB
        const channels = await get<Channel[]>(`${STORAGE_PREFIX_DATA}${id}`);
        if (channels && channels.length > 0) {
          useChannelStore.getState().setLoadedChannels(channels, target.title);
        } else if (target.type === 'xtream' && target.credentials) {
          // Re-fetch live channels from Xtream server
          const liveItems = await XtreamClient.getLiveStreams(target.credentials);
          const freshChannels: Channel[] = liveItems.map((item, idx) => ({
            id: `xtream-${item.stream_id}-${idx}`,
            name: item.name || `Live Stream ${item.stream_id}`,
            logo: item.stream_icon || '',
            url: XtreamClient.buildLiveStreamUrl(target.credentials!, item.stream_id),
            group: item.category_id || 'Live Streams',
            tvgId: item.epg_channel_id || undefined,
          }));

          await set(`${STORAGE_PREFIX_DATA}${id}`, freshChannels);
          useChannelStore.getState().setLoadedChannels(freshChannels, target.title);
        } else if (target.url) {
          // Re-fetch M3U from URL
          await useChannelStore.getState().loadPlaylist(target.url, true);
        }
      }
    } catch (err) {
      console.error('Failed to switch playlist:', err);
    } finally {
      setStore({ isSwitching: false });
    }
  },

  addM3uUrlPlaylist: async (title: string, url: string, channels: Channel[], epgUrls = []) => {
    const id = `m3u-${Date.now()}`;
    const newRecord: PlaylistRecord = {
      id,
      title: title.trim() || 'Custom M3U Playlist',
      type: 'm3u-url',
      url,
      count: channels.length,
      createdAt: Date.now(),
      epgUrls,
    };

    // Save channels to dedicated IndexedDB key
    await set(`${STORAGE_PREFIX_DATA}${id}`, channels);

    // Save metadata
    const currentCustom = getStore().playlists.filter((p) => p.id !== 'built-in');
    const updatedCustom = [...currentCustom, newRecord];
    await set(STORAGE_KEY_PLAYLISTS, updatedCustom);

    setStore({
      playlists: [BUILT_IN_PLAYLIST, ...updatedCustom],
      activePlaylistId: id,
    });

    useChannelStore.getState().setLoadedChannels(channels, newRecord.title);
    await set('tokerian_active_playlist_id', id);
  },

  addM3uFilePlaylist: async (title: string, filename: string, channels: Channel[], epgUrls = []) => {
    const id = `file-${Date.now()}`;
    const newRecord: PlaylistRecord = {
      id,
      title: title.trim() || filename || 'Uploaded M3U',
      type: 'm3u-file',
      filename,
      count: channels.length,
      createdAt: Date.now(),
      epgUrls,
    };

    await set(`${STORAGE_PREFIX_DATA}${id}`, channels);

    const currentCustom = getStore().playlists.filter((p) => p.id !== 'built-in');
    const updatedCustom = [...currentCustom, newRecord];
    await set(STORAGE_KEY_PLAYLISTS, updatedCustom);

    setStore({
      playlists: [BUILT_IN_PLAYLIST, ...updatedCustom],
      activePlaylistId: id,
    });

    useChannelStore.getState().setLoadedChannels(channels, newRecord.title);
    await set('tokerian_active_playlist_id', id);
  },

  addXtreamPlaylist: async (
    title: string,
    credentials: XtreamCredentials,
    accountInfo: XtreamAccountInfo | undefined,
    channels: Channel[],
    vodCount = 0,
    seriesCount = 0
  ) => {
    const id = `xtream-${Date.now()}`;
    const newRecord: PlaylistRecord = {
      id,
      title: title.trim() || 'Xtream IPTV',
      type: 'xtream',
      credentials,
      accountInfo,
      count: channels.length,
      createdAt: Date.now(),
      vodCount,
      seriesCount,
    };

    await set(`${STORAGE_PREFIX_DATA}${id}`, channels);

    const currentCustom = getStore().playlists.filter((p) => p.id !== 'built-in');
    const updatedCustom = [...currentCustom, newRecord];
    await set(STORAGE_KEY_PLAYLISTS, updatedCustom);

    setStore({
      playlists: [BUILT_IN_PLAYLIST, ...updatedCustom],
      activePlaylistId: id,
    });

    useChannelStore.getState().setLoadedChannels(channels, newRecord.title);
    await set('tokerian_active_playlist_id', id);
  },

  removePlaylist: async (id: string) => {
    if (id === 'built-in') return; // Cannot delete built-in playlist

    // Remove channels data
    await del(`${STORAGE_PREFIX_DATA}${id}`);

    const currentCustom = getStore().playlists.filter((p) => p.id !== 'built-in' && p.id !== id);
    await set(STORAGE_KEY_PLAYLISTS, currentCustom);

    const { activePlaylistId } = getStore();
    const updatedPlaylists = [BUILT_IN_PLAYLIST, ...currentCustom];

    setStore({ playlists: updatedPlaylists });

    // If removed playlist was active, switch to built-in
    if (activePlaylistId === id) {
      await getStore().selectPlaylist('built-in');
    }
  },

  renamePlaylist: async (id: string, newTitle: string) => {
    if (id === 'built-in') return;
    const currentCustom = getStore().playlists.filter((p) => p.id !== 'built-in');
    const target = currentCustom.find((p) => p.id === id);
    if (!target) return;

    target.title = newTitle.trim() || target.title;
    await set(STORAGE_KEY_PLAYLISTS, currentCustom);

    setStore({ playlists: [BUILT_IN_PLAYLIST, ...currentCustom] });
  },
}));
