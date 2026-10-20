import React from 'react';
import type { SidebarTab } from './Sidebar';
import { useUserStore } from '../../stores/useUserStore';
import { MatIcon } from '../common/MatIcon';

interface MobileBottomNavProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onOpenGenres?: () => void;
  onOpenSettings?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const favoritesCount = useUserStore((s) => s.favorites.size);

  return (
    <nav className="mobile-bottom-nav glass-panel">
      <button
        type="button"
        onClick={() => onTabChange('home')}
        className={`bottom-nav-item ${activeTab === 'home' ? 'bottom-item-active' : ''}`}
        title="Home"
      >
        <MatIcon name="dashboard" size={20} />
        <span>Home</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('channels')}
        className={`bottom-nav-item ${activeTab === 'channels' ? 'bottom-item-active' : ''}`}
        title="Channels"
      >
        <MatIcon name="playlist_play" size={22} />
        <span>Channels</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('movies')}
        className={`bottom-nav-item ${activeTab === 'movies' ? 'bottom-item-active' : ''}`}
        title="Movies"
      >
        <MatIcon name="movie" size={20} />
        <span>Movies</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('series')}
        className={`bottom-nav-item ${activeTab === 'series' ? 'bottom-item-active' : ''}`}
        title="Series"
      >
        <MatIcon name="tv" size={20} />
        <span>Series</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('favorites')}
        className={`bottom-nav-item ${activeTab === 'favorites' ? 'bottom-item-active' : ''}`}
        title="Favorites"
      >
        <div className="bottom-nav-icon-wrapper">
          <MatIcon name="favorite" size={20} />
          {favoritesCount > 0 && <span className="bottom-nav-badge">{favoritesCount}</span>}
        </div>
        <span>Favorites</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('settings')}
        className={`bottom-nav-item ${activeTab === 'settings' ? 'bottom-item-active' : ''}`}
        title="Settings"
      >
        <MatIcon name="settings" size={20} />
        <span>Settings</span>
      </button>
    </nav>
  );
};
