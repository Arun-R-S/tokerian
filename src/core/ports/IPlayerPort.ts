import type { AudioTrack, SubtitleTrack, QualityLevel } from '../domain/types';

export type PlayerStateCallback = (state: {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  isLive: boolean;
  error: string | null;
}) => void;

export type TracksCallback = (tracks: {
  audioTracks: AudioTrack[];
  selectedAudioTrack: number;
  subtitleTracks: SubtitleTrack[];
  selectedSubtitleTrack: number;
  qualityLevels: QualityLevel[];
  selectedQualityLevel: number;
}) => void;

export interface IPlayerPort {
  attachMedia(element: HTMLVideoElement): void;
  detachMedia(): void;
  loadStream(url: string, headers?: Record<string, string>): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  togglePlay(): Promise<void>;
  seek(timeSeconds: number): void;
  setVolume(volume: number): void;
  toggleMute(): void;
  
  // Track Management
  getAudioTracks(): AudioTrack[];
  setAudioTrack(trackId: number): void;
  getSubtitleTracks(): SubtitleTrack[];
  setSubtitleTrack(trackId: number): void;
  getQualityLevels(): QualityLevel[];
  setQualityLevel(levelId: number): void;

  // Screen & Viewport Modes
  togglePictureInPicture(): Promise<boolean>;
  isPictureInPictureSupported(): boolean;

  // Listeners
  onStateChange(callback: PlayerStateCallback): () => void;
  onTracksChange(callback: TracksCallback): () => void;
  destroy(): void;
}
