import React from 'react';
import type { SidebarTab } from './Sidebar';
import { useUserStore } from '../../stores/useUserStore';
import { Tv, Star, Clock, Layers, Sliders } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onOpenGenres: () => void;
  onOpenSettings: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenGenres,
  onOpenSettings,
}) => {
  const favoritesCount = useUserStore((s) => s.favorites.size);
  const historyCount = useUserStore((s) => s.history.length);

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
        onClick={() => onTabChange('history')}
        className={`bottom-nav-item ${activeTab === 'history' ? 'bottom-item-active' : ''}`}
      >
        <div className="bottom-nav-icon-wrapper">
          <Clock size={20} />
          {historyCount > 0 && <span className="bottom-nav-badge">{historyCount}</span>}
        </div>
        <span>History</span>
      </button>

      <button
        type="button"
        onClick={onOpenGenres}
        className="bottom-nav-item"
      >
        <Layers size={20} />
        <span>Genres</span>
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        className="bottom-nav-item"
      >
        <Sliders size={20} />
        <span>Settings</span>
      </button>
    </nav>
  );
};
