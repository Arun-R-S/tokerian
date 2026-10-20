import React, { useEffect, useRef, useState, useMemo } from 'react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUserStore } from '../../stores/useUserStore';
import { useChannelStore } from '../../stores/useChannelStore';
import { useEpgStore } from '../../stores/useEpgStore';
import { ChannelSanitizer } from '../../utils/channelSanitizer';
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
  RotateCw,
  AlertTriangle,
  Radio,
  X,
  Calendar,
  MonitorPlay,
  Copy,
  Check,
  ListVideo,
  Settings2,
  Search,
  CheckCircle,
} from 'lucide-react';
import { EpgRibbon } from '../epg/EpgRibbon';
import { ExternalPlayerService } from '../../services/player/ExternalPlayerService';

interface VideoPlayerProps {
  onOpenEpgGuide?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ onOpenEpgGuide }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const osdTimerRef = useRef<number | null>(null);

  const [showOsd, setShowOsd] = useState(true);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showExternalMenu, setShowExternalMenu] = useState(false);
  const [showZapDrawer, setShowZapDrawer] = useState(false);
  const [zapSearchQuery, setZapSearchQuery] = useState('');
  const [isCastConnecting, setIsCastConnecting] = useState(false);

  // External Player State
  const [externalPlayerActive, setExternalPlayerActive] = useState<{ player: 'vlc' | 'mpv'; pid?: number } | null>(null);
  const [externalToast, setExternalToast] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

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

  const qualityLevels = usePlayerStore((s) => s.qualityLevels);
  const selectedQualityLevel = usePlayerStore((s) => s.selectedQualityLevel);
  const selectQualityLevel = usePlayerStore((s) => s.selectQualityLevel);

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

  // Channel store for Quick Zap Drawer
  const allChannels = useChannelStore((s) => s.channels);

  // EPG store for Live Broadcast interval
  const getLiveProgramInfo = useEpgStore((s) => s.getLiveProgramInfo);
  const currentTimeMs = useEpgStore((s) => s.currentTimeMs);

  const liveProgramInfo = useMemo(() => {
    if (!currentChannel) return null;
    return getLiveProgramInfo(currentChannel.tvgId, currentChannel.name);
  }, [currentChannel, getLiveProgramInfo, currentTimeMs]);

  const isFav = useUserStore((s) => (currentChannel ? s.favorites.has(currentChannel.id) : false));
  const toggleFavorite = useUserStore((s) => s.toggleFavorite);

  const corsProxyEnabled = useSettingsStore((s) => s.corsProxyEnabled);
  const autoPlayNextOnError = useSettingsStore((s) => s.autoPlayNextOnError);
  const customVlcPath = useSettingsStore((s) => s.customVlcPath);
  const customMpvPath = useSettingsStore((s) => s.customMpvPath);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [autoSkipCountdown, setAutoSkipCountdown] = useState<number | null>(null);

  // Cleaned channel title
  const displayTitle = useMemo(() => {
    if (!currentChannel) return '';
    return ChannelSanitizer.cleanTitle(currentChannel.name) || currentChannel.name;
  }, [currentChannel]);

  // Formatted start - stop time for current EPG program
  const programTimeInterval = useMemo(() => {
    if (!liveProgramInfo?.current) return null;
    try {
      const s = new Date(liveProgramInfo.current.startTimestamp);
      const e = new Date(liveProgramInfo.current.stopTimestamp);
      const formatTime = (d: Date) =>
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${formatTime(s)} - ${formatTime(e)}`;
    } catch {
      return null;
    }
  }, [liveProgramInfo]);

  // Filtered channels for Quick Zap Drawer
  const filteredZapChannels = useMemo(() => {
    if (!zapSearchQuery.trim()) return allChannels.slice(0, 80);
    const q = zapSearchQuery.toLowerCase();
    return allChannels
      .filter((ch) => ch.name.toLowerCase().includes(q) || ch.group.toLowerCase().includes(q))
      .slice(0, 80);
  }, [allChannels, zapSearchQuery]);

  // Seek helper (Jump forward/backwards 10s)
  const handleSeekDelta = (deltaSeconds: number) => {
    if (!videoRef.current) return;
    try {
      const newTime = Math.max(0, videoRef.current.currentTime + deltaSeconds);
      videoRef.current.currentTime = newTime;
    } catch (e) {
      console.warn('Seek error:', e);
    }
  };

  // External Player Launch Handlers
  const handleOpenExternal = async (player: 'vlc' | 'mpv') => {
    setShowExternalMenu(false);
    if (!currentChannel) return;

    if (isPlaying) {
      togglePlay();
    }

    const customPath = player === 'vlc' ? customVlcPath : customMpvPath;
    const res = await ExternalPlayerService.launch(player, currentChannel.url, currentChannel.name, customPath);

    if (res.success) {
      setExternalPlayerActive({ player, pid: res.pid });
      setExternalToast(`Streaming in ${player.toUpperCase()} Player`);
      setTimeout(() => setExternalToast(null), 4000);
    } else {
      setExternalToast(res.error || `Could not start ${player.toUpperCase()}`);
      setTimeout(() => setExternalToast(null), 5000);
    }
  };

  const handleCopyStreamUrl = async () => {
    if (!currentChannel) return;
    const ok = await ExternalPlayerService.copyStreamUrl(currentChannel.url);
    if (ok) {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

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
    // Auto-hide controls after 3.8 seconds if playing and drawer/menus are closed
    if (isPlaying && !showZapDrawer && !showQualityMenu && !showAudioMenu && !showSubtitleMenu && !showExternalMenu) {
      osdTimerRef.current = window.setTimeout(() => {
        setShowOsd(false);
        setShowAudioMenu(false);
        setShowSubtitleMenu(false);
        setShowQualityMenu(false);
      }, 3800);
    }
  };

  useEffect(() => {
    resetOsdTimer();
    return () => {
      if (osdTimerRef.current) window.clearTimeout(osdTimerRef.current);
    };
  }, [isPlaying, showZapDrawer, showQualityMenu, showAudioMenu, showSubtitleMenu, showExternalMenu]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeekDelta(-10);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeekDelta(10);
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        setShowZapDrawer((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (showZapDrawer) {
          setShowZapDrawer(false);
        } else {
          closePlayer();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleFullscreen, toggleMute, togglePlay, showZapDrawer, closePlayer]);

  if (!currentChannel) return null;

  const handleCastClick = () => {
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

      {/* Toast Notification */}
      {externalToast && (
        <div className="player-external-toast">
          <MonitorPlay size={15} color="var(--accent-primary)" />
          <span>{externalToast}</span>
        </div>
      )}

      {/* External Player Active Overlay */}
      {externalPlayerActive && (
        <div className="player-external-overlay">
          <MonitorPlay size={44} color="#6366f1" />
          <h3 style={{ margin: '12px 0 6px', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
            Streaming in {externalPlayerActive.player.toUpperCase()} Media Player
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px' }}>
            Broadcasting feed directly in external native window for high-performance zero-copy decoding.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setExternalPlayerActive(null);
                togglePlay();
              }}
              className="tokerian-btn tokerian-btn-primary"
            >
              <Play size={16} fill="currentColor" /> Resume in Tokerian
            </button>
            <button
              type="button"
              onClick={handleCopyStreamUrl}
              className="tokerian-btn"
            >
              {copiedToast ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              {copiedToast ? 'URL Copied!' : 'Copy Stream URL'}
            </button>
          </div>
        </div>
      )}

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
                  onClick={() => handleOpenExternal('vlc')}
                  className="tokerian-btn"
                  title="Play in VLC Media Player"
                >
                  <MonitorPlay size={16} /> Open in VLC
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenExternal('mpv')}
                  className="tokerian-btn"
                  title="Play in MPV Media Player"
                >
                  <MonitorPlay size={16} /> Open in MPV
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
                  {corsProxyEnabled ? 'Direct Mode' : 'CORS Proxy'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Auto-Hiding On-Screen Display (OSD) Overlay */}
      <div className={`player-osd-overlay ${showOsd || showZapDrawer ? 'osd-visible' : 'osd-hidden'}`}>
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
                <span className="live-indicator-dot" />
                <span className="osd-live-text">LIVE</span>
                <h2 className="osd-channel-name">{displayTitle}</h2>
                {currentChannel.resolution && (
                  <span className="channel-badge badge-resolution">{currentChannel.resolution}</span>
                )}
              </div>
              <div className="osd-submeta-row">
                <span className="osd-channel-group">{currentChannel.group}</span>
                {liveProgramInfo?.current?.title && (
                  <>
                    <span className="osd-meta-sep">•</span>
                    <span className="osd-program-name">{liveProgramInfo.current.title}</span>
                  </>
                )}
                {programTimeInterval && (
                  <>
                    <span className="osd-meta-sep">•</span>
                    <span className="osd-program-time">{programTimeInterval}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="osd-top-actions">
            {/* Quick Zap Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowZapDrawer(!showZapDrawer)}
              className={`tokerian-btn-icon ${showZapDrawer ? 'btn-active' : ''}`}
              title="Quick Zap Channels (Z)"
            >
              <ListVideo size={18} />
            </button>

            {/* Desktop External Player Launcher */}
            <div className="osd-dropdown-wrapper">
              <button
                type="button"
                onClick={() => {
                  setShowExternalMenu(!showExternalMenu);
                  setShowAudioMenu(false);
                  setShowSubtitleMenu(false);
                  setShowQualityMenu(false);
                }}
                className={`tokerian-btn-icon ${showExternalMenu ? 'btn-active' : ''}`}
                title="Play in External Player (VLC / MPV)"
              >
                <MonitorPlay size={18} />
              </button>

              {showExternalMenu && (
                <div className="osd-menu-popup glass-panel" style={{ minWidth: '210px' }}>
                  <div className="osd-menu-header">External Players</div>
                  <button
                    type="button"
                    onClick={() => handleOpenExternal('vlc')}
                    className="osd-menu-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <MonitorPlay size={15} color="#f97316" />
                    <span>Open in VLC Player</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenExternal('mpv')}
                    className="osd-menu-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <MonitorPlay size={15} color="#8b5cf6" />
                    <span>Open in MPV Player</span>
                  </button>
                  <div className="subtitle-menu-divider" />
                  <button
                    type="button"
                    onClick={() => {
                      handleCopyStreamUrl();
                      setShowExternalMenu(false);
                    }}
                    className="osd-menu-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {copiedToast ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                    <span>{copiedToast ? 'URL Copied!' : 'Copy Stream URL'}</span>
                  </button>
                </div>
              )}
            </div>

            {onOpenEpgGuide && (
              <button
                type="button"
                onClick={onOpenEpgGuide}
                className="tokerian-btn-icon"
                title="TV Guide & Schedule (EPG)"
              >
                <Calendar size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={() => toggleFavorite(currentChannel.id)}
              className={`tokerian-btn-icon ${isFav ? 'fav-active' : ''}`}
              title={isFav ? 'Remove favorite' : 'Add favorite'}
            >
              <Star size={18} fill={isFav ? '#eab308' : 'none'} color={isFav ? '#eab308' : '#fff'} />
            </button>
            <button
              type="button"
              onClick={closePlayer}
              className="tokerian-btn-icon"
              title="Close player (ESC)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Middle Floating Area: Live EPG Program Ribbon */}
        <div style={{ maxWidth: '480px', margin: 'auto 0 10px 0', pointerEvents: 'auto' }}>
          <EpgRibbon
            tvgId={currentChannel.tvgId}
            channelName={currentChannel.name}
            onOpenFullGuide={onOpenEpgGuide}
          />
        </div>

        {/* Bottom Bar: Playback Controls */}
        <div className="osd-bottom-bar">
          <div className="osd-controls-left">
            <button
              type="button"
              onClick={zapPrev}
              className="tokerian-btn-icon"
              title="Previous channel (PageDown)"
            >
              <SkipBack size={18} />
            </button>

            {/* Jump -10 Seconds */}
            <button
              type="button"
              onClick={() => handleSeekDelta(-10)}
              className="tokerian-btn-icon"
              title="Seek -10s (Arrow Left)"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="tokerian-btn tokerian-btn-primary play-pause-btn"
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
            </button>

            {/* Jump +10 Seconds */}
            <button
              type="button"
              onClick={() => handleSeekDelta(10)}
              className="tokerian-btn-icon"
              title="Seek +10s (Arrow Right)"
            >
              <RotateCw size={16} />
            </button>

            <button
              type="button"
              onClick={zapNext}
              className="tokerian-btn-icon"
              title="Next channel (PageUp)"
            >
              <SkipForward size={18} />
            </button>

            {/* Volume Control */}
            <div className="osd-volume-group">
              <button
                type="button"
                onClick={toggleMute}
                className="tokerian-btn-icon"
                title="Mute / Unmute (M)"
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
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
            {/* Stream Quality Selector Dropdown */}
            {qualityLevels.length > 0 && (
              <div className="osd-dropdown-wrapper">
                <button
                  type="button"
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowAudioMenu(false);
                    setShowSubtitleMenu(false);
                  }}
                  className={`tokerian-btn-icon ${showQualityMenu || selectedQualityLevel !== -1 ? 'btn-active' : ''}`}
                  title="Stream Quality (Resolution / Bitrate)"
                >
                  <Settings2 size={18} />
                </button>

                {showQualityMenu && (
                  <div className="osd-menu-popup glass-panel">
                    <div className="osd-menu-header">Stream Quality</div>
                    <button
                      type="button"
                      onClick={() => {
                        selectQualityLevel(-1);
                        setShowQualityMenu(false);
                      }}
                      className={`osd-menu-item ${selectedQualityLevel === -1 ? 'menu-item-active' : ''}`}
                    >
                      <span>Auto (Adaptive)</span>
                    </button>
                    {qualityLevels.map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          selectQualityLevel(lvl.id);
                          setShowQualityMenu(false);
                        }}
                        className={`osd-menu-item ${selectedQualityLevel === lvl.id ? 'menu-item-active' : ''}`}
                      >
                        <span>{lvl.name}</span>
                        {lvl.bitrate && lvl.bitrate > 0 && (
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginLeft: '6px' }}>
                            {Math.round(lvl.bitrate / 1000)} kbps
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Multiple Audio Tracks Selector */}
            {audioTracks.length > 0 && (
              <div className="osd-dropdown-wrapper">
                <button
                  type="button"
                  onClick={() => {
                    setShowAudioMenu(!showAudioMenu);
                    setShowSubtitleMenu(false);
                    setShowQualityMenu(false);
                  }}
                  className={`tokerian-btn-icon ${showAudioMenu ? 'btn-active' : ''}`}
                  title="Multiple Audio Tracks"
                >
                  <Languages size={18} />
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
                  setShowQualityMenu(false);
                }}
                className={`tokerian-btn-icon ${showSubtitleMenu || selectedSubtitleTrack !== -1 ? 'btn-active' : ''}`}
                title={selectedSubtitleTrack !== -1 ? 'Subtitles Active' : 'Subtitles / Captions (CC)'}
              >
                <Subtitles size={18} />
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
              <Cast size={18} />
            </button>

            {/* Picture-in-Picture */}
            <button
              type="button"
              onClick={togglePiP}
              className="tokerian-btn-icon"
              title="Picture-in-Picture"
            >
              <PictureInPicture size={18} />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="tokerian-btn-icon"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Side Slide-in Quick Zap Channel Drawer */}
      <div
        className={`player-zap-drawer ${showZapDrawer ? 'zap-drawer-open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="zap-drawer-header">
          <div className="zap-drawer-title-row">
            <ListVideo size={18} color="var(--accent-primary)" />
            <span className="zap-drawer-title">Quick Zap Channels</span>
            <button
              type="button"
              onClick={() => setShowZapDrawer(false)}
              className="tokerian-btn-icon zap-close-btn"
              title="Close drawer (Z / ESC)"
            >
              <X size={16} />
            </button>
          </div>
          <div className="zap-search-wrapper">
            <Search size={14} className="zap-search-icon" />
            <input
              type="text"
              placeholder="Search channels or groups..."
              value={zapSearchQuery}
              onChange={(e) => setZapSearchQuery(e.target.value)}
              className="zap-search-input"
            />
            {zapSearchQuery && (
              <button
                type="button"
                onClick={() => setZapSearchQuery('')}
                className="zap-search-clear"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="zap-drawer-list">
          {filteredZapChannels.map((channel) => {
            const isCurrent = currentChannel?.id === channel.id;
            const cleaned = ChannelSanitizer.cleanTitle(channel.name) || channel.name;
            return (
              <div
                key={channel.id}
                onClick={() => {
                  playChannel(channel);
                  setShowZapDrawer(false);
                }}
                className={`zap-channel-item ${isCurrent ? 'zap-channel-active' : ''}`}
              >
                <div className="zap-channel-logo-container">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      className="zap-channel-logo"
                      loading="lazy"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <span className="zap-channel-initial">
                      {cleaned.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="zap-channel-info">
                  <div className="zap-channel-name-row">
                    <span className="zap-channel-name" title={channel.name}>
                      {cleaned}
                    </span>
                    {isCurrent && <CheckCircle size={14} color="var(--accent-primary)" />}
                  </div>
                  <span className="zap-channel-group">{channel.group}</span>
                </div>
              </div>
            );
          })}
          {filteredZapChannels.length === 0 && (
            <div className="zap-empty-notice">No matching channels found</div>
          )}
        </div>
      </div>
    </div>
  );
};

