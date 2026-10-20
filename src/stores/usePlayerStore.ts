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

  // Actions
  attachVideoElement: (video: HTMLVideoElement) => void;
  playChannel: (channel: Channel) => Promise<void>;
  togglePlay: () => Promise<void>;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  seek: (seconds: number) => void;
  selectAudioTrack: (id: number) => void;
  selectSubtitleTrack: (id: number) => void;
  selectQualityLevel: (id: number) => void;
  togglePiP: () => Promise<void>;
  toggleFullscreen: () => void;
  zapNext: () => void;
  zapPrev: () => void;
  clearError: () => void;
  closePlayer: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
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

    attachVideoElement: (video: HTMLVideoElement) => {
      playerAdapter.attachMedia(video);
    },

    playChannel: async (channel: Channel) => {
      set({ currentChannel: channel, error: null, isBuffering: true });

      // Record in watch history
      useUserStore.getState().addToHistory(channel);

      // Resolve stream URL (with proxy if needed on Web)
      const resolvedUrl = useSettingsStore.getState().resolveStreamUrl(channel.url);

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
        document.documentElement.requestFullscreen?.().catch(console.warn);
        set({ isFullscreen: true });
      } else {
        document.exitFullscreen?.().catch(console.warn);
        set({ isFullscreen: false });
      }
    },

    zapNext: () => {
      const { currentChannel } = get();
      const filtered = useChannelStore.getState().getFilteredChannels();
      if (filtered.length === 0) return;

      if (!currentChannel) {
        get().playChannel(filtered[0]);
        return;
      }

      const currentIndex = filtered.findIndex((c) => c.id === currentChannel.id);
      const nextIndex = (currentIndex + 1) % filtered.length;
      get().playChannel(filtered[nextIndex]);
    },

    zapPrev: () => {
      const { currentChannel } = get();
      const filtered = useChannelStore.getState().getFilteredChannels();
      if (filtered.length === 0) return;

      if (!currentChannel) {
        get().playChannel(filtered[0]);
        return;
      }

      const currentIndex = filtered.findIndex((c) => c.id === currentChannel.id);
      const prevIndex = (currentIndex - 1 + filtered.length) % filtered.length;
      get().playChannel(filtered[prevIndex]);
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
