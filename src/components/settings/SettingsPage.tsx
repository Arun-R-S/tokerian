// Dedicated Settings Page ported
// Features all Settings Sections:
// General, Playback, EPG, Dashboard, Remote, Metadata, Parental, Backup, Reset, and About.

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useChannelStore } from '../../stores/useChannelStore';
import { useMultiPlaylistStore } from '../../stores/useMultiPlaylistStore';
import { useUserStore } from '../../stores/useUserStore';
import { IPTV_PRESETS } from '../../core/presets/iptvPresets';
import { storageAdapter } from '../../adapters/storage/IndexedDbAdapter';
import { ExternalPlayerService } from '../../services/player/ExternalPlayerService';
import {
  Globe,
  Tv,
  Download,
  Trash2,
  ArrowLeft,
  Check,
  Upload,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { MatIcon } from '../common/MatIcon';
import { AppVersionBadge } from '../common/AppVersionBadge';
import {
  APP_CONFIG,
  getStageMeta,
  getAppVersion,
  getBuildEnvironment,
} from '../../config/appInfo';

export type SettingsSection =
  | 'general'
  | 'playback'
  | 'epg'
  | 'dashboard'
  | 'remote'
  | 'metadata'
  | 'parental'
  | 'backup'
  | 'reset'
  | 'about';

interface SettingsPageProps {
  onBack?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  // Settings State from Store
  const settings = useSettingsStore();
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const unlockParentalSession = useSettingsStore((s) => s.unlockParentalSession);
  const lockParentalSession = useSettingsStore((s) => s.lockParentalSession);
  const setParentalPin = useSettingsStore((s) => s.setParentalPin);
  const loadPlaylist = useChannelStore((s) => s.loadPlaylist);

  // Form State
  const [inputUrl, setInputUrl] = useState(settings.m3uUrl);
  const [proxyUrl, setProxyUrl] = useState(settings.corsProxyUrl);
  const [vlcPathInput, setVlcPathInput] = useState(settings.customVlcPath || '');
  const [mpvPathInput, setMpvPathInput] = useState(settings.customMpvPath || '');
  const [vlcArgsInput, setVlcArgsInput] = useState(settings.vlcPlayerArguments || '');
  const [mpvArgsInput, setMpvArgsInput] = useState(settings.mpvPlayerArguments || '');
  const [tmdbKeyInput, setTmdbKeyInput] = useState(settings.tmdbApiKey || '');
  const [detectedPlayers, setDetectedPlayers] = useState<{ vlc: boolean; mpv: boolean; platform?: string }>({
    vlc: false,
    mpv: false,
  });

  // Parental PIN form
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    setInputUrl(settings.m3uUrl);
    setProxyUrl(settings.corsProxyUrl);
    setVlcPathInput(settings.customVlcPath || '');
    setMpvPathInput(settings.customMpvPath || '');
    setVlcArgsInput(settings.vlcPlayerArguments || '');
    setMpvArgsInput(settings.mpvPlayerArguments || '');
    setTmdbKeyInput(settings.tmdbApiKey || '');

    ExternalPlayerService.checkInstalled({
      vlc: settings.customVlcPath,
      mpv: settings.customMpvPath,
    }).then((res) => {
      setDetectedPlayers(res);
    });
  }, [settings]);

  const handleSaveAndLoad = async () => {
    await updateSettings({
      m3uUrl: inputUrl,
      corsProxyUrl: proxyUrl,
    });
    await loadPlaylist(inputUrl, true);
    showToast('Playlist loaded successfully');
  };

  const handleSaveExternalPaths = async () => {
    await updateSettings({
      customVlcPath: vlcPathInput,
      customMpvPath: mpvPathInput,
      vlcPlayerArguments: vlcArgsInput,
      mpvPlayerArguments: mpvArgsInput,
    });
    const res = await ExternalPlayerService.checkInstalled({ vlc: vlcPathInput, mpv: mpvPathInput });
    setDetectedPlayers(res);
    showToast('External player configuration saved');
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4 || newPin.length > 8) {
      setPinMessage('PIN must be 4 to 8 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage('PINs do not match');
      return;
    }
    await setParentalPin(newPin);
    setNewPin('');
    setConfirmPin('');
    setPinMessage('PIN successfully configured!');
    setTimeout(() => setPinMessage(null), 3000);
  };

  const handleUnlockSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await unlockParentalSession(unlockPinInput);
    if (ok) {
      setUnlockPinInput('');
      setPinMessage('Session unlocked successfully');
      setTimeout(() => setPinMessage(null), 3000);
    } else {
      setPinMessage('Incorrect PIN. Please try again.');
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      playlists: useMultiPlaylistStore.getState().playlists,
      activePlaylistId: useMultiPlaylistStore.getState().activePlaylistId,
      favorites: Array.from(useUserStore.getState().favorites),
      orderedFavoriteIds: useUserStore.getState().orderedFavoriteIds,
      history: useUserStore.getState().history,
      settings: useSettingsStore.getState(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokerian-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup JSON exported successfully');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (parsed.playlists && Array.isArray(parsed.playlists)) {
          useMultiPlaylistStore.setState({
            playlists: parsed.playlists,
            activePlaylistId: parsed.activePlaylistId || parsed.playlists[0]?.id || 'built-in',
          });
        }
        if (parsed.favorites && Array.isArray(parsed.favorites)) {
          useUserStore.setState({
            favorites: new Set(parsed.favorites),
            orderedFavoriteIds: parsed.orderedFavoriteIds || parsed.favorites,
          });
        }
        if (parsed.history && Array.isArray(parsed.history)) {
          useUserStore.setState({ history: parsed.history });
        }
        if (parsed.settings && typeof parsed.settings === 'object') {
          await updateSettings(parsed.settings);
        }

        showToast('Backup restored successfully');
      } catch (err) {
        alert('Invalid JSON backup file format');
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = async () => {
    if (confirm('Are you sure you want to reset all Tokerian data, channels, and settings to factory defaults?')) {
      if (storageAdapter.clearAll) {
        await storageAdapter.clearAll();
      }
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="settings-page-container">
      {/* Settings Header */}
      <div className="settings-page-header">
        <div className="settings-header-title-row">
          <div className="settings-header-icon-box">
            <Globe size={22} />
          </div>
          <div>
            <h1 className="settings-page-title">Settings</h1>
            <p className="settings-page-subtitle">Change the configuration of the application</p>
          </div>
        </div>

        {toastMessage && (
          <div className="settings-toast-badge">
            <Check size={14} color="#10b981" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* 2-Column Settings Layout (Sidebar Navigation + Content Area) */}
      <div className="settings-page-layout">
        {/* Left Sub-Navigation (Exact Menu List) */}
        <nav className="settings-nav-sidebar">
          <h2 className="settings-nav-title">Settings</h2>

          <button
            type="button"
            onClick={() => setActiveSection('general')}
            className={`settings-nav-item ${activeSection === 'general' ? 'nav-item-active' : ''}`}
          >
            <MatIcon name="tune" size={19} />
            <span>General</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('playback')}
            className={`settings-nav-item ${activeSection === 'playback' ? 'nav-item-active' : ''}`}
          >
            <MatIcon name="play_circle" size={19} />
            <span>Playback</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('epg')}
            className={`settings-nav-item ${activeSection === 'epg' ? 'nav-item-active' : ''}`}
          >
            <MatIcon name="calendar_month" size={19} />
            <span>EPG</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('dashboard')}
            className={`settings-nav-item ${activeSection === 'dashboard' ? 'nav-item-active' : ''}`}
          >
            <MatIcon name="dashboard" size={19} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('remote')}
            className={`settings-nav-item ${activeSection === 'remote' ? 'nav-item-active' : ''}`}
          >
            <MatIcon name="smartphone" size={19} />
            <span>Remote</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('metadata')}
            className={`settings-nav-item ${activeSection === 'metadata' ? 'nav-item-active' : ''}`}
          >
            <MatIcon name="movie" size={19} />
            <span>Metadata</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('parental')}
            className={`settings-nav-item ${activeSection === 'parental' ? 'nav-item-active' : ''}`}
          >
            <MatIcon name="family_restroom" size={19} />
            <span>Parental Lock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('backup')}
            className={`settings-nav-item ${activeSection === 'backup' ? 'nav-item-active' : ''}`}
          >
            <MatIcon name="backup" size={19} />
            <span>Backup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('reset')}
            className={`settings-nav-item ${activeSection === 'reset' ? 'nav-item-active' : ''}`}
          >
            <MatIcon name="delete" size={19} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('about')}
            className={`settings-nav-item ${activeSection === 'about' ? 'nav-item-active' : ''}`}
          >
            <MatIcon name="info" size={19} />
            <span>About</span>
          </button>

          {/* Bottom Back Button matching Screenshot */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="settings-sidebar-back-btn"
              title="Return to previous screen"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          )}
        </nav>

        {/* Right Content Section */}
        <div className="settings-section-card glass-panel">
          {/* =========================================================================
             SECTION 1: GENERAL (Screenshot Match)
             ========================================================================= */}
          {activeSection === 'general' && (
            <div className="settings-form-group">
              <div className="section-title-wrap">
                <h2 className="section-main-title">General</h2>
                <p className="section-main-subtitle">Change the configuration of the application</p>
              </div>

              {/* Language */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Language</label>
                  <p className="field-desc">Select language of the application</p>
                </div>
                <div className="field-control">
                  <select
                    value={settings.language || 'English'}
                    onChange={(e) => updateSettings({ language: e.target.value })}
                    className="tokerian-select"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Español (Spanish)</option>
                    <option value="German">Deutsch (German)</option>
                    <option value="French">Français (French)</option>
                    <option value="Italian">Italiano (Italian)</option>
                    <option value="Russian">Русский (Russian)</option>
                    <option value="Tamil">தமிழ் (Tamil)</option>
                    <option value="Hindi">हिन्दी (Hindi)</option>
                    <option value="Chinese">中文 (Chinese)</option>
                  </select>
                </div>
              </div>

              {/* Visual Theme */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Visual theme</label>
                  <p className="field-desc">Select visual theme of the application</p>
                </div>
                <div className="field-control">
                  <div className="segmented-btn-group">
                    <button
                      type="button"
                      onClick={() => updateSettings({ visualTheme: 'light' })}
                      className={`segmented-btn ${(settings.visualTheme || 'dark') === 'light' ? 'segmented-active' : ''}`}
                    >
                      <Sun size={14} /> Light
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSettings({ visualTheme: 'dark' })}
                      className={`segmented-btn ${(settings.visualTheme || 'dark') === 'dark' ? 'segmented-active' : ''}`}
                    >
                      <Moon size={14} /> Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSettings({ visualTheme: 'system' })}
                      className={`segmented-btn ${(settings.visualTheme || 'dark') === 'system' ? 'segmented-active' : ''}`}
                    >
                      <Monitor size={14} /> System
                    </button>
                  </div>
                </div>
              </div>

              {/* Cover size */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Cover size</label>
                  <p className="field-desc">
                    Adjust the size of poster cards across grids and rails. Larger sizes are easier to see on TVs; smaller sizes show more content per row on big monitors.
                  </p>
                </div>
                <div className="field-control">
                  <div className="segmented-btn-group">
                    {(['small', 'medium', 'large'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => updateSettings({ coverSize: sz })}
                        className={`segmented-btn ${(settings.coverSize || 'medium') === sz ? 'segmented-active' : ''}`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Show titles under covers */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Show titles under covers</label>
                  <p className="field-desc">
                    Turn off for a posters-only wall in movie and series grids: the title appears on the cover when you point at it or focus it. Live channels, search results and dashboard rails keep their labels.
                  </p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.showCoverTitles !== false}
                      onChange={(e) => updateSettings({ showCoverTitles: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              {/* Startup view */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Startup view</label>
                  <p className="field-desc">
                    Choose whether opens the first available workspace view or restores your last section-level view. First view means Dashboard when enabled, otherwise Sources.
                  </p>
                </div>
                <div className="field-control">
                  <select
                    value={settings.startupView || 'first'}
                    onChange={(e) => updateSettings({ startupView: e.target.value as any })}
                    className="tokerian-select"
                  >
                    <option value="first">First available view</option>
                    <option value="dashboard">Dashboard</option>
                    <option value="channels">Channels</option>
                    <option value="sources">Sources / Playlists</option>
                  </select>
                </div>
              </div>

              {/* Window on startup (Desktop only) */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Window on startup</label>
                  <p className="field-desc">
                    Choose how the desktop window opens: at its last size, maximized, or fullscreen. Applies on the next launch. Press F11 at any time to enter or leave fullscreen.
                  </p>
                </div>
                <div className="field-control">
                  <select
                    value={settings.startupWindowMode || 'normal'}
                    onChange={(e) => updateSettings({ startupWindowMode: e.target.value as any })}
                    className="tokerian-select"
                  >
                    <option value="normal">Last window size</option>
                    <option value="maximized">Maximized</option>
                    <option value="fullscreen">Fullscreen</option>
                  </select>
                </div>
              </div>

              {/* Extended M3U Playlist & Global Presets */}
              <div className="setting-sub-section">
                <h3 className="sub-section-title">Playlist URL & Curated Presets</h3>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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

                <div className="presets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginTop: '14px' }}>
                  {IPTV_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setInputUrl(preset.url);
                        updateSettings({ m3uUrl: preset.url });
                        loadPlaylist(preset.url, true);
                        showToast(`Loaded ${preset.title}`);
                      }}
                      className="preset-card"
                      style={{
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.03)',
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

          {/* =========================================================================
             SECTION 2: PLAYBACK (Complete Engine Options)
             ========================================================================= */}
          {activeSection === 'playback' && (
            <div className="settings-form-group">
              <div className="section-title-wrap">
                <h2 className="section-main-title">Playback</h2>
                <p className="section-main-subtitle">Configure stream decoding, forward buffer, and player engines</p>
              </div>

              {/* HLS Buffer */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Forward Buffer ({settings.bufferLength || 30} seconds)</label>
                  <p className="field-desc">Higher buffer length prevents stuttering on high-bitrate FHD / 4K streams.</p>
                </div>
                <div className="field-control" style={{ maxWidth: '280px' }}>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={settings.bufferLength || 30}
                    onChange={(e) => updateSettings({ bufferLength: parseInt(e.target.value, 10) })}
                    className="tokerian-range"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Hardware Acceleration */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Hardware Video Acceleration</label>
                  <p className="field-desc">Direct GPU hardware video decoding via WebGL and MediaSource extensions.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.hardwareAcceleration !== false}
                      onChange={(e) => updateSettings({ hardwareAcceleration: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              {/* Auto Skip on Error */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Auto-Skip Next Channel on Error</label>
                  <p className="field-desc">Automatically switch to the next channel in list if a stream fails or 404s.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.autoPlayNextOnError !== false}
                      onChange={(e) => updateSettings({ autoPlayNextOnError: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              {/* Fullscreen Channel Panel */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Fullscreen Channel Panel</label>
                  <p className="field-desc">Allow opening the quick zap drawer and channel switcher while in cinema fullscreen.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.fullscreenChannelPanel !== false}
                      onChange={(e) => updateSettings({ fullscreenChannelPanel: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              {/* VOD Auto-Failover */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">VOD Auto-Failover</label>
                  <p className="field-desc">
                    When a movie fails to play and the same film exists in another imported playlist, switch to it automatically instead of showing error.
                  </p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.vodAutoFailover || false}
                      onChange={(e) => updateSettings({ vodAutoFailover: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              {/* Strip Country Prefix */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Strip Country Prefixes</label>
                  <p className="field-desc">Removes tags like "US | " or "UK - " or "[FHD]" from channel titles for a clean look.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.stripCountryPrefix !== false}
                      onChange={(e) => updateSettings({ stripCountryPrefix: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              {/* CORS Proxy */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">CORS Reverse Proxy Relay</label>
                  <p className="field-desc">Bypasses browser cross-origin blocks on raw HTTP stream manifests.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.corsProxyEnabled}
                      onChange={(e) => updateSettings({ corsProxyEnabled: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              {/* External Media Players (VLC / MPV) */}
              <div className="setting-sub-section">
                <h3 className="sub-section-title">External Desktop Players (VLC & MPV)</h3>

                <div className="setting-field-row" style={{ marginTop: '12px' }}>
                  <div className="field-meta">
                    <label className="field-title">Default External Player</label>
                    <p className="field-desc">Choose which desktop engine to launch when clicking External Player.</p>
                  </div>
                  <div className="field-control">
                    <div className="segmented-btn-group">
                      <button
                        type="button"
                        onClick={() => updateSettings({ defaultExternalPlayer: 'vlc' })}
                        className={`segmented-btn ${(settings.defaultExternalPlayer || 'vlc') === 'vlc' ? 'segmented-active' : ''}`}
                      >
                        VLC {detectedPlayers.vlc ? '• Detected' : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSettings({ defaultExternalPlayer: 'mpv' })}
                        className={`segmented-btn ${(settings.defaultExternalPlayer || 'vlc') === 'mpv' ? 'segmented-active' : ''}`}
                      >
                        MPV {detectedPlayers.mpv ? '• Detected' : ''}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <label className="field-title" style={{ fontSize: '0.82rem' }}>Custom VLC Executable Path</label>
                    <input
                      type="text"
                      value={vlcPathInput}
                      onChange={(e) => setVlcPathInput(e.target.value)}
                      placeholder="C:\Program Files\VideoLAN\VLC\vlc.exe"
                      className="tokerian-input"
                      style={{ width: '100%', marginTop: '6px' }}
                    />
                  </div>
                  <div>
                    <label className="field-title" style={{ fontSize: '0.82rem' }}>Custom MPV Executable Path</label>
                    <input
                      type="text"
                      value={mpvPathInput}
                      onChange={(e) => setMpvPathInput(e.target.value)}
                      placeholder="C:\mpv\mpv.exe"
                      className="tokerian-input"
                      style={{ width: '100%', marginTop: '6px' }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveExternalPaths}
                  className="tokerian-btn tokerian-btn-primary"
                  style={{ marginTop: '12px', alignSelf: 'flex-start' }}
                >
                  Save & Verify Player Paths
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
             SECTION 3: EPG (EPG Configuration)
             ========================================================================= */}
          {activeSection === 'epg' && (
            <div className="settings-form-group">
              <div className="section-title-wrap">
                <h2 className="section-main-title">Electronic Program Guide (EPG)</h2>
                <p className="section-main-subtitle">Manage TV guide sources, timezone offsets, and timeline presentation</p>
              </div>

              {/* EPG View Mode */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">EPG Layout View Mode</label>
                  <p className="field-desc">Choose between a multi-channel horizontal broadcast matrix or vertical schedule.</p>
                </div>
                <div className="field-control">
                  <div className="segmented-btn-group">
                    <button
                      type="button"
                      onClick={() => updateSettings({ epgViewMode: 'timeline' })}
                      className={`segmented-btn ${(settings.epgViewMode || 'timeline') === 'timeline' ? 'segmented-active' : ''}`}
                    >
                      Horizontal Timeline
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSettings({ epgViewMode: 'list' })}
                      className={`segmented-btn ${(settings.epgViewMode || 'timeline') === 'list' ? 'segmented-active' : ''}`}
                    >
                      Vertical List
                    </button>
                  </div>
                </div>
              </div>

              {/* Timezone Offset */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Timezone Correction Offset ({settings.epgOffsetMinutes || 0} minutes)</label>
                  <p className="field-desc">
                    Display-only correction for guides whose providers label programme times with the wrong timezone (-720 to +720 min).
                  </p>
                </div>
                <div className="field-control" style={{ maxWidth: '280px' }}>
                  <input
                    type="range"
                    min="-720"
                    max="720"
                    step="30"
                    value={settings.epgOffsetMinutes || 0}
                    onChange={(e) => updateSettings({ epgOffsetMinutes: parseInt(e.target.value, 10) })}
                    className="tokerian-range"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Prefer XMLTV over Xtream */}
              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Prefer Uploaded XMLTV over Xtream EPG</label>
                  <p className="field-desc">When enabled, locally-parsed XMLTV files take priority over Xtream server live EPG.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.preferUploadedEpgOverXtream || false}
                      onChange={(e) => updateSettings({ preferUploadedEpgOverXtream: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
             SECTION 4: DASHBOARD (Rails Visibility)
             ========================================================================= */}
          {activeSection === 'dashboard' && (
            <div className="settings-form-group">
              <div className="section-title-wrap">
                <h2 className="section-main-title">Dashboard</h2>
                <p className="section-main-subtitle">Control which content carousels and rails are rendered on the home screen</p>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Spotlight Continue Watching Hero</label>
                  <p className="field-desc">Large top spotlight card with radial crimson glow for resuming your last broadcast.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.dashboardRails?.continueWatching !== false}
                      onChange={(e) =>
                        updateSettings({
                          dashboardRails: {
                            ...(settings.dashboardRails || { continueWatching: true, favorites: true, recent: true, sources: true }),
                            continueWatching: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Live Now on Your Favorites Rail</label>
                  <p className="field-desc">Horizontal carousel displaying live TV channels saved to your favorites.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.dashboardRails?.favorites !== false}
                      onChange={(e) =>
                        updateSettings({
                          dashboardRails: {
                            ...(settings.dashboardRails || { continueWatching: true, favorites: true, recent: true, sources: true }),
                            favorites: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Recently Watched Live TV Rail</label>
                  <p className="field-desc">Horizontal carousel displaying channel history with live broadcast intervals.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.dashboardRails?.recent !== false}
                      onChange={(e) =>
                        updateSettings({
                          dashboardRails: {
                            ...(settings.dashboardRails || { continueWatching: true, favorites: true, recent: true, sources: true }),
                            recent: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Recently Used Sources Rail</label>
                  <p className="field-desc">Quick-access source cards for switching between loaded M3U and Xtream playlists.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.dashboardRails?.sources !== false}
                      onChange={(e) =>
                        updateSettings({
                          dashboardRails: {
                            ...(settings.dashboardRails || { continueWatching: true, favorites: true, recent: true, sources: true }),
                            sources: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
             SECTION 5: REMOTE (10-Foot Leanback & Web Remote Control)
             ========================================================================= */}
          {activeSection === 'remote' && (
            <div className="settings-form-group">
              <div className="section-title-wrap">
                <h2 className="section-main-title">Remote & Android TV</h2>
                <p className="section-main-subtitle">10-foot D-Pad remote control, focus rings, and smartphone remote server</p>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">10-Foot TV Remote Navigation Mode</label>
                  <p className="field-desc">Enlarges high-contrast cyan glowing focus rings for D-Pad remotes.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.tvMode}
                      onChange={(e) => updateSettings({ tvMode: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Web Remote Control Server</label>
                  <p className="field-desc">Allows controlling playback from your phone via local Wi-Fi browser.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.remoteControl || false}
                      onChange={(e) => updateSettings({ remoteControl: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Remote Control Port</label>
                  <p className="field-desc">Local TCP port for the remote web app (default: 3000).</p>
                </div>
                <div className="field-control" style={{ maxWidth: '140px' }}>
                  <input
                    type="number"
                    value={settings.remoteControlPort || 3000}
                    onChange={(e) => updateSettings({ remoteControlPort: parseInt(e.target.value, 10) || 3000 })}
                    className="tokerian-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
             SECTION 6: METADATA (TMDB Enrichment)
             ========================================================================= */}
          {activeSection === 'metadata' && (
            <div className="settings-form-group">
              <div className="section-title-wrap">
                <h2 className="section-main-title">Metadata & TMDB</h2>
                <p className="section-main-subtitle">Poster artwork, movie plot overviews, cast, and ratings enrichment</p>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">TMDB Metadata Enrichment</label>
                  <p className="field-desc">Opt-in TMDB artwork and overview enrichment for VOD movies and series.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.tmdbEnabled || false}
                      onChange={(e) => updateSettings({ tmdbEnabled: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">TMDB API Key (v3 auth)</label>
                  <p className="field-desc">Enter your personal TMDB API key to enable high-rate metadata requests.</p>
                </div>
                <div className="field-control" style={{ maxWidth: '320px' }}>
                  <input
                    type="text"
                    value={tmdbKeyInput}
                    onChange={(e) => {
                      setTmdbKeyInput(e.target.value);
                      updateSettings({ tmdbApiKey: e.target.value });
                    }}
                    placeholder="Enter TMDB API Key..."
                    className="tokerian-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Present M3U VOD details with TMDB</label>
                  <p className="field-desc">Present recognized movie files in VOD detail modal with posters and synopsis.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.m3uVodDetails !== false}
                      onChange={(e) => updateSettings({ m3uVodDetails: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
             SECTION 7: PARENTAL LOCK (PIN Security & Auto-Relock)
             ========================================================================= */}
          {activeSection === 'parental' && (
            <div className="settings-form-group">
              <div className="section-title-wrap">
                <h2 className="section-main-title">Parental Lock PIN</h2>
                <p className="section-main-subtitle">Protect adult categories and sensitive content behind a 4–8 digit PIN</p>
              </div>

              {pinMessage && (
                <div className="settings-pin-alert">
                  {pinMessage}
                </div>
              )}

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Parental Lock Gate</label>
                  <p className="field-desc">Hides restricted channels and categories until unlocked with your PIN.</p>
                </div>
                <div className="field-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.parentalLockEnabled || false}
                      onChange={(e) => updateSettings({ parentalLockEnabled: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              {settings.parentalLockEnabled && (
                <>
                  <form onSubmit={handleSetPin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    <label className="field-title">{settings.parentalLockPinHash ? 'Change PIN' : 'Create New PIN'}</label>
                    <div style={{ display: 'flex', gap: '10px', maxWidth: '420px' }}>
                      <input
                        type="password"
                        maxLength={8}
                        placeholder="PIN (4-8 digits)"
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

                  {settings.isSessionUnlocked ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px' }}>
                      <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>• Session currently unlocked</span>
                      <button type="button" onClick={lockParentalSession} className="tokerian-btn">
                        Lock Now
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleUnlockSession} style={{ display: 'flex', gap: '10px', marginTop: '14px', maxWidth: '340px' }}>
                      <input
                        type="password"
                        placeholder="Enter PIN to unlock"
                        value={unlockPinInput}
                        onChange={(e) => setUnlockPinInput(e.target.value)}
                        className="tokerian-input"
                      />
                      <button type="submit" className="tokerian-btn tokerian-btn-primary">
                        Unlock
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {/* =========================================================================
             SECTION 8: BACKUP (JSON Export & Import)
             ========================================================================= */}
          {activeSection === 'backup' && (
            <div className="settings-form-group">
              <div className="section-title-wrap">
                <h2 className="section-main-title">Backup & Restore</h2>
                <p className="section-main-subtitle">Export or restore all playlists, favorite channel ordering, and settings</p>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Export Application State (JSON Backup)</label>
                  <p className="field-desc">Downloads a complete backup JSON containing your sources, favorites, and settings.</p>
                </div>
                <div className="field-control">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="tokerian-btn tokerian-btn-primary"
                  >
                    <Download size={16} /> Export JSON Backup
                  </button>
                </div>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Restore from Backup</label>
                  <p className="field-desc">Upload a previously exported Tokerian JSON backup file.</p>
                </div>
                <div className="field-control">
                  <label className="tokerian-btn" style={{ cursor: 'pointer' }}>
                    <Upload size={16} /> Select Backup File
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
             SECTION 9: RESET (Factory Reset & Cache Purge)
             ========================================================================= */}
          {activeSection === 'reset' && (
            <div className="settings-form-group">
              <div className="section-title-wrap">
                <h2 className="section-main-title">Reset & Wipe</h2>
                <p className="section-main-subtitle">Clear cached channel data or restore application to factory state</p>
              </div>

              <div className="setting-field-row">
                <div className="field-meta">
                  <label className="field-title">Clear Channel & EPG Caches</label>
                  <p className="field-desc">Empties IndexedDB cached channels and schedules without affecting your saved playlists.</p>
                </div>
                <div className="field-control">
                  <button
                    type="button"
                    onClick={async () => {
                      if (storageAdapter.clearChannels) {
                        await storageAdapter.clearChannels();
                        showToast('Channel cache cleared');
                      }
                    }}
                    className="tokerian-btn"
                  >
                    Clear Caches
                  </button>
                </div>
              </div>

              <div className="setting-field-row" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <div className="field-meta">
                  <label className="field-title" style={{ color: '#ef4444' }}>Factory Reset (Full Data Wipe)</label>
                  <p className="field-desc">Permanently wipes all playlists, favorites, history, downloads, and custom settings.</p>
                </div>
                <div className="field-control">
                  <button
                    type="button"
                    onClick={handleFactoryReset}
                    className="tokerian-btn"
                    style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', color: '#ef4444' }}
                  >
                    <Trash2 size={16} /> Factory Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
             SECTION 10: ABOUT (Tokerian System Information)
             ========================================================================= */}
          {activeSection === 'about' && (
            <div className="settings-form-group">
              <div className="section-title-wrap">
                <h2 className="section-main-title">About Tokerian</h2>
                <p className="section-main-subtitle">Application information, platform architecture, and licenses</p>
              </div>

              <div className="about-info-card" style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)' }}>
                      <Tv size={28} color="#fff" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{APP_CONFIG.appName} IPTV Client</h3>
                        <AppVersionBadge variant="chip" />
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Codename &ldquo;{APP_CONFIG.codename}&rdquo; &bull; Released {APP_CONFIG.releaseDate}
                      </p>
                    </div>
                  </div>

                  <AppVersionBadge variant="pill" showBuild={true} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  <div className="about-stat-box">
                    <span className="stat-label">Version</span>
                    <strong className="stat-value" style={{ color: '#fff' }}>{getAppVersion()}</strong>
                  </div>
                  <div className="about-stat-box">
                    <span className="stat-label">Release Stage</span>
                    <strong className="stat-value" style={{ color: getStageMeta().color }}>
                      {getStageMeta().label.toUpperCase()}
                    </strong>
                  </div>
                  <div className="about-stat-box">
                    <span className="stat-label">Build Number</span>
                    <strong className="stat-value">#{APP_CONFIG.buildNumber}</strong>
                  </div>
                  <div className="about-stat-box">
                    <span className="stat-label">Environment</span>
                    <strong className="stat-value">{getBuildEnvironment()}</strong>
                  </div>
                  <div className="about-stat-box">
                    <span className="stat-label">Platforms Supported</span>
                    <strong className="stat-value">Web, Tablet, Mobile, Windows Desktop, Android TV</strong>
                  </div>
                  <div className="about-stat-box">
                    <span className="stat-label">Streaming Engine</span>
                    <strong className="stat-value">HLS, MPEG-TS, DASH, Xtream Codes</strong>
                  </div>
                  <div className="about-stat-box">
                    <span className="stat-label">External Players</span>
                    <strong className="stat-value">VLC & MPV Process Spawning</strong>
                  </div>
                  <div className="about-stat-box">
                    <span className="stat-label">License</span>
                    <strong className="stat-value">MIT Open Source</strong>
                  </div>
                </div>

                <div style={{ marginTop: '20px', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Central tracking config: <code style={{ color: '#93c5fd', background: 'rgba(147, 197, 253, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>src/config/appInfo.ts</code>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Active across development runtime &amp; production distribution
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
