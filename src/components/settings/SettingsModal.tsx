import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useChannelStore } from '../../stores/useChannelStore';
import { IPTV_PRESETS } from '../../core/presets/iptvPresets';
import { storageAdapter } from '../../adapters/storage/IndexedDbAdapter';
import { ExternalPlayerService } from '../../services/player/ExternalPlayerService';
import {
  X,
  Link,
  Shield,
  Tv,
  Trash2,
  CheckCircle,
  Sliders,
  Globe,
  Layers,
  MonitorPlay,
  RotateCcw,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const m3uUrl = useSettingsStore((s) => s.m3uUrl);
  const corsProxyEnabled = useSettingsStore((s) => s.corsProxyEnabled);
  const corsProxyUrl = useSettingsStore((s) => s.corsProxyUrl);
  const tvMode = useSettingsStore((s) => s.tvMode);
  const pageSize = useSettingsStore((s) => s.pageSize) || 100;
  const defaultExternalPlayer = useSettingsStore((s) => s.defaultExternalPlayer) || 'vlc';
  const customVlcPath = useSettingsStore((s) => s.customVlcPath) || '';
  const customMpvPath = useSettingsStore((s) => s.customMpvPath) || '';
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const loadPlaylist = useChannelStore((s) => s.loadPlaylist);
  const activePlaylistUrl = useChannelStore((s) => s.activePlaylistUrl);

  const [inputUrl, setInputUrl] = useState(m3uUrl);
  const [proxyUrl, setProxyUrl] = useState(corsProxyUrl);
  const [vlcPathInput, setVlcPathInput] = useState(customVlcPath);
  const [mpvPathInput, setMpvPathInput] = useState(customMpvPath);
  const [detectedPlayers, setDetectedPlayers] = useState<{ vlc: boolean; mpv: boolean; platform?: string }>({
    vlc: false,
    mpv: false,
  });
  const [isSaved, setIsSaved] = useState(false);

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
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Sliders size={22} className="text-accent" />
            <h2>Tokerian Settings</h2>
          </div>
          <button type="button" onClick={onClose} className="tokerian-btn-icon">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Section 1: Changeable IPTV URL */}
          <div className="settings-section">
            <label className="settings-label">
              <Link size={16} /> Custom IPTV M3U / M3U8 Playlist URL
            </label>
            <p className="settings-hint">
              Enter any valid Extended M3U stream URL or pick from the curated iptv-org presets below.
            </p>
            <div className="settings-input-group">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://.../playlist.m3u"
                className="tokerian-input"
              />
              <button
                type="button"
                onClick={handleSaveAndLoad}
                className="tokerian-btn tokerian-btn-primary"
              >
                {isSaved ? <CheckCircle size={16} /> : 'Load Playlist'}
              </button>
            </div>
          </div>

          {/* Section 2: 1-Click Curated Presets from iptv-org */}
          <div className="settings-section">
            <label className="settings-label">
              <Globe size={16} /> Curated Presets (iptv-org)
            </label>
            <div className="presets-grid">
              {IPTV_PRESETS.map((preset) => {
                const isCurrent = activePlaylistUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    className={`preset-card ${isCurrent ? 'preset-card-active' : ''}`}
                  >
                    <div className="preset-card-top">
                      <span className="preset-title">{preset.title}</span>
                      {preset.badge && <span className="preset-badge">{preset.badge}</span>}
                    </div>
                    <p className="preset-desc">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: In-Browser CORS Proxy Settings */}
          <div className="settings-section">
            <label className="settings-label">
              <Shield size={16} /> Web Browser CORS Proxy
            </label>
            <p className="settings-hint">
              Enables playback for international live streams that do not serve permissive cross-origin headers.
            </p>
            <div className="settings-toggle-row">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={corsProxyEnabled}
                  onChange={(e) => updateSettings({ corsProxyEnabled: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
              <span>{corsProxyEnabled ? 'CORS Proxy Enabled (Recommended for Web)' : 'Direct Streaming Only'}</span>
            </div>

            {corsProxyEnabled && (
              <div style={{ marginTop: '10px' }}>
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

          {/* Section 4: Batch Loading / Channels Per Page */}
          <div className="settings-section">
            <label className="settings-label">
              <Layers size={16} /> Channels Per Batch (Infinite Scroll)
            </label>
            <p className="settings-hint">
              Number of channels rendered at once. Scrolling to the bottom automatically loads the next batch, preventing browser lag.
            </p>
            <div className="batch-size-selector" style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {[50, 100, 200, 500].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateSettings({ pageSize: size })}
                  className={`tokerian-btn ${pageSize === size ? 'tokerian-btn-primary' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {size} channels
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Desktop External Players (VLC & MPV) */}
          <div className="settings-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="settings-label" style={{ margin: 0 }}>
                <MonitorPlay size={16} /> Desktop External Players (VLC & MPV)
              </label>
              <button
                type="button"
                onClick={() => {
                  ExternalPlayerService.checkInstalled({ vlc: vlcPathInput, mpv: mpvPathInput }).then((res) => {
                    setDetectedPlayers(res);
                  });
                }}
                className="tokerian-btn"
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                title="Re-check installed players"
              >
                <RotateCcw size={13} /> Re-scan
              </button>
            </div>
            <p className="settings-hint">
              Launch media directly in VLC or MPV for zero-copy hardware decoding, AC3/EAC3 audio codecs, and full MPEG-TS support.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${detectedPlayers.vlc ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>VLC Media Player</span>
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
                  style={{ marginTop: '8px', fontSize: '0.78rem', padding: '6px 10px' }}
                />
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${detectedPlayers.mpv ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>MPV Player</span>
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
                  style={{ marginTop: '8px', fontSize: '0.78rem', padding: '6px 10px' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Default external player:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['vlc', 'mpv'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => updateSettings({ defaultExternalPlayer: p })}
                    className={`tokerian-btn ${defaultExternalPlayer === p ? 'tokerian-btn-primary' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '4px 12px', textTransform: 'uppercase' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 6: TV 10-Foot Mode & Cache Management */}
          <div className="settings-section settings-row-split">
            <div>
              <label className="settings-label">
                <Tv size={16} /> Android TV Mode
              </label>
              <p className="settings-hint">Enhances focus rings and D-pad remote navigation.</p>
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
                <Trash2 size={16} /> Local Cache
              </label>
              <p className="settings-hint">Free up IndexedDB playlist storage.</p>
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
      </div>
    </div>
  );
};
