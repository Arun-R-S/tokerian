import Hls from 'hls.js';
import type {
  IPlayerPort,
  PlayerStateCallback,
  TracksCallback,
} from '../../core/ports/IPlayerPort';
import type { AudioTrack, SubtitleTrack, QualityLevel } from '../../core/domain/types';

export class HlsPlayerAdapter implements IPlayerPort {
  private hls: Hls | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private stateListeners: Set<PlayerStateCallback> = new Set();
  private tracksListeners: Set<TracksCallback> = new Set();

  private isPlaying = false;
  private isBuffering = false;
  private error: string | null = null;
  private currentUrl: string | null = null;
  private pendingStreamUrl: string | null = null;
  private fallbackHandler: ((url: string, is403: boolean) => boolean) | null = null;

  setFallbackHandler(handler: ((url: string, is403: boolean) => boolean) | null): void {
    this.fallbackHandler = handler;
  }

  getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  attachMedia(element: HTMLVideoElement): void {
    if (this.videoElement === element) return;
    this.detachMedia();
    this.videoElement = element;
    this.setupVideoEvents();

    // Automatically load stream if it was requested before video element mounted
    if (this.pendingStreamUrl) {
      const url = this.pendingStreamUrl;
      this.pendingStreamUrl = null;
      this.loadStream(url);
    }
  }

  detachMedia(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.videoElement) {
      this.videoElement.removeAttribute('src');
      this.videoElement.load();
      this.videoElement = null;
    }
  }

  async loadStream(url: string): Promise<void> {
    this.currentUrl = url;
    this.error = null;
    this.isBuffering = true;
    this.notifyState();

    if (!this.videoElement) {
      // Store pending stream; will be loaded immediately when attachMedia is called
      this.pendingStreamUrl = url;
      return;
    }

    // Destroy existing HLS instance if any
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });

      this.hls = hls;
      hls.attachMedia(this.videoElement);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(url);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.isBuffering = false;
        this.notifyTracks();
        this.videoElement?.play().catch((e) => {
          // Autoplay policy might require user gesture
          console.warn('Autoplay prevented:', e);
        });
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        this.notifyTracks();
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        this.notifyTracks();
      });

      hls.on(Hls.Events.LEVEL_LOADED, () => {
        this.notifyTracks();
      });

      let networkRetryCount = 0;

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: {
              networkRetryCount++;
              const statusCode = data.response?.code;
              const is403 = statusCode === 403;
              const is404 = statusCode === 404;

              if (is404) {
                this.error = 'Channel Offline: This broadcast feed is currently unavailable (HTTP 404 Not Found from broadcaster).';
                this.isBuffering = false;
                this.notifyState();
                this.destroy();
                break;
              }

              // Check if auto-fallback routing is possible (e.g. direct -> proxy or proxy -> direct)
              if (this.fallbackHandler && this.fallbackHandler(url, is403)) {
                return;
              }

              if (networkRetryCount <= 2 && !is403) {
                console.warn(`HLS Network Error, attempting recovery (${networkRetryCount}/2)...`);
                hls.startLoad();
              } else {
                this.error = is403
                  ? 'HTTP 403 Forbidden: Stream blocked by proxy or CDN. Try switching connection mode.'
                  : `CORS / Network Error: Stream blocked by browser CORS policy. Try switching connection mode.`;
                this.isBuffering = false;
                this.notifyState();
                this.destroy();
              }
              break;
            }
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Fatal Media Error, trying recovery...');
              hls.recoverMediaError();
              break;
            default:
              this.error = `Playback error: ${data.details || 'Stream unreachable'}`;
              this.isBuffering = false;
              this.notifyState();
              this.destroy();
              break;
          }
        }
      });
    } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS fallback (Safari on iOS / macOS)
      this.videoElement.src = url;
      this.videoElement.addEventListener('loadedmetadata', () => {
        this.isBuffering = false;
        this.notifyState();
        this.videoElement?.play().catch(console.warn);
      });
    } else {
      this.error = 'HLS streaming is not supported on this browser';
      this.isBuffering = false;
      this.notifyState();
    }
  }

  async play(): Promise<void> {
    if (this.videoElement) {
      await this.videoElement.play();
    }
  }

  pause(): void {
    if (this.videoElement) {
      this.videoElement.pause();
    }
  }

  async togglePlay(): Promise<void> {
    if (!this.videoElement) return;
    if (this.videoElement.paused) {
      await this.play();
    } else {
      this.pause();
    }
  }

  seek(timeSeconds: number): void {
    if (this.videoElement) {
      this.videoElement.currentTime = timeSeconds;
    }
  }

  setVolume(volume: number): void {
    if (this.videoElement) {
      this.videoElement.volume = Math.max(0, Math.min(1, volume));
      if (volume > 0 && this.videoElement.muted) {
        this.videoElement.muted = false;
      }
    }
  }

  toggleMute(): void {
    if (this.videoElement) {
      this.videoElement.muted = !this.videoElement.muted;
    }
  }

  // --- Track Management ---

  getAudioTracks(): AudioTrack[] {
    if (!this.hls) return [];
    return this.hls.audioTracks.map((t, index) => ({
      id: index,
      name: t.name || `Audio Track ${index + 1}`,
      language: t.lang || 'und',
      default: t.default,
    }));
  }

  setAudioTrack(trackId: number): void {
    if (this.hls && trackId >= 0 && trackId < this.hls.audioTracks.length) {
      this.hls.audioTrack = trackId;
      this.notifyTracks();
    }
  }

  getSubtitleTracks(): SubtitleTrack[] {
    if (this.hls && this.hls.subtitleTracks.length > 0) {
      return this.hls.subtitleTracks.map((t, index) => ({
        id: index,
        name: t.name || `Subtitle ${index + 1}`,
        language: t.lang || 'und',
        default: t.default,
      }));
    }

    if (this.videoElement && this.videoElement.textTracks && this.videoElement.textTracks.length > 0) {
      const tracks: SubtitleTrack[] = [];
      for (let i = 0; i < this.videoElement.textTracks.length; i++) {
        const t = this.videoElement.textTracks[i];
        if (t.kind === 'subtitles' || t.kind === 'captions') {
          tracks.push({
            id: i,
            name: t.label || `Caption ${i + 1}`,
            language: t.language || 'und',
            default: t.mode === 'showing',
          });
        }
      }
      return tracks;
    }

    return [];
  }

  setSubtitleTrack(trackId: number): void {
    if (this.hls && this.hls.subtitleTracks.length > 0) {
      // -1 disables subtitles in HLS.js
      this.hls.subtitleTrack = trackId;
      this.notifyTracks();
      return;
    }

    if (this.videoElement && this.videoElement.textTracks && this.videoElement.textTracks.length > 0) {
      for (let i = 0; i < this.videoElement.textTracks.length; i++) {
        const track = this.videoElement.textTracks[i];
        if (track.kind === 'subtitles' || track.kind === 'captions') {
          track.mode = i === trackId ? 'showing' : 'disabled';
        }
      }
      this.notifyTracks();
    }
  }

  getQualityLevels(): QualityLevel[] {
    if (!this.hls) return [];
    return this.hls.levels.map((lvl, index) => ({
      id: index,
      bitrate: lvl.bitrate,
      width: lvl.width,
      height: lvl.height,
      name: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`,
    }));
  }

  setQualityLevel(levelId: number): void {
    if (this.hls) {
      // -1 means automatic adaptive bitrate
      this.hls.currentLevel = levelId;
      this.notifyTracks();
    }
  }

  // --- Picture-in-Picture ---

  async togglePictureInPicture(): Promise<boolean> {
    if (!this.videoElement || !document.pictureInPictureEnabled) return false;
    if (this.videoElement.readyState < 1) {
      console.info('Waiting for stream metadata before entering Picture-in-Picture');
      return false;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return false;
      } else {
        await this.videoElement.requestPictureInPicture();
        return true;
      }
    } catch (e) {
      console.warn('PiP error:', e);
      return false;
    }
  }

  isPictureInPictureSupported(): boolean {
    return typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;
  }

  // --- Event Listeners & Notifications ---

  onStateChange(callback: PlayerStateCallback): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  onTracksChange(callback: TracksCallback): () => void {
    this.tracksListeners.add(callback);
    return () => this.tracksListeners.delete(callback);
  }

  private setupVideoEvents(): void {
    if (!this.videoElement) return;

    this.videoElement.addEventListener('playing', () => {
      this.isPlaying = true;
      this.isBuffering = false;
      this.notifyState();
    });

    this.videoElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notifyState();
    });

    this.videoElement.addEventListener('waiting', () => {
      this.isBuffering = true;
      this.notifyState();
    });

    this.videoElement.addEventListener('timeupdate', () => {
      this.notifyState();
    });

    this.videoElement.addEventListener('error', () => {
      this.error = 'Video element encountered an error loading stream';
      this.isBuffering = false;
      this.notifyState();
    });
  }

  private notifyState(): void {
    const state = {
      isPlaying: this.isPlaying,
      isBuffering: this.isBuffering,
      currentTime: this.videoElement?.currentTime || 0,
      duration: this.videoElement?.duration || 0,
      isLive: true,
      error: this.error,
    };
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  private notifyTracks(): void {
    const tracks = {
      audioTracks: this.getAudioTracks(),
      selectedAudioTrack: this.hls?.audioTrack ?? -1,
      subtitleTracks: this.getSubtitleTracks(),
      selectedSubtitleTrack: this.hls?.subtitleTrack ?? -1,
      qualityLevels: this.getQualityLevels(),
      selectedQualityLevel: this.hls?.currentLevel ?? -1,
    };
    for (const listener of this.tracksListeners) {
      listener(tracks);
    }
  }

  destroy(): void {
    this.detachMedia();
    this.stateListeners.clear();
    this.tracksListeners.clear();
  }
}

// Global player adapter singleton instance
export const playerAdapter = new HlsPlayerAdapter();
