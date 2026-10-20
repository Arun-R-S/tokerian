// Tabbed Settings Center ported and adapted from IPTVnator
// Features General, Playback, External Players, Title Sanitizer, and Parental Lock tabs.

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useChannelStore } from '../../stores/useChannelStore';
import { IPTV_PRESETS } from '../../core/presets/iptvPresets';
import { storageAdapter } from '../../adapters/storage/IndexedDbAdapter';
import { ExternalPlayerService } from '../../services/player/ExternalPlayerService';
import { ChannelSanitizer } from '../../utils/channelSanitizer';
import {
  X,
  Link,
  Shield,
  Tv,
  Trash2,
  Sliders,
  Globe,
  Layers,
  MonitorPlay,
  RotateCcw,
  Play,
  Type,
  Lock,
  Unlock,
  KeyRound,
} from 'lucide-react';

export type SettingsTab = 'general' | 'playback' | 'external' | 'titles' | 'parental';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // General Store State
  const m3uUrl = useSettingsStore((s) => s.m3uUrl);
  const corsProxyEnabled = useSettingsStore((s) => s.corsProxyEnabled);
  const corsProxyUrl = useSettingsStore((s) => s.corsProxyUrl);
  const bufferLength = useSettingsStore((s) => s.bufferLength);
  const autoPlayNextOnError = useSettingsStore((s) => s.autoPlayNextOnError);
  const tvMode = useSettingsStore((s) => s.tvMode);

  // External Players State
  const defaultExternalPlayer = useSettingsStore((s) => s.defaultExternalPlayer) || 'vlc';
  const customVlcPath = useSettingsStore((s) => s.customVlcPath) || '';
  const customMpvPath = useSettingsStore((s) => s.customMpvPath) || '';

  // Title Sanitizer & Parental Lock State
  const cleanChannelTitles = useSettingsStore((s) => s.cleanChannelTitles) || false;
  const parentalLockEnabled = useSettingsStore((s) => s.parentalLockEnabled) || false;
  const parentalLockPinHash = useSettingsStore((s) => s.parentalLockPinHash);
  const isSessionUnlocked = useSettingsStore((s) => s.isSessionUnlocked);
  const lockedKeywords = useSettingsStore((s) => s.lockedKeywords) || [];

  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const unlockParentalSession = useSettingsStore((s) => s.unlockParentalSession);
  const lockParentalSession = useSettingsStore((s) => s.lockParentalSession);
  const setParentalPin = useSettingsStore((s) => s.setParentalPin);

  const loadPlaylist = useChannelStore((s) => s.loadPlaylist);

  // Form Inputs
  const [inputUrl, setInputUrl] = useState(m3uUrl);
  const [proxyUrl, setProxyUrl] = useState(corsProxyUrl);
  const [vlcPathInput, setVlcPathInput] = useState(customVlcPath);
  const [mpvPathInput, setMpvPathInput] = useState(customMpvPath);
  const [detectedPlayers, setDetectedPlayers] = useState<{ vlc: boolean; mpv: boolean; platform?: string }>({
    vlc: false,
    mpv: false,
  });

  // Parental PIN form state
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  // Sanitizer Test Input
  const [testTitle, setTestTitle] = useState('US - HBO 1 [FHD]');

  useEffect(() => {
    if (isOpen) {
      setInputUrl(m3uUrl);
      setProxyUrl(corsProxyUrl);
      setVlcPathInput(customVlcPath);
      setMpvPathInput(customMpvPath);

      ExternalPlayerService.checkInstalled({ vlc: customVlcPath, mpv: customMpvPath }).then((res) => {
        setDetectedPlayers(res);
      });
    }
  }, [isOpen, m3uUrl, corsProxyUrl, customVlcPath, customMpvPath]);

  if (!isOpen) return null;

  const handleSaveAndLoad = async () => {
    await updateSettings({
      m3uUrl: inputUrl,
      corsProxyUrl: proxyUrl,
    });
    loadPlaylist(inputUrl, true);
    onClose();
  };

  const handleSelectPreset = (url: string) => {
    setInputUrl(url);
    updateSettings({ m3uUrl: url });
    loadPlaylist(url, false);
    onClose();
  };

  const handleClearCache = async () => {
    if (confirm('Clear local playlist cache? Channels will re-download on next load.')) {
      await storageAdapter.clearChannels(encodeURIComponent(m3uUrl));
      alert('Playlist cache cleared.');
      loadPlaylist(m3uUrl, true);
    }
  };

  const handleSetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4 || newPin.length > 8 || !/^[0-9]+$/.test(newPin)) {
      setPinMessage('PIN must be 4 to 8 numeric digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage('PIN confirmation does not match.');
      return;
    }

    await setParentalPin(newPin);
    setNewPin('');
    setConfirmPin('');
    setPinMessage('Parental PIN successfully configured and enabled!');
    setTimeout(() => setPinMessage(null), 3000);
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await unlockParentalSession(unlockPinInput);
    if (ok) {
      setUnlockPinInput('');
      setPinMessage('Parental lock unlocked for this session.');
      setTimeout(() => setPinMessage(null), 3000);
    } else {
      setPinMessage('Incorrect PIN. Please try again.');
      setTimeout(() => setPinMessage(null), 3000);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        style={{
          maxWidth: '800px',
          width: '92vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={22} className="text-accent" />
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              Tokerian Settings
            </h2>
          </div>
          <button type="button" onClick={onClose} className="tokerian-btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation Ribbon */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '10px 24px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid var(--border-subtle)',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'general', label: 'General', icon: Sliders },
            { id: 'playback', label: 'Playback & Stream', icon: Play },
            { id: 'external', label: 'External Players', icon: MonitorPlay },
            { id: 'titles', label: 'Title Cleaner', icon: Type },
            { id: 'parental', label: 'Parental Lock', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`tokerian-btn ${isActive ? 'tokerian-btn-primary' : ''}`}
                style={{
                  fontSize: '0.82rem',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="settings-section">
                <label className="settings-label">
                  <Link size={16} /> Extended M3U / M3U8 Playlist URL
                </label>
                <p className="settings-hint">
                  Specify any valid IPTV m3u stream URL or choose from the curated presets below.
                </p>
                <div className="settings-input-group" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://.../playlist.m3u"
                    className="tokerian-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveAndLoad}
                    className="tokerian-btn tokerian-btn-primary"
                  >
                    Load
                  </button>
                </div>
              </div>

              {/* Presets */}
              <div className="settings-section">
                <label className="settings-label">
                  <Globe size={16} /> Curated Global Presets
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginTop: '8px' }}>
                  {IPTV_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.url)}
                      className="tokerian-btn"
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        textAlign: 'left',
                        background: 'rgba(255, 255, 255, 0.03)',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{preset.title}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Channels per page & TV Mode */}
              <div className="settings-section settings-row-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label className="settings-label">
                    <Tv size={16} /> Android TV Leanback Mode
                  </label>
                  <p className="settings-hint">Enlarges focus rings for D-Pad remotes.</p>
                  <label className="toggle-switch" style={{ marginTop: '8px' }}>
                    <input
                      type="checkbox"
                      checked={tvMode}
                      onChange={(e) => updateSettings({ tvMode: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div>
                  <label className="settings-label">
                    <Trash2 size={16} /> Playlist Cache
                  </label>
                  <p className="settings-hint">Free up IndexedDB cached channels.</p>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="tokerian-btn"
                    style={{ marginTop: '8px' }}
                  >
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLAYBACK */}
          {activeTab === 'playback' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="settings-section">
                <label className="settings-label">
                  <Shield size={16} /> CORS Proxy Mode (Web Browser)
                </label>
                <p className="settings-hint">
                  Routes streams through a proxy server to bypass browser CORS headers on web browsers. (Not required in Electron Desktop).
                </p>
                <label className="toggle-switch" style={{ marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    checked={corsProxyEnabled}
                    onChange={(e) => updateSettings({ corsProxyEnabled: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>

                {corsProxyEnabled && (
                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="text"
                      value={proxyUrl}
                      onChange={(e) => setProxyUrl(e.target.value)}
                      placeholder="https://corsproxy.io/?url="
                      className="tokerian-input"
                    />
                  </div>
                )}
              </div>

              <div className="settings-section">
                <label className="settings-label">
                  <RotateCcw size={16} /> Auto-Skip On Stream Error
                </label>
                <p className="settings-hint">
                  Automatically zaps to the next channel in queue when a stream encounters an offline HTTP 404 response.
                </p>
                <label className="toggle-switch" style={{ marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    checked={autoPlayNextOnError}
                    onChange={(e) => updateSettings({ autoPlayNextOnError: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="settings-section">
                <label className="settings-label">
                  <Layers size={16} /> HLS Live Buffer Depth ({bufferLength}s)
                </label>
                <p className="settings-hint">
                  Controls how many seconds of live video stream are buffered ahead of time to prevent stuttering on slower connections.
                </p>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={bufferLength}
                  onChange={(e) => updateSettings({ bufferLength: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: '10px' }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: EXTERNAL PLAYERS */}
          {activeTab === 'external' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                    Desktop Players (VLC & MPV)
                  </h4>
                  <p className="settings-hint" style={{ margin: '4px 0 0' }}>
                    Zero-copy hardware decoding, AC3/EAC3 audio codecs, and full MPEG-TS support.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    ExternalPlayerService.checkInstalled({ vlc: vlcPathInput, mpv: mpvPathInput }).then((res) => {
                      setDetectedPlayers(res);
                    });
                  }}
                  className="tokerian-btn"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <RotateCcw size={14} /> Re-scan
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* VLC */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${detectedPlayers.vlc ? 'rgba(34, 197, 94, 0.4)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#fff' }}>VLC Media Player</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: detectedPlayers.vlc ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: detectedPlayers.vlc ? '#4ade80' : '#f87171',
                      }}
                    >
                      {detectedPlayers.vlc ? 'Detected' : 'Not Found'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={vlcPathInput}
                    onChange={(e) => {
                      setVlcPathInput(e.target.value);
                      updateSettings({ customVlcPath: e.target.value });
                    }}
                    placeholder="Custom VLC path (e.g. C:\...\vlc.exe)"
                    className="tokerian-input"
                    style={{ marginTop: '10px', fontSize: '0.8rem' }}
                  />
                </div>

                {/* MPV */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${detectedPlayers.mpv ? 'rgba(34, 197, 94, 0.4)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#fff' }}>MPV Player</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: detectedPlayers.mpv ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: detectedPlayers.mpv ? '#4ade80' : '#f87171',
                      }}
                    >
                      {detectedPlayers.mpv ? 'Detected' : 'Not Found'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={mpvPathInput}
                    onChange={(e) => {
                      setMpvPathInput(e.target.value);
                      updateSettings({ customMpvPath: e.target.value });
                    }}
                    placeholder="Custom MPV path (e.g. C:\...\mpv.exe)"
                    className="tokerian-input"
                    style={{ marginTop: '10px', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label className="settings-label">Preferred External Player</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {(['vlc', 'mpv'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => updateSettings({ defaultExternalPlayer: p })}
                      className={`tokerian-btn ${defaultExternalPlayer === p ? 'tokerian-btn-primary' : ''}`}
                      style={{ padding: '6px 18px', textTransform: 'uppercase', fontSize: '0.82rem' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TITLE CLEANER */}
          {activeTab === 'titles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  Country & Provider Prefix Sanitizer
                </h4>
                <p className="settings-hint" style={{ margin: '4px 0 0' }}>
                  Strips noisy tags such as <code>US - </code>, <code>UK | </code>, <code>IN: </code>, <code>[FHD]</code>, and <code>(4K)</code> from channel and VOD names.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>Enable Title Sanitizer</span>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Cleans channel card titles throughout the entire application.
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={cleanChannelTitles}
                    onChange={(e) => updateSettings({ cleanChannelTitles: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Interactive Sanitizer Preview */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                  Live Sanitizer Preview
                </span>
                <div style={{ marginTop: '10px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Test Input String:</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="tokerian-input"
                    style={{ marginTop: '4px', fontSize: '0.82rem' }}
                  />
                </div>

                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Resulting Title:</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4ade80' }}>
                    "{ChannelSanitizer.cleanTitle(testTitle)}"
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PARENTAL LOCK */}
          {activeTab === 'parental' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  Parental Lock (4 to 8 Digit PIN)
                </h4>
                <p className="settings-hint" style={{ margin: '4px 0 0' }}>
                  Protects adult, mature, and sensitive content categories from unauthorized viewing.
                </p>
              </div>

              {pinMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: pinMessage.includes('successful') || pinMessage.includes('unlocked')
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                    color: pinMessage.includes('successful') || pinMessage.includes('unlocked') ? '#4ade80' : '#f87171',
                    fontSize: '0.85rem',
                  }}
                >
                  {pinMessage}
                </div>
              )}

              {/* Status Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isSessionUnlocked ? (
                    <Unlock size={24} color="#facc15" />
                  ) : (
                    <Lock size={24} color="var(--accent-primary)" />
                  )}
                  <div>
                    <span style={{ fontWeight: 700, color: '#fff' }}>
                      {parentalLockEnabled ? (isSessionUnlocked ? 'Session Unlocked' : 'Lock Active') : 'Parental Lock Disabled'}
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {parentalLockEnabled
                        ? (isSessionUnlocked ? 'Adult channels temporarily visible.' : 'Restricted content hidden.')
                        : 'Configure a PIN below to hide adult content.'}
                    </p>
                  </div>
                </div>

                {parentalLockEnabled && (
                  <div>
                    {isSessionUnlocked ? (
                      <button
                        type="button"
                        onClick={lockParentalSession}
                        className="tokerian-btn"
                        style={{ fontSize: '0.8rem', padding: '6px 14px', gap: '6px' }}
                      >
                        <Lock size={14} /> Lock Session Now
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>Enforced</span>
                    )}
                  </div>
                )}
              </div>

              {/* Unlock Session Prompt (if locked) */}
              {parentalLockEnabled && !isSessionUnlocked && (
                <form onSubmit={handleUnlockSubmit} style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
                    Unlock Adult Content for this Session
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="password"
                      maxLength={8}
                      value={unlockPinInput}
                      onChange={(e) => setUnlockPinInput(e.target.value)}
                      placeholder="Enter 4-8 digit PIN"
                      className="tokerian-input"
                      style={{ maxWidth: '200px' }}
                    />
                    <button type="submit" className="tokerian-btn tokerian-btn-primary">
                      Unlock
                    </button>
                  </div>
                </form>
              )}

              {/* Configure or Change PIN */}
              <form onSubmit={handleSetPinSubmit} style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                  {parentalLockPinHash ? 'Change Existing PIN' : 'Set New Parental Lock PIN'}
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <input
                    type="password"
                    maxLength={8}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="New PIN (4-8 digits)"
                    className="tokerian-input"
                  />
                  <input
                    type="password"
                    maxLength={8}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Confirm PIN"
                    className="tokerian-input"
                  />
                </div>
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="tokerian-btn tokerian-btn-primary">
                    <KeyRound size={15} /> Save PIN
                  </button>
                </div>
              </form>

              {/* Protected Keywords List */}
              <div>
                <label className="settings-label">Protected Keyword Filters ({lockedKeywords.length})</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {lockedKeywords.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        fontSize: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
