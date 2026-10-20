import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Sliders,
  Tv,
  X,
  Menu,
  Folder,
  Calendar,
  RotateCw,
  ChevronDown,
  Keyboard,
  Plus,
  Check,
  FolderPlus,
  Minus,
  Square,
} from 'lucide-react';
import { useChannelStore } from '../../stores/useChannelStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useMultiPlaylistStore } from '../../stores/useMultiPlaylistStore';
import type { SidebarTab } from './Sidebar';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenPlaylists?: () => void;
  onOpenAddPlaylist?: () => void;
  onOpenEpgGuide?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onToggleMobileMenu?: () => void;
  activeTab?: SidebarTab;
  onTabChange?: (tab: SidebarTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenPlaylists,
  onOpenAddPlaylist,
  onOpenEpgGuide,
  onOpenCommandPalette,
  onOpenKeyboardShortcuts,
  onToggleMobileMenu,
}) => {
  const activePlaylistId = useMultiPlaylistStore((s) => s.activePlaylistId);
  const playlists = useMultiPlaylistStore((s) => s.playlists);
  const selectPlaylist = useMultiPlaylistStore((s) => s.selectPlaylist);
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);

  const searchQuery = useChannelStore((s) => s.searchQuery);
  const setSearchQuery = useChannelStore((s) => s.setSearchQuery);
  const channels = useChannelStore((s) => s.channels);
  const isLoading = useChannelStore((s) => s.isLoading);
  const loadPlaylist = useChannelStore((s) => s.loadPlaylist);

  const tvMode = useSettingsStore((s) => s.tvMode);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [isPlaylistDropdownOpen, setIsPlaylistDropdownOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsPlaylistDropdownOpen(false);
      }
    };
    if (isPlaylistDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPlaylistDropdownOpen]);

  // Handle Playlist Reload / Sync
  const handleSyncPlaylist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePlaylist) return;
    setIsSyncing(true);
    try {
      if (activePlaylist.url) {
        await loadPlaylist(activePlaylist.url, true);
      }
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const channelCountDisplay = isLoading
    ? 'Syncing channels...'
    : `${channels.length.toLocaleString()} channels`;

  return (
    <header className="tokerian-iptvnator-header">
      {/* LEFT SECTION: Mobile Hamburger + Playlist Selector Dropdown Pill */}
      <div className="header-left-col">
        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="tokerian-btn-icon mobile-menu-btn"
          title="Open menu"
        >
          <Menu size={18} />
        </button>

        {/* Playlist Selector Dropdown Pill */}
        <div className="playlist-pill-container" ref={dropdownRef}>
          <div
            className="playlist-selector-pill"
            onClick={() => setIsPlaylistDropdownOpen(!isPlaylistDropdownOpen)}
            title="Switch playlist or view source details"
          >
            <div className="playlist-pill-icon-box">
              <Folder size={16} />
            </div>

            <div className="playlist-pill-text-col">
              <span className="playlist-pill-title">
                {activePlaylist?.title || 'IPTV Playlist'}
              </span>
              <span className="playlist-pill-subtitle">{channelCountDisplay}</span>
            </div>

            <button
              type="button"
              className={`playlist-pill-action-btn ${isSyncing || isLoading ? 'sync-spinning' : ''}`}
              onClick={handleSyncPlaylist}
              title="Refresh / Sync current playlist"
            >
              <RotateCw size={13} />
            </button>

            <div className="playlist-pill-chevron">
              <ChevronDown
                size={14}
                style={{
                  transform: isPlaylistDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }}
              />
            </div>
          </div>

          {/* Quick Playlist Switcher Popover */}
          {isPlaylistDropdownOpen && (
            <div className="playlist-dropdown-popover glass-panel">
              <div className="playlist-dropdown-header">
                <span>Select Source ({playlists.length})</span>
                {onOpenAddPlaylist && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaylistDropdownOpen(false);
                      onOpenAddPlaylist();
                    }}
                    className="playlist-dropdown-add-btn"
                    title="Add new playlist"
                  >
                    <Plus size={14} /> Add
                  </button>
                )}
              </div>

              <div className="playlist-dropdown-list">
                {playlists.map((p) => {
                  const isActive = p.id === activePlaylistId;
                  return (
                    <div
                      key={p.id}
                      className={`playlist-dropdown-item ${isActive ? 'playlist-item-active' : ''}`}
                      onClick={() => {
                        selectPlaylist(p.id);
                        setIsPlaylistDropdownOpen(false);
                      }}
                    >
                      <div className="playlist-dropdown-item-left">
                        <Folder
                          size={15}
                          color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'}
                        />
                        <div className="playlist-dropdown-item-text">
                          <div className="dropdown-item-title">{p.title}</div>
                          <div className="dropdown-item-meta">
                            {p.count ? `${p.count.toLocaleString()} channels` : p.type.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <Check size={16} color="var(--accent-primary)" />
                      )}
                    </div>
                  );
                })}
              </div>

              {onOpenPlaylists && (
                <div
                  className="playlist-dropdown-footer"
                  onClick={() => {
                    setIsPlaylistDropdownOpen(false);
                    onOpenPlaylists();
                  }}
                >
                  <FolderPlus size={14} />
                  <span>Manage All Sources & Accounts</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CENTER SECTION: IPTVnator Centered Pill Search Bar */}
      <div className="header-center-col">
        <div
          className="iptvnator-search-pill"
          onClick={() => {
            if (onOpenCommandPalette && !searchQuery) {
              onOpenCommandPalette();
            }
          }}
        >
          <Search size={16} className="search-pill-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in this playlist..."
            className="search-pill-input"
          />

          {searchQuery ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
              }}
              className="search-pill-clear"
              title="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <span
              className="search-pill-shortcut"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCommandPalette?.();
              }}
              title="Open Command Palette (Ctrl+K)"
            >
              Ctrl+K
            </span>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: Quick Action Icons & Window Controls */}
      <div className="header-right-col">
        {/* 1. Keyboard Shortcuts Cheatsheet */}
        {onOpenKeyboardShortcuts && (
          <button
            type="button"
            onClick={onOpenKeyboardShortcuts}
            className="header-action-icon-btn"
            title="Keyboard Shortcuts Cheatsheet"
          >
            <Keyboard size={18} />
          </button>
        )}

        {/* 2. Add Playlist / Source */}
        {onOpenAddPlaylist && (
          <button
            type="button"
            onClick={onOpenAddPlaylist}
            className="header-action-icon-btn"
            title="Add Playlist / Source (+)"
          >
            <Plus size={18} />
          </button>
        )}

        {/* 3. TV Guide (EPG Timeline Matrix) */}
        {onOpenEpgGuide && (
          <button
            type="button"
            onClick={onOpenEpgGuide}
            className="header-action-icon-btn"
            title="TV Guide & Schedule (Key G)"
          >
            <Calendar size={17} />
          </button>
        )}

        {/* 4. TV D-Pad Mode Toggle */}
        <button
          type="button"
          onClick={() => updateSettings({ tvMode: !tvMode })}
          className={`header-action-icon-btn ${tvMode ? 'action-icon-active' : ''}`}
          title={tvMode ? 'Disable TV D-Pad Mode' : 'Enable 10-Foot TV D-Pad Mode'}
        >
          <Tv size={17} />
        </button>

        {/* 5. Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="header-action-icon-btn"
          title="App Settings & Preferences"
        >
          <Sliders size={18} />
        </button>

        {/* 6. Subtle Desktop Window Controls (Visible ONLY in Desktop Electron App) */}
        {typeof window !== 'undefined' && (window as any).electronAPI && (
          <div className="header-window-controls">
            <button
              type="button"
              onClick={() => (window as any).electronAPI?.minimize?.()}
              className="window-control-btn"
              title="Minimize"
            >
              <Minus size={13} />
            </button>
            <button
              type="button"
              onClick={() => (window as any).electronAPI?.maximize?.()}
              className="window-control-btn"
              title="Maximize"
            >
              <Square size={11} />
            </button>
            <button
              type="button"
              onClick={() => (window as any).electronAPI?.close?.()}
              className="window-control-btn close-btn"
              title="Close"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
