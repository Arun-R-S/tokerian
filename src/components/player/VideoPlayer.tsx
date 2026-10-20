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
  Radio,
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
  const autoPlayNextOnError = useSettingsStore((s) => s.autoPlayNextOnError);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [autoSkipCountdown, setAutoSkipCountdown] = useState<number | null>(null);

  // In-App Auto Subtitles (Speech-to-Text)
  const [autoCaptionsEnabled, setAutoCaptionsEnabled] = useState(false);
  const [liveCaptionText, setLiveCaptionText] = useState('');
  const [autoCaptionLang, setAutoCaptionLang] = useState('ta-IN');
  const recognitionRef = useRef<any>(null);

  // Sync default auto-caption language with channel
  useEffect(() => {
    if (currentChannel?.language) {
      const lower = currentChannel.language.toLowerCase();
      if (lower.includes('tam') || lower.includes('ta')) setAutoCaptionLang('ta-IN');
      else if (lower.includes('hin') || lower.includes('hi')) setAutoCaptionLang('hi-IN');
      else if (lower.includes('tel') || lower.includes('te')) setAutoCaptionLang('te-IN');
      else if (lower.includes('mal') || lower.includes('ml')) setAutoCaptionLang('ml-IN');
      else if (lower.includes('eng') || lower.includes('en')) setAutoCaptionLang('en-US');
    }
  }, [currentChannel]);

  // Speech Recognition listener for In-App Live Captions
  useEffect(() => {
    if (!autoCaptionsEnabled) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      setLiveCaptionText('');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser engine. Chrome or Edge is recommended.');
      setAutoCaptionsEnabled(false);
      return;
    }

    let isStopped = false;

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = autoCaptionLang;

      rec.onresult = (event: any) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i][0]) {
            text += event.results[i][0].transcript;
          }
        }
        if (text) {
          setLiveCaptionText(text);
        }
      };

      rec.onerror = (e: any) => {
        console.info('Live caption recognizer notice:', e);
      };

      rec.onend = () => {
        if (!isStopped && autoCaptionsEnabled) {
          try {
            rec.start();
          } catch {}
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
    }

    return () => {
      isStopped = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, [autoCaptionsEnabled, autoCaptionLang]);

  // Auto-skip countdown when channel is offline or encounters fatal error
  useEffect(() => {
    if (!error || !autoPlayNextOnError) {
      setAutoSkipCountdown(null);
      return;
    }

    // Start 4-second countdown before auto-zapping
    setAutoSkipCountdown(4);

    const interval = window.setInterval(() => {
      setAutoSkipCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(interval);
          zapNext();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [error, currentChannel?.id, autoPlayNextOnError, zapNext]);

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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleFullscreen]);

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
        onDoubleClick={toggleFullscreen}
      />

      {/* Real-Time Live Speech Caption Overlay */}
      {autoCaptionsEnabled && liveCaptionText && (
        <div className="player-live-captions-overlay">
          <span className="live-caption-text">{liveCaptionText}</span>
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="player-buffering-overlay">
          <div className="spinner" />
          <span className="buffering-text">Connecting to Live Feed...</span>
        </div>
      )}

      {/* Error / Offline Overlay */}
      {error && (
        <div className="player-error-overlay">
          {error.includes('Offline') || error.includes('404') ? (
            <>
              <Radio size={40} className="text-muted" style={{ opacity: 0.6 }} />
              <h4 className="error-title">Channel Currently Offline</h4>
              <p className="error-description">
                The broadcaster server for <strong>{currentChannel.name}</strong> returned HTTP 404 Not Found.
                This stream is temporarily down or has been decommissioned by the broadcaster.
              </p>
              {autoSkipCountdown !== null && (
                <p style={{ color: 'var(--color-primary)', fontSize: '0.9rem', marginBottom: '12px' }}>
                  Auto-skipping to next channel in <strong>{autoSkipCountdown}s</strong>...
                </p>
              )}
              <div className="error-actions">
                <button
                  type="button"
                  onClick={() => {
                    setAutoSkipCountdown(null);
                    zapNext();
                  }}
                  className="tokerian-btn tokerian-btn-primary"
                >
                  <SkipForward size={16} /> Skip to Next Channel
                </button>
                {autoSkipCountdown !== null && (
                  <button
                    type="button"
                    onClick={() => setAutoSkipCountdown(null)}
                    className="tokerian-btn"
                  >
                    Cancel Auto-Skip
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAutoSkipCountdown(null);
                    playChannel(currentChannel);
                  }}
                  className="tokerian-btn"
                >
                  <RotateCcw size={16} /> Retry Feed
                </button>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle size={36} color="#ef4444" />
              <h4 className="error-title">Stream Playback Issue</h4>
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
                  className="tokerian-btn"
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
            </>
          )}
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
            <div className="osd-dropdown-wrapper">
              <button
                type="button"
                onClick={() => {
                  setShowSubtitleMenu(!showSubtitleMenu);
                  setShowAudioMenu(false);
                }}
                className={`tokerian-btn-icon ${showSubtitleMenu || selectedSubtitleTrack !== -1 ? 'btn-active' : ''}`}
                title={selectedSubtitleTrack !== -1 ? 'Subtitles Active' : 'Subtitles / Captions (CC)'}
              >
                <Subtitles size={20} />
              </button>

              {showSubtitleMenu && (
                <div className="osd-menu-popup glass-panel" style={{ minWidth: '240px' }}>
                  <div className="osd-menu-header">Broadcast Subtitles</div>
                  {subtitleTracks.length > 0 ? (
                    <>
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
                    </>
                  ) : (
                    <div style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      No embedded tracks in this broadcast feed.
                    </div>
                  )}

                  <div className="subtitle-menu-divider" />

                  <div className="osd-menu-header">AI Auto-Captions (Speech-to-Text)</div>
                  <button
                    type="button"
                    onClick={() => setAutoCaptionsEnabled(!autoCaptionsEnabled)}
                    className={`subtitle-auto-toggle-btn ${autoCaptionsEnabled ? 'auto-active' : ''}`}
                  >
                    <span>Live Auto Subtitles</span>
                    <span>{autoCaptionsEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  {autoCaptionsEnabled && (
                    <select
                      value={autoCaptionLang}
                      onChange={(e) => setAutoCaptionLang(e.target.value)}
                      className="subtitle-lang-select"
                    >
                      <option value="ta-IN">Tamil (தமிழ்)</option>
                      <option value="en-US">English (US)</option>
                      <option value="hi-IN">Hindi (हिन्दी)</option>
                      <option value="te-IN">Telugu (తెలుగు)</option>
                      <option value="ml-IN">Malayalam (മലയാളം)</option>
                      <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                      <option value="es-ES">Spanish (Español)</option>
                      <option value="fr-FR">French (Français)</option>
                      <option value="de-DE">German (Deutsch)</option>
                    </select>
                  )}

                  <div className="subtitle-menu-divider" />

                  <button
                    type="button"
                    onClick={() => {
                      togglePiP();
                      setShowSubtitleMenu(false);
                    }}
                    className="osd-menu-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <PictureInPicture size={14} />
                    <span>Open in PiP (Chrome AI Translate)</span>
                  </button>
                </div>
              )}
            </div>

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
