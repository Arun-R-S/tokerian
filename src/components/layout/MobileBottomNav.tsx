import React from 'react';
import type { SidebarTab } from './Sidebar';
import { useUserStore } from '../../stores/useUserStore';
import { Tv, Film, Sparkles, Star, Sliders } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onOpenGenres?: () => void;
  onOpenSettings: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenSettings,
}) => {
  const favoritesCount = useUserStore((s) => s.favorites.size);

  return (
    <nav className="mobile-bottom-nav glass-panel">
      <button
        type="button"
        onClick={() => onTabChange('channels')}
        className={`bottom-nav-item ${activeTab === 'channels' ? 'bottom-item-active' : ''}`}
      >
        <Tv size={20} />
        <span>Live</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('movies')}
        className={`bottom-nav-item ${activeTab === 'movies' ? 'bottom-item-active' : ''}`}
      >
        <Film size={20} />
        <span>Movies</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('series')}
        className={`bottom-nav-item ${activeTab === 'series' ? 'bottom-item-active' : ''}`}
      >
        <Sparkles size={20} />
        <span>Series</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('favorites')}
        className={`bottom-nav-item ${activeTab === 'favorites' ? 'bottom-item-active' : ''}`}
      >
        <div className="bottom-nav-icon-wrapper">
          <Star size={20} />
          {favoritesCount > 0 && <span className="bottom-nav-badge">{favoritesCount}</span>}
        </div>
        <span>Favorites</span>
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        className="bottom-nav-item"
        title="Settings"
      >
        <Sliders size={20} />
        <span>Settings</span>
      </button>
    </nav>
  );
};
