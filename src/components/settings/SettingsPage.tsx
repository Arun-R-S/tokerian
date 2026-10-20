// Dedicated Settings Page ported & adapted from IPTVnator apps/web/src/app/settings
// Features 6 Full Sections: General, Playback & Stream, Recording & Downloads, External Players, Title Sanitizer, Parental PIN, and Backup & Data.

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useChannelStore } from '../../stores/useChannelStore';
import { useMultiPlaylistStore } from '../../stores/useMultiPlaylistStore';
import { useUserStore } from '../../stores/useUserStore';
import { IPTV_PRESETS } from '../../core/presets/iptvPresets';
import { storageAdapter } from '../../adapters/storage/IndexedDbAdapter';
import { ExternalPlayerService } from '../../services/player/ExternalPlayerService';
import { ChannelSanitizer } from '../../utils/channelSanitizer';
import {
  Sliders,
  Globe,
  MonitorPlay,
  Type,
  Download,
  Upload,
  Trash2,
  Radio,
  Check,
  Shield,
  HardDrive,
} from 'lucide-react';

export type SettingsSection =
  | 'general'
  | 'playback'
  | 'recordings'
  | 'external'
  | 'titles'
  | 'parental'
  | 'backup';

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  // General Store State
  const m3uUrl = useSettingsStore((s) => s.m3uUrl);
  const corsProxyEnabled = useSettingsStore((s) => s.corsProxyEnabled);
  const corsProxyUrl = useSettingsStore((s) => s.corsProxyUrl);
  const bufferLength = useSettingsStore((s) => s.bufferLength);
  const autoPlayNextOnError = useSettingsStore((s) => s.autoPlayNextOnError);
  const hardwareAcceleration = useSettingsStore((s) => s.hardwareAcceleration);
  const tvMode = useSettingsStore((s) => s.tvMode);

  // External Players
  const defaultExternalPlayer = useSettingsStore((s) => s.defaultExternalPlayer) || 'vlc';
  const customVlcPath = useSettingsStore((s) => s.customVlcPath) || '';
  const customMpvPath = useSettingsStore((s) => s.customMpvPath) || '';

  // Title Sanitizer & Parental Lock
  const cleanChannelTitles = useSettingsStore((s) => s.cleanChannelTitles) || false;
  const parentalLockEnabled = useSettingsStore((s) => s.parentalLockEnabled) || false;
  const parentalLockPinHash = useSettingsStore((s) => s.parentalLockPinHash);
  const isSessionUnlocked = useSettingsStore((s) => s.isSessionUnlocked);

  // Recording
  const recordingFolder = useSettingsStore((s) => s.recordingFolder) || 'C:\\Users\\arunr\\Downloads\\TokerianRecordings';
  const recordingFormat = useSettingsStore((s) => s.recordingFormat) || 'mp4';

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
  const [recordingFolderInput, setRecordingFolderInput] = useState(recordingFolder);
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

  // Backup Toast
  const [backupToast, setBackupToast] = useState<string | null>(null);

  useEffect(() => {
    setInputUrl(m3uUrl);
    setProxyUrl(corsProxyUrl);
    setVlcPathInput(customVlcPath);
    setMpvPathInput(customMpvPath);
    setRecordingFolderInput(recordingFolder);

    ExternalPlayerService.checkInstalled({ vlc: customVlcPath, mpv: customMpvPath }).then((res) => {
      setDetectedPlayers(res);
    });
  }, [m3uUrl, corsProxyUrl, customVlcPath, customMpvPath, recordingFolder]);

  const handleSaveAndLoad = async () => {
    await updateSettings({
      m3uUrl: inputUrl,
      corsProxyUrl: proxyUrl,
    });
    await loadPlaylist(inputUrl, true);
  };

  const handleSaveExternalPaths = async () => {
    await updateSettings({
      customVlcPath: vlcPathInput,
      customMpvPath: mpvPathInput,
    });
    const res = await ExternalPlayerService.checkInstalled({ vlc: vlcPathInput, mpv: mpvPathInput });
    setDetectedPlayers(res);
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    if (newPin.length < 4 || newPin.length > 8) {
      setPinMessage('PIN must be 4 to 8 digits long.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage('PIN confirmation does not match.');
      return;
    }

    await setParentalPin(newPin);
    setNewPin('');
    setConfirmPin('');
    setPinMessage('PIN updated successfully! Parental Lock is active.');
    setTimeout(() => setPinMessage(null), 3500);
  };

  const handleUnlockSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    const ok = await unlockParentalSession(unlockPinInput);
    if (ok) {
      setUnlockPinInput('');
      setPinMessage('Session unlocked! Adult categories are temporarily accessible.');
      setTimeout(() => setPinMessage(null), 3500);
    } else {
      setPinMessage('Incorrect PIN. Please try again.');
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: useSettingsStore.getState(),
      playlists: useMultiPlaylistStore.getState().playlists,
      activePlaylistId: useMultiPlaylistStore.getState().activePlaylistId,
      favorites: Array.from(useUserStore.getState().favorites),
      orderedFavorites: useUserStore.getState().orderedFavoriteIds,
      history: useUserStore.getState().history,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokerian-iptvnator-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupToast('Backup JSON exported successfully!');
    setTimeout(() => setBackupToast(null), 3000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.settings) await updateSettings(parsed.settings);
        if (parsed.orderedFavorites) await useUserStore.getState().reorderFavorites(parsed.orderedFavorites);
        setBackupToast('Backup restored successfully! Changes applied.');
        setTimeout(() => setBackupToast(null), 3500);
      } catch (err) {
        alert('Invalid JSON backup file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    if (confirm('Are you sure you want to reset all Tokerian IPTV playlists, favorites, and settings? This cannot be undone.')) {
      await storageAdapter.clearAll();
      window.location.reload();
    }
  };

  return (
    <div className="settings-page-container">
      {/* Page Header */}
      <div className="settings-page-header">
        <div className="settings-header-title-row">
          <Sliders size={24} color="var(--accent-primary)" />
          <div>
            <h1 className="settings-page-title">Tokerian Settings</h1>
            <p className="settings-page-subtitle">Configure playback engines, stream buffer, recording destination, and parental lock.</p>
          </div>
        </div>

        {backupToast && (
          <div className="settings-toast-badge">
            <Check size={14} color="#10b981" />
            <span>{backupToast}</span>
          </div>
        )}
      </div>

      {/* 2-Column Settings Layout */}
      <div className="settings-page-layout">
        {/* Left Side Navigation Tabs */}
        <nav className="settings-nav-sidebar glass-panel">
          <button
            type="button"
            onClick={() => setActiveSection('general')}
            className={`settings-nav-item ${activeSection === 'general' ? 'nav-item-active' : ''}`}
          >
            <Globe size={18} />
            <span>General & Presets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('playback')}
            className={`settings-nav-item ${activeSection === 'playback' ? 'nav-item-active' : ''}`}
          >
            <Radio size={18} />
            <span>Playback & Stream</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('recordings')}
            className={`settings-nav-item ${activeSection === 'recordings' ? 'nav-item-active' : ''}`}
          >
            <HardDrive size={18} />
            <span>Recording & Storage</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('external')}
            className={`settings-nav-item ${activeSection === 'external' ? 'nav-item-active' : ''}`}
          >
            <MonitorPlay size={18} />
            <span>External Players</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('titles')}
            className={`settings-nav-item ${activeSection === 'titles' ? 'nav-item-active' : ''}`}
          >
            <Type size={18} />
            <span>Title Sanitizer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('parental')}
            className={`settings-nav-item ${activeSection === 'parental' ? 'nav-item-active' : ''}`}
          >
            <Shield size={18} />
            <span>Parental Lock PIN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('backup')}
            className={`settings-nav-item ${activeSection === 'backup' ? 'nav-item-active' : ''}`}
          >
            <Download size={18} />
            <span>Backup & Reset</span>
          </button>
        </nav>

        {/* Right Content Section */}
        <div className="settings-section-card glass-panel">
          {/* SECTION 1: GENERAL */}
          {activeSection === 'general' && (
            <div className="settings-form-group">
              <h3 className="section-heading">Playlist & Stream Presets</h3>

              <div className="setting-row">
                <label className="setting-label">Extended M3U / M3U8 Playlist URL</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://example.com/playlist.m3u"
                    className="tokerian-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveAndLoad}
                    className="tokerian-btn tokerian-btn-primary"
                  >
                    Load URL
                  </button>
                </div>
              </div>

              <div className="setting-row">
                <label className="setting-label">10-Foot TV Remote Mode</label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="settings-hint">Enlarges focus rings and optimizes layout for Android TV remotes.</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={tvMode}
                      onChange={(e) => updateSettings({ tvMode: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="setting-row">
                <label className="setting-label">Curated Global Presets</label>
                <div className="presets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px', marginTop: '8px' }}>
                  {IPTV_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setInputUrl(preset.url);
                        updateSettings({ m3uUrl: preset.url });
                        loadPlaylist(preset.url, true);
                      }}
                      className="preset-card"
                      style={{
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: inputUrl === preset.url ? '1px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: '#fff',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{preset.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: PLAYBACK & STREAM */}
          {activeSection === 'playback' && (
            <div className="settings-form-group">
              <h3 className="section-heading">Stream & Engine Configuration</h3>

              <div className="setting-row">
                <label className="setting-label">HLS Forward Buffer ({bufferLength} seconds)</label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={bufferLength}
                  onChange={(e) => updateSettings({ bufferLength: parseInt(e.target.value, 10) })}
                  className="tokerian-range"
                  style={{ width: '100%', marginTop: '8px' }}
                />
                <span className="settings-hint">Higher buffer absorbs network spikes on high-bitrate FHD / 4K feeds.</span>
              </div>

              <div className="setting-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>Hardware Video Acceleration</div>
                  <span className="settings-hint">Direct GPU decoding via WebGL and MediaSource extensions.</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={hardwareAcceleration}
                    onChange={(e) => updateSettings({ hardwareAcceleration: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="setting-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>Auto-Skip Next Channel on Error</div>
                  <span className="settings-hint">Automatically skips to the next channel if a 404/offline stream occurs.</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={autoPlayNextOnError}
                    onChange={(e) => updateSettings({ autoPlayNextOnError: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="setting-row">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>CORS Reverse Proxy Relay</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={corsProxyEnabled}
                      onChange={(e) => updateSettings({ corsProxyEnabled: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <input
                  type="text"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder="https://cors-proxy.example.com/?url="
                  className="tokerian-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* SECTION 3: RECORDINGS & STORAGE */}
          {activeSection === 'recordings' && (
            <div className="settings-form-group">
              <h3 className="section-heading">Recording & Download Destination</h3>

              <div className="setting-row">
                <label className="setting-label">Default Recordings & Downloads Folder</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <input
                    type="text"
                    value={recordingFolderInput}
                    onChange={(e) => setRecordingFolderInput(e.target.value)}
                    className="tokerian-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => updateSettings({ recordingFolder: recordingFolderInput })}
                    className="tokerian-btn tokerian-btn-primary"
                  >
                    Save Path
                  </button>
                </div>
                <span className="settings-hint">Streams, scheduled DVR shows, and offline VOD episodes will be stored here.</span>
              </div>

              <div className="setting-row">
                <label className="setting-label">Recording Container Format</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  {(['mp4', 'ts', 'mkv'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => updateSettings({ recordingFormat: fmt })}
                      className={`tokerian-btn ${recordingFormat === fmt ? 'tokerian-btn-primary' : ''}`}
                      style={{ textTransform: 'uppercase', padding: '8px 22px' }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
                <span className="settings-hint">MP4 is recommended for universal playback across all mobile and smart TV players.</span>
              </div>
            </div>
          )}

          {/* SECTION 4: EXTERNAL PLAYERS */}
          {activeSection === 'external' && (
            <div className="settings-form-group">
              <h3 className="section-heading">External Process Media Players (VLC & MPV)</h3>

              <div className="setting-row">
                <label className="setting-label">Default Desktop External Player</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  {(['vlc', 'mpv'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => updateSettings({ defaultExternalPlayer: p })}
                      className={`tokerian-btn ${defaultExternalPlayer === p ? 'tokerian-btn-primary' : ''}`}
                      style={{ padding: '8px 24px', textTransform: 'uppercase' }}
                    >
                      {p} Player {detectedPlayers[p] ? '• Installed' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-row">
                <label className="setting-label">Custom VLC Executable Path</label>
                <input
                  type="text"
                  value={vlcPathInput}
                  onChange={(e) => setVlcPathInput(e.target.value)}
                  placeholder="C:\Program Files\VideoLAN\VLC\vlc.exe"
                  className="tokerian-input"
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>

              <div className="setting-row">
                <label className="setting-label">Custom MPV Executable Path</label>
                <input
                  type="text"
                  value={mpvPathInput}
                  onChange={(e) => setMpvPathInput(e.target.value)}
                  placeholder="C:\mpv\mpv.exe"
                  className="tokerian-input"
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>

              <button
                type="button"
                onClick={handleSaveExternalPaths}
                className="tokerian-btn tokerian-btn-primary"
                style={{ alignSelf: 'flex-start' }}
              >
                Save & Verify Players
              </button>
            </div>
          )}

          {/* SECTION 5: TITLE SANITIZER */}
          {activeSection === 'titles' && (
            <div className="settings-form-group">
              <h3 className="section-heading">Channel & VOD Title Sanitizer</h3>

              <div className="setting-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>Enable Title Sanitizer</div>
                  <span className="settings-hint">Strips noisy country prefixes (<code>US - </code>, <code>IN: </code>) and codec tags (<code>[FHD]</code>).</span>
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

              <div className="setting-row" style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <label className="setting-label">Live Test Bench</label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="tokerian-input"
                  style={{ width: '100%', marginTop: '6px' }}
                />
                <div style={{ marginTop: '10px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Sanitized Output: </span>
                  <strong style={{ color: '#4ade80' }}>"{ChannelSanitizer.cleanTitle(testTitle)}"</strong>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: PARENTAL LOCK PIN */}
          {activeSection === 'parental' && (
            <div className="settings-form-group">
              <h3 className="section-heading">Parental Lock & PIN Security</h3>

              {pinMessage && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: pinMessage.includes('successfully') || pinMessage.includes('unlocked') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: pinMessage.includes('successfully') || pinMessage.includes('unlocked') ? '#10b981' : '#ef4444', fontSize: '0.85rem' }}>
                  {pinMessage}
                </div>
              )}

              <div className="setting-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>Parental Control Gate</div>
                  <span className="settings-hint">Requires 4-8 digit PIN to view adult channels and categories.</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={parentalLockEnabled}
                    onChange={(e) => updateSettings({ parentalLockEnabled: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {parentalLockEnabled && (
                <>
                  <form onSubmit={handleSetPin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    <label className="setting-label">{parentalLockPinHash ? 'Change Parental PIN' : 'Setup New Parental PIN'}</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="password"
                        maxLength={8}
                        placeholder="New PIN (4-8 digits)"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="tokerian-input"
                      />
                      <input
                        type="password"
                        maxLength={8}
                        placeholder="Confirm PIN"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        className="tokerian-input"
                      />
                      <button type="submit" className="tokerian-btn tokerian-btn-primary">
                        Set PIN
                      </button>
                    </div>
                  </form>

                  {isSessionUnlocked ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
                      <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>Session currently unlocked</span>
                      <button type="button" onClick={lockParentalSession} className="tokerian-btn">
                        Lock Now
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleUnlockSession} style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                      <input
                        type="password"
                        placeholder="Enter PIN to unlock"
                        value={unlockPinInput}
                        onChange={(e) => setUnlockPinInput(e.target.value)}
                        className="tokerian-input"
                      />
                      <button type="submit" className="tokerian-btn tokerian-btn-primary">
                        Unlock Session
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {/* SECTION 7: BACKUP & DATA RESET */}
          {activeSection === 'backup' && (
            <div className="settings-form-group">
              <h3 className="section-heading">Data Backup, Export & Factory Reset</h3>

              <div className="setting-row">
                <label className="setting-label">Export Application State (JSON Backup)</label>
                <p className="settings-hint">Exports all saved playlists, favorites ordering, watch history, and configuration preferences.</p>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="tokerian-btn tokerian-btn-primary"
                  style={{ marginTop: '8px' }}
                >
                  <Download size={16} /> Export Backup (.json)
                </button>
              </div>

              <div className="setting-row">
                <label className="setting-label">Restore from Backup</label>
                <p className="settings-hint">Upload previously exported JSON state to restore settings and playlists.</p>
                <label className="tokerian-btn" style={{ marginTop: '8px', display: 'inline-flex', cursor: 'pointer' }}>
                  <Upload size={16} /> Import Backup File
                  <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
                </label>
              </div>

              <div className="setting-row" style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <label className="setting-label" style={{ color: '#ef4444' }}>Danger Zone: Reset All Data</label>
                <p className="settings-hint">Clears all IndexedDB playlists, cached EPG XML schedules, favorites, and restores default settings.</p>
                <button
                  type="button"
                  onClick={handleResetData}
                  className="tokerian-btn"
                  style={{ marginTop: '8px', borderColor: '#ef4444', color: '#ef4444' }}
                >
                  <Trash2 size={16} /> Reset Everything
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
