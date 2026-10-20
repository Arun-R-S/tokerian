import React, { useState } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useChannelStore } from '../../stores/useChannelStore';
import { IPTV_PRESETS } from '../../core/presets/iptvPresets';
import { storageAdapter } from '../../adapters/storage/IndexedDbAdapter';
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
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const loadPlaylist = useChannelStore((s) => s.loadPlaylist);
  const activePlaylistUrl = useChannelStore((s) => s.activePlaylistUrl);

  const [inputUrl, setInputUrl] = useState(m3uUrl);
  const [proxyUrl, setProxyUrl] = useState(corsProxyUrl);
  const [isSaved, setIsSaved] = useState(false);

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

          {/* Section 5: TV 10-Foot Mode & Cache Management */}
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
