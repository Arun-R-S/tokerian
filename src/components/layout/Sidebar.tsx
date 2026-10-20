import React from 'react';
import { useUserStore } from '../../stores/useUserStore';
import { useChannelStore } from '../../stores/useChannelStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import {
  Tv,
  Star,
  Clock,
  Newspaper,
  Trophy,
  Film,
  Sparkles,
  Music,
  Radio,
  Play,
  Pause,
  X,
  FolderPlus,
  Calendar,
} from 'lucide-react';

export type SidebarTab = 'channels' | 'movies' | 'series' | 'favorites' | 'history';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onOpenPlaylists?: () => void;
  onOpenEpgGuide?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenPlaylists,
  onOpenEpgGuide,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const favoritesCount = useUserStore((s) => s.favorites.size);
  const historyCount = useUserStore((s) => s.history.length);
  const setActiveCategory = useChannelStore((s) => s.setActiveCategory);

  const currentChannel = usePlayerStore((s) => s.currentChannel);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const handleTabSelect = (tab: SidebarTab) => {
    onTabChange(tab);
    onCloseMobile?.();
  };

  const handleQuickCategory = (category: string) => {
    onTabChange('channels');
    setActiveCategory(category);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`tokerian-sidebar ${isMobileOpen ? 'sidebar-drawer-open' : ''}`}>
        {/* Mobile Header with Close Button */}
        <div className="sidebar-mobile-header">
          <div className="header-brand" style={{ gap: '8px' }}>
            <div className="brand-icon-wrapper" style={{ width: '32px', height: '32px' }}>
              <Radio size={16} />
            </div>
            <span className="brand-title" style={{ fontSize: '1.05rem' }}>Tokerian</span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="tokerian-btn-icon"
            style={{ padding: '6px' }}
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Primary Navigation */}
        <div className="sidebar-nav-group">
          <span className="sidebar-group-title">Catalog</span>

          <button
            type="button"
            tabIndex={0}
            onClick={() => handleTabSelect('channels')}
            className={`sidebar-nav-item ${activeTab === 'channels' ? 'sidebar-item-active' : ''}`}
          >
            <Tv size={18} />
            <span>Live Channels</span>
          </button>

          <button
            type="button"
            tabIndex={0}
            onClick={() => handleTabSelect('movies')}
            className={`sidebar-nav-item ${activeTab === 'movies' ? 'sidebar-item-active' : ''}`}
          >
            <Film size={18} />
            <span>Movies (VOD)</span>
          </button>

          <button
            type="button"
            tabIndex={0}
            onClick={() => handleTabSelect('series')}
            className={`sidebar-nav-item ${activeTab === 'series' ? 'sidebar-item-active' : ''}`}
          >
            <Sparkles size={18} />
            <span>TV Series</span>
          </button>

          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />

          <button
            type="button"
            tabIndex={0}
            onClick={() => handleTabSelect('favorites')}
            className={`sidebar-nav-item ${activeTab === 'favorites' ? 'sidebar-item-active' : ''}`}
          >
            <Star size={18} />
            <span>Favorites</span>
            {favoritesCount > 0 && <span className="nav-badge">{favoritesCount}</span>}
          </button>

          <button
            type="button"
            tabIndex={0}
            onClick={() => handleTabSelect('history')}
            className={`sidebar-nav-item ${activeTab === 'history' ? 'sidebar-item-active' : ''}`}
          >
            <Clock size={18} />
            <span>Recently Watched</span>
            {historyCount > 0 && <span className="nav-badge">{historyCount}</span>}
          </button>

          {onOpenPlaylists && (
            <button
              type="button"
              tabIndex={0}
              onClick={() => {
                onOpenPlaylists();
                onCloseMobile?.();
              }}
              className="sidebar-nav-item"
            >
              <FolderPlus size={18} />
              <span>Playlists & Sources</span>
            </button>
          )}

          {onOpenEpgGuide && (
            <button
              type="button"
              tabIndex={0}
              onClick={() => {
                onOpenEpgGuide();
                onCloseMobile?.();
              }}
              className="sidebar-nav-item"
            >
              <Calendar size={18} />
              <span>TV Guide & Schedule</span>
            </button>
          )}
        </div>

      {/* Quick Category Filter Presets */}
      <div className="sidebar-nav-group">
        <span className="sidebar-group-title">Genres</span>

        <button
          type="button"
          onClick={() => handleQuickCategory('News')}
          className="sidebar-nav-item"
        >
          <Newspaper size={18} />
          <span>News</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickCategory('Sports')}
          className="sidebar-nav-item"
        >
          <Trophy size={18} />
          <span>Sports</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickCategory('Movies')}
          className="sidebar-nav-item"
        >
          <Film size={18} />
          <span>Movies</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickCategory('Animation')}
          className="sidebar-nav-item"
        >
          <Sparkles size={18} />
          <span>Animation</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickCategory('Music')}
          className="sidebar-nav-item"
        >
          <Music size={18} />
          <span>Music</span>
        </button>
      </div>

      {/* Currently Playing Mini-Card (if stream is active) */}
      {currentChannel && (
        <div className="sidebar-mini-player glass-panel">
          <div className="mini-player-top">
            {currentChannel.logo ? (
              <img
                src={currentChannel.logo}
                alt={currentChannel.name}
                className="mini-player-logo"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <Radio size={20} className="text-accent" />
            )}
            <div className="mini-player-text">
              <span className="mini-player-title" title={currentChannel.name}>
                {currentChannel.name}
              </span>
              <span className="mini-player-live">
                <span className="live-indicator" /> LIVE
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={togglePlay}
            className="tokerian-btn tokerian-btn-primary mini-play-btn"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
            <span>{isPlaying ? 'Pause' : 'Resume'}</span>
          </button>
        </div>
      )}
    </aside>
    </>
  );
};
