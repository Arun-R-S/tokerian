import React from 'react';
import {
  LayoutGrid,
  Menu,
  Search,
  Heart,
  Clock,
  Tv,
  Folder,
  Sliders,
  X,
  Radio,
  Film,
  Layers,
  Download,
} from 'lucide-react';
import { useUserStore } from '../../stores/useUserStore';
import { usePlayerStore } from '../../stores/usePlayerStore';

export type SidebarTab =
  | 'home'
  | 'channels'
  | 'search'
  | 'movies'
  | 'series'
  | 'favorites'
  | 'history'
  | 'livetv'
  | 'playlists'
  | 'downloads'
  | 'settings';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onOpenPlaylists?: () => void;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenEpgGuide?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenPlaylists,
  onOpenSettings,
  onOpenCommandPalette,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const favoritesCount = useUserStore((s) => s.favorites.size);
  const historyCount = useUserStore((s) => s.history.length);
  const currentChannel = usePlayerStore((s) => s.currentChannel);

  const handleTabSelect = (tab: SidebarTab) => {
    if (tab === 'playlists' && onOpenPlaylists) {
      onOpenPlaylists();
    } else if (tab === 'search' && onOpenCommandPalette) {
      onOpenCommandPalette();
    } else {
      onTabChange(tab);
    }
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={onCloseMobile} />
      )}

      {/* 56px Left Icon Rail (Desktop & TV) / Slide-in Drawer (Mobile) */}
      <aside className={`tokerian-icon-rail ${isMobileOpen ? 'icon-rail-mobile-open' : ''}`}>
        {/* Mobile-Only Header */}
        <div className="rail-mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="brand-icon-wrapper" style={{ width: '30px', height: '30px' }}>
              <Radio size={16} />
            </div>
            <span className="brand-title" style={{ fontSize: '1rem' }}>Tokerian</span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="tokerian-btn-icon"
            style={{ padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Top Primary Navigation Icons */}
        <div className="rail-icons-top">
          {/* 1. Home / Dashboard */}
          <button
            type="button"
            onClick={() => handleTabSelect('home')}
            className={`rail-icon-btn ${activeTab === 'home' ? 'rail-icon-active' : ''}`}
            title="Home Dashboard"
          >
            <LayoutGrid size={20} />
            <span className="rail-mobile-label">Home</span>
          </button>

          {/* 2. Channel List / Explorer */}
          <button
            type="button"
            onClick={() => handleTabSelect('channels')}
            className={`rail-icon-btn ${activeTab === 'channels' ? 'rail-icon-active' : ''}`}
            title="All Channels & Groups"
          >
            <Menu size={20} />
            <span className="rail-mobile-label">Channels</span>
          </button>

          {/* 3. Global Search */}
          <button
            type="button"
            onClick={() => handleTabSelect('search')}
            className={`rail-icon-btn ${activeTab === 'search' ? 'rail-icon-active' : ''}`}
            title="Search (Ctrl+K)"
          >
            <Search size={20} />
            <span className="rail-mobile-label">Search</span>
          </button>

          {/* 4. Favorites */}
          <button
            type="button"
            onClick={() => handleTabSelect('favorites')}
            className={`rail-icon-btn ${activeTab === 'favorites' ? 'rail-icon-active' : ''}`}
            title={`Favorites (${favoritesCount})`}
          >
            <Heart size={20} />
            {favoritesCount > 0 && <span className="rail-badge-dot" />}
            <span className="rail-mobile-label">Favorites ({favoritesCount})</span>
          </button>

          {/* 5. Recently Watched / History */}
          <button
            type="button"
            onClick={() => handleTabSelect('history')}
            className={`rail-icon-btn ${activeTab === 'history' ? 'rail-icon-active' : ''}`}
            title={`Watch History (${historyCount})`}
          >
            <Clock size={20} />
            <span className="rail-mobile-label">History ({historyCount})</span>
          </button>

          {/* 6. Live TV Cinema Player View */}
          <button
            type="button"
            onClick={() => handleTabSelect('livetv')}
            className={`rail-icon-btn ${activeTab === 'livetv' ? 'rail-icon-active' : ''}`}
            title={currentChannel ? `Now Playing: ${currentChannel.name}` : 'Live TV Player'}
          >
            <Tv size={20} />
            <span className="rail-mobile-label">Live Player</span>
          </button>

          {/* 7. Movies VOD */}
          <button
            type="button"
            onClick={() => handleTabSelect('movies')}
            className={`rail-icon-btn ${activeTab === 'movies' ? 'rail-icon-active' : ''}`}
            title="Movies (VOD)"
          >
            <Film size={20} />
            <span className="rail-mobile-label">Movies</span>
          </button>

          {/* 8. TV Series */}
          <button
            type="button"
            onClick={() => handleTabSelect('series')}
            className={`rail-icon-btn ${activeTab === 'series' ? 'rail-icon-active' : ''}`}
            title="TV Series Catalog"
          >
            <Layers size={20} />
            <span className="rail-mobile-label">Series</span>
          </button>

          {/* 9. Sources / Playlists Manager */}
          <button
            type="button"
            onClick={() => handleTabSelect('playlists')}
            className={`rail-icon-btn ${activeTab === 'playlists' ? 'rail-icon-active' : ''}`}
            title="Playlists & Sources"
          >
            <Folder size={20} />
            <span className="rail-mobile-label">Sources</span>
          </button>

          {/* 10. Downloads & Recordings */}
          <button
            type="button"
            onClick={() => handleTabSelect('downloads')}
            className={`rail-icon-btn ${activeTab === 'downloads' ? 'rail-icon-active' : ''}`}
            title="Downloads & Recordings"
          >
            <Download size={20} />
            <span className="rail-mobile-label">Downloads</span>
          </button>
        </div>

        {/* Bottom Settings Icon */}
        <div className="rail-icons-bottom">
          <button
            type="button"
            onClick={() => {
              onTabChange('settings');
              onOpenSettings?.();
              onCloseMobile?.();
            }}
            className={`rail-icon-btn ${activeTab === 'settings' ? 'rail-icon-active' : ''}`}
            title="Settings & Preferences"
          >
            <Sliders size={20} />
            <span className="rail-mobile-label">Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};
