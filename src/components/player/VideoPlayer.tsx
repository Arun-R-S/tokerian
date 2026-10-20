import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUserStore } from '../../stores/useUserStore';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  Languages,
  Subtitles,
  SkipBack,
  SkipForward,
  Star,
  Cast,
  RotateCcw,
  AlertTriangle,
  X,
} from 'lucide-react';

export const VideoPlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const osdTimerRef = useRef<number | null>(null);

  const [showOsd, setShowOsd] = useState(true);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [isCastConnecting, setIsCastConnecting] = useState(false);

  const currentChannel = usePlayerStore((s) => s.currentChannel);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const error = usePlayerStore((s) => s.error);
  const isFullscreen = usePlayerStore((s) => s.isFullscreen);

  const audioTracks = usePlayerStore((s) => s.audioTracks);
  const selectedAudioTrack = usePlayerStore((s) => s.selectedAudioTrack);

  const subtitleTracks = usePlayerStore((s) => s.subtitleTracks);
  const selectedSubtitleTrack = usePlayerStore((s) => s.selectedSubtitleTrack);

  const attachVideoElement = usePlayerStore((s) => s.attachVideoElement);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const selectAudioTrack = usePlayerStore((s) => s.selectAudioTrack);
  const selectSubtitleTrack = usePlayerStore((s) => s.selectSubtitleTrack);
  const togglePiP = usePlayerStore((s) => s.togglePiP);
  const toggleFullscreen = usePlayerStore((s) => s.toggleFullscreen);
  const zapNext = usePlayerStore((s) => s.zapNext);
  const zapPrev = usePlayerStore((s) => s.zapPrev);
  const playChannel = usePlayerStore((s) => s.playChannel);
  const closePlayer = usePlayerStore((s) => s.closePlayer);

  const isFav = useUserStore((s) => (currentChannel ? s.favorites.has(currentChannel.id) : false));
  const toggleFavorite = useUserStore((s) => s.toggleFavorite);

  const corsProxyEnabled = useSettingsStore((s) => s.corsProxyEnabled);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  // Attach video element immediately using callback ref
  const setVideoRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) {
      attachVideoElement(node);
    }
  };

  // Handle auto-hiding OSD controls after inactivity
  const resetOsdTimer = () => {
    setShowOsd(true);
    if (osdTimerRef.current) {
      window.clearTimeout(osdTimerRef.current);
    }
    // Auto-hide controls after 3.5 seconds if playing
    if (isPlaying) {
      osdTimerRef.current = window.setTimeout(() => {
        setShowOsd(false);
        setShowAudioMenu(false);
        setShowSubtitleMenu(false);
      }, 3500);
    }
  };

  useEffect(() => {
    resetOsdTimer();
    return () => {
      if (osdTimerRef.current) window.clearTimeout(osdTimerRef.current);
    };
  }, [isPlaying]);

  if (!currentChannel) return null;

  const handleCastClick = () => {
    // Chromecast integration check
    setIsCastConnecting(true);
    setTimeout(() => {
      setIsCastConnecting(false);
      alert('Google Cast initialized: Select your Chromecast device in the browser prompt.');
    }, 600);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetOsdTimer}
      onClick={resetOsdTimer}
      className={`video-player-container ${isFullscreen ? 'player-fullscreen' : ''}`}
    >
      <video
        ref={setVideoRef}
        playsInline
        className="video-canvas"
        onClick={togglePlay}
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="player-buffering-overlay">
          <div className="spinner" />
          <span className="buffering-text">Connecting to Live Feed...</span>
        </div>
      )}

      {/* Error Overlay with CORS Proxy Prompt */}
      {error && (
        <div className="player-error-overlay">
          <AlertTriangle size={36} color="#ef4444" />
          <h4 className="error-title">Stream Playback Error</h4>
          <p className="error-description">{error}</p>
          <div className="error-actions">
            <button
              type="button"
              onClick={() => playChannel(currentChannel)}
              className="tokerian-btn tokerian-btn-primary"
            >
              <RotateCcw size={16} /> Retry Channel
            </button>
            <button
              type="button"
              onClick={() => {
                const nextMode = !corsProxyEnabled;
                updateSettings({ corsProxyEnabled: nextMode });
                playChannel(currentChannel, nextMode ? 'proxy' : 'direct');
              }}
              className="tokerian-btn tokerian-btn-primary"
            >
              {corsProxyEnabled ? 'Switch to Direct Connection' : 'Try via CORS Proxy'}
            </button>
            <button
              type="button"
              onClick={zapNext}
              className="tokerian-btn"
            >
              <SkipForward size={16} /> Next Channel
            </button>
          </div>
        </div>
      )}

      {/* Auto-Hiding On-Screen Display (OSD) Overlay */}
      <div className={`player-osd-overlay ${showOsd ? 'osd-visible' : 'osd-hidden'}`}>
        {/* Top Bar: Channel Info & Badges */}
        <div className="osd-top-bar">
          <div className="osd-channel-meta">
            {currentChannel.logo && (
              <img
                src={currentChannel.logo}
                alt={currentChannel.name}
                className="osd-logo"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
            <div>
              <div className="osd-title-row">
                <span className="live-indicator" />
                <h2 className="osd-channel-name">{currentChannel.name}</h2>
                {currentChannel.resolution && (
                  <span className="channel-badge badge-resolution">{currentChannel.resolution}</span>
                )}
              </div>
              <span className="osd-channel-group">{currentChannel.group}</span>
            </div>
          </div>

          <div className="osd-top-actions">
            <button
              type="button"
              onClick={() => toggleFavorite(currentChannel.id)}
              className={`tokerian-btn-icon ${isFav ? 'fav-active' : ''}`}
              title={isFav ? 'Remove favorite' : 'Add favorite'}
            >
              <Star size={20} fill={isFav ? '#eab308' : 'none'} color={isFav ? '#eab308' : '#fff'} />
            </button>
            <button
              type="button"
              onClick={closePlayer}
              className="tokerian-btn-icon"
              title="Close player"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Bottom Bar: Playback Controls */}
        <div className="osd-bottom-bar">
          <div className="osd-controls-left">
            <button
              type="button"
              onClick={zapPrev}
              className="tokerian-btn-icon"
              title="Previous channel (Arrow Left / PageDown)"
            >
              <SkipBack size={20} />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="tokerian-btn tokerian-btn-primary play-pause-btn"
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
            </button>

            <button
              type="button"
              onClick={zapNext}
              className="tokerian-btn-icon"
              title="Next channel (Arrow Right / PageUp)"
            >
              <SkipForward size={20} />
            </button>

            {/* Volume Control */}
            <div className="osd-volume-group">
              <button
                type="button"
                onClick={toggleMute}
                className="tokerian-btn-icon"
                title="Mute / Unmute (M)"
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="osd-volume-slider"
                title="Volume"
              />
            </div>
          </div>

          <div className="osd-controls-right">
            {/* Multiple Audio Tracks Selector */}
            {audioTracks.length > 0 && (
              <div className="osd-dropdown-wrapper">
                <button
                  type="button"
                  onClick={() => {
                    setShowAudioMenu(!showAudioMenu);
                    setShowSubtitleMenu(false);
                  }}
                  className={`tokerian-btn-icon ${showAudioMenu ? 'btn-active' : ''}`}
                  title="Multiple Audio Tracks"
                >
                  <Languages size={20} />
                </button>

                {showAudioMenu && (
                  <div className="osd-menu-popup glass-panel">
                    <div className="osd-menu-header">Audio Tracks</div>
                    {audioTracks.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          selectAudioTrack(track.id);
                          setShowAudioMenu(false);
                        }}
                        className={`osd-menu-item ${selectedAudioTrack === track.id ? 'menu-item-active' : ''}`}
                      >
                        {track.name} ({track.language.toUpperCase()})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Subtitles / Closed Captions */}
            {subtitleTracks.length > 0 && (
              <div className="osd-dropdown-wrapper">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubtitleMenu(!showSubtitleMenu);
                    setShowAudioMenu(false);
                  }}
                  className={`tokerian-btn-icon ${showSubtitleMenu ? 'btn-active' : ''}`}
                  title="Subtitles"
                >
                  <Subtitles size={20} />
                </button>

                {showSubtitleMenu && (
                  <div className="osd-menu-popup glass-panel">
                    <div className="osd-menu-header">Subtitles</div>
                    <button
                      type="button"
                      onClick={() => {
                        selectSubtitleTrack(-1);
                        setShowSubtitleMenu(false);
                      }}
                      className={`osd-menu-item ${selectedSubtitleTrack === -1 ? 'menu-item-active' : ''}`}
                    >
                      Off
                    </button>
                    {subtitleTracks.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          selectSubtitleTrack(sub.id);
                          setShowSubtitleMenu(false);
                        }}
                        className={`osd-menu-item ${selectedSubtitleTrack === sub.id ? 'menu-item-active' : ''}`}
                      >
                        {sub.name} ({sub.language.toUpperCase()})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Casting (Chromecast) */}
            <button
              type="button"
              onClick={handleCastClick}
              className={`tokerian-btn-icon ${isCastConnecting ? 'cast-connecting' : ''}`}
              title="Cast to TV / Chromecast"
            >
              <Cast size={20} />
            </button>

            {/* Picture-in-Picture */}
            <button
              type="button"
              onClick={togglePiP}
              className="tokerian-btn-icon"
              title="Picture-in-Picture"
            >
              <PictureInPicture size={20} />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="tokerian-btn-icon"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
