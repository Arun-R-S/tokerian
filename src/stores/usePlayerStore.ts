import { create } from 'zustand';
import type { Channel, AudioTrack, SubtitleTrack, QualityLevel } from '../core/domain/types';
import { playerAdapter } from '../adapters/player/HlsPlayerAdapter';
import { useSettingsStore } from './useSettingsStore';
import { useUserStore } from './useUserStore';
import { useChannelStore } from './useChannelStore';

interface PlayerState {
  currentChannel: Channel | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  isLive: boolean;
  volume: number;
  isMuted: boolean;
  error: string | null;

  audioTracks: AudioTrack[];
  selectedAudioTrack: number;

  subtitleTracks: SubtitleTrack[];
  selectedSubtitleTrack: number;

  qualityLevels: QualityLevel[];
  selectedQualityLevel: number;

  isPiP: boolean;
  isFullscreen: boolean;

  activeScope: 'all' | 'favorites';

  // Actions
  attachVideoElement: (video: HTMLVideoElement) => void;
  playChannel: (channel: Channel, forceMode?: 'direct' | 'proxy', scope?: 'all' | 'favorites') => Promise<void>;
  setPlaybackScope: (scope: 'all' | 'favorites') => void;
  togglePlay: () => Promise<void>;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  seek: (seconds: number) => void;
  selectAudioTrack: (id: number) => void;
  selectSubtitleTrack: (id: number) => void;
  selectQualityLevel: (id: number) => void;
  togglePiP: () => Promise<void>;
  toggleFullscreen: () => void;
  setIsFullscreen: (isFs: boolean) => void;
  zapNext: () => void;
  zapPrev: () => void;
  clearError: () => void;
  closePlayer: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Sync native browser fullscreen change events
  if (typeof document !== 'undefined') {
    const syncFs = () => {
      set({ isFullscreen: !!document.fullscreenElement });
    };
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
  }

  // Subscribe to low-level player adapter state changes
  playerAdapter.onStateChange((state) => {
    set({
      isPlaying: state.isPlaying,
      isBuffering: state.isBuffering,
      currentTime: state.currentTime,
      duration: state.duration,
      isLive: state.isLive,
      error: state.error,
    });
  });

  // Subscribe to audio/subtitle/quality updates
  playerAdapter.onTracksChange((tracks) => {
    set({
      audioTracks: tracks.audioTracks,
      selectedAudioTrack: tracks.selectedAudioTrack,
      subtitleTracks: tracks.subtitleTracks,
      selectedSubtitleTrack: tracks.selectedSubtitleTrack,
      qualityLevels: tracks.qualityLevels,
      selectedQualityLevel: tracks.selectedQualityLevel,
    });
  });

  let hasAttemptedFallback = false;
  let currentRoutingMode: 'direct' | 'proxy' = 'direct';

  // Self-healing automatic stream router
  playerAdapter.setFallbackHandler((_failedUrl, _is403) => {
    const { currentChannel } = get();
    if (!currentChannel || hasAttemptedFallback) {
      return false;
    }

    hasAttemptedFallback = true;
    const nextMode = currentRoutingMode === 'direct' ? 'proxy' : 'direct';
    console.info(`Self-healing stream: Retrying "${currentChannel.name}" via ${nextMode} mode...`);

    get().playChannel(currentChannel, nextMode);
    return true;
  });

  return {
    currentChannel: null,
    isPlaying: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
    isLive: true,
    volume: 1,
    isMuted: false,
    error: null,

    audioTracks: [],
    selectedAudioTrack: -1,

    subtitleTracks: [],
    selectedSubtitleTrack: -1,

    qualityLevels: [],
    selectedQualityLevel: -1,

    isPiP: false,
    isFullscreen: false,
    activeScope: 'all',

    attachVideoElement: (video: HTMLVideoElement) => {
      playerAdapter.attachMedia(video);
    },

    setPlaybackScope: (scope: 'all' | 'favorites') => {
      set({ activeScope: scope });
    },

    playChannel: async (channel: Channel, forceMode?: 'direct' | 'proxy', scope?: 'all' | 'favorites') => {
      if (!forceMode) {
        hasAttemptedFallback = false;
        currentRoutingMode = useSettingsStore.getState().corsProxyEnabled ? 'proxy' : 'direct';
      } else {
        currentRoutingMode = forceMode;
      }

      set({
        currentChannel: channel,
        error: null,
        isBuffering: true,
        activeScope: scope || get().activeScope,
      });

      // Record in watch history
      useUserStore.getState().addToHistory(channel);

      // Resolve stream URL (supports direct or proxy routing)
      const resolvedUrl = useSettingsStore.getState().resolveStreamUrl(channel.url, currentRoutingMode);

      try {
        await playerAdapter.loadStream(resolvedUrl);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to connect to live feed';
        set({ error: msg, isBuffering: false });
      }
    },

    togglePlay: async () => {
      await playerAdapter.togglePlay();
    },

    setVolume: (volume: number) => {
      set({ volume, isMuted: volume === 0 });
      playerAdapter.setVolume(volume);
    },

    toggleMute: () => {
      const { isMuted, volume } = get();
      const nextMuted = !isMuted;
      set({ isMuted: nextMuted });
      playerAdapter.setVolume(nextMuted ? 0 : (volume || 1));
    },

    seek: (seconds: number) => {
      playerAdapter.seek(seconds);
    },

    selectAudioTrack: (id: number) => {
      playerAdapter.setAudioTrack(id);
      set({ selectedAudioTrack: id });
    },

    selectSubtitleTrack: (id: number) => {
      playerAdapter.setSubtitleTrack(id);
      set({ selectedSubtitleTrack: id });
    },

    selectQualityLevel: (id: number) => {
      playerAdapter.setQualityLevel(id);
      set({ selectedQualityLevel: id });
    },

    togglePiP: async () => {
      const active = await playerAdapter.togglePictureInPicture();
      set({ isPiP: active });
    },

    toggleFullscreen: () => {
      const isCurrentlyFs = !!document.fullscreenElement;
      if (!isCurrentlyFs) {
        const playerEl = document.querySelector('.video-player-container');
        if (playerEl && playerEl.requestFullscreen) {
          playerEl.requestFullscreen().catch(() => {
            document.documentElement.requestFullscreen?.().catch(console.warn);
          });
        } else {
          document.documentElement.requestFullscreen?.().catch(console.warn);
        }
        set({ isFullscreen: true });
      } else {
        document.exitFullscreen?.().catch(console.warn);
        set({ isFullscreen: false });
      }
    },

    setIsFullscreen: (isFs: boolean) => {
      set({ isFullscreen: isFs });
    },

    zapNext: () => {
      const { currentChannel, activeScope } = get();

      let targetList: Channel[] = [];
      if (activeScope === 'favorites') {
        const { orderedFavoriteIds } = useUserStore.getState();
        const all = useChannelStore.getState().channels;
        const channelMap = new Map<string, Channel>();
        for (const c of all) channelMap.set(c.id, c);
        targetList = orderedFavoriteIds
          .map((id) => channelMap.get(id))
          .filter((c): c is Channel => !!c);
      } else {
        targetList = useChannelStore.getState().getFilteredChannels();
      }

      if (targetList.length === 0) return;

      if (!currentChannel) {
        get().playChannel(targetList[0]);
        return;
      }

      const currentIndex = targetList.findIndex((c) => c.id === currentChannel.id);
      const nextIndex = (currentIndex + 1) % targetList.length;
      get().playChannel(targetList[nextIndex]);
    },

    zapPrev: () => {
      const { currentChannel, activeScope } = get();

      let targetList: Channel[] = [];
      if (activeScope === 'favorites') {
        const { orderedFavoriteIds } = useUserStore.getState();
        const all = useChannelStore.getState().channels;
        const channelMap = new Map<string, Channel>();
        for (const c of all) channelMap.set(c.id, c);
        targetList = orderedFavoriteIds
          .map((id) => channelMap.get(id))
          .filter((c): c is Channel => !!c);
      } else {
        targetList = useChannelStore.getState().getFilteredChannels();
      }

      if (targetList.length === 0) return;

      if (!currentChannel) {
        get().playChannel(targetList[0]);
        return;
      }

      const currentIndex = targetList.findIndex((c) => c.id === currentChannel.id);
      const prevIndex = (currentIndex - 1 + targetList.length) % targetList.length;
      get().playChannel(targetList[prevIndex]);
    },

    clearError: () => {
      set({ error: null });
    },

    closePlayer: () => {
      playerAdapter.detachMedia();
      set({ currentChannel: null, isPlaying: false, isBuffering: false, error: null });
    },
  };
});
