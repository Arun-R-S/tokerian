import React from 'react';
import { useChannelStore } from '../../stores/useChannelStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Search, Sliders, Tv, Radio, X, Menu, FolderPlus, Calendar } from 'lucide-react';
import { useMultiPlaylistStore } from '../../stores/useMultiPlaylistStore';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenPlaylists?: () => void;
  onOpenEpgGuide?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenPlaylists,
  onOpenEpgGuide,
  onToggleMobileMenu,
}) => {
  const activePlaylistId = useMultiPlaylistStore((s) => s.activePlaylistId);
  const playlists = useMultiPlaylistStore((s) => s.playlists);
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
  const searchQuery = useChannelStore((s) => s.searchQuery);
  const setSearchQuery = useChannelStore((s) => s.setSearchQuery);
  const channels = useChannelStore((s) => s.channels);
  const isLoading = useChannelStore((s) => s.isLoading);
  const loadingProgress = useChannelStore((s) => s.loadingProgress);

  const tvMode = useSettingsStore((s) => s.tvMode);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <header className="tokerian-header glass-panel">
      {/* Mobile Hamburger Toggle Button */}
      <button
        type="button"
        onClick={onToggleMobileMenu}
        className="tokerian-btn-icon mobile-menu-btn"
        title="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Brand Logo */}
      <div className="header-brand">
        <div className="brand-icon-wrapper">
          <Radio size={22} className="brand-icon" />
        </div>
        <div className="brand-text-col">
          <h1 className="brand-title">Tokerian</h1>
          <span className="brand-subtitle">Live Stream Hub</span>
        </div>
      </div>

      {/* Instant Search Bar */}
      <div className="header-search-wrapper">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search 30,000+ channels, countries, languages..."
          className="header-search-input"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="search-clear-btn"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="header-actions">
        {/* Playlists & Accounts Trigger */}
        <button
          type="button"
          onClick={onOpenPlaylists}
          className="tokerian-btn"
          style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '6px' }}
          title={`Active Playlist: ${activePlaylist?.title || 'Default'} - Click to manage or add sources`}
        >
          <FolderPlus size={16} color="var(--accent-primary)" />
          <span style={{ maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activePlaylist?.title || 'Playlists'}
          </span>
        </button>

        {/* Total Channels Pill */}
        <div className="channels-count-pill" title="Total active channels loaded">
          {isLoading ? (
            <span className="count-loading">Syncing {loadingProgress}%</span>
          ) : (
            <span>{channels.length.toLocaleString()} Channels</span>
          )}
        </div>

        {/* TV Guide (EPG Matrix) Button */}
        {onOpenEpgGuide && (
          <button
            type="button"
            onClick={onOpenEpgGuide}
            className="tokerian-btn-icon"
            title="TV Guide & Schedule (EPG Matrix)"
          >
            <Calendar size={18} />
          </button>
        )}

        {/* TV Mode Toggle */}
        <button
          type="button"
          onClick={() => updateSettings({ tvMode: !tvMode })}
          className={`tokerian-btn-icon header-tv-btn ${tvMode ? 'tv-mode-active' : ''}`}
          title={tvMode ? 'Disable TV D-pad Mode' : 'Enable TV D-pad Mode'}
        >
          <Tv size={18} />
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="tokerian-btn-icon"
          title="Playlist & CORS Settings"
        >
          <Sliders size={20} />
        </button>
      </div>
    </header>
  );
};
