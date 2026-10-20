import { memo, useCallback, useState } from 'react';
import type { Channel } from '../../core/domain/types';
import { useUserStore } from '../../stores/useUserStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { ChannelSanitizer } from '../../utils/channelSanitizer';
import { MatIcon } from '../common/MatIcon';

interface ChannelCardProps {
  channel: Channel;
  scope?: 'all' | 'favorites';
}

/**
 * High-performance memoized ChannelCard.
 * Adheres to Vercel React Best Practices (rerender-memo, rerender-derived-state, list-performance-item-memo).
 */
export const ChannelCard: React.FC<ChannelCardProps> = memo(({ channel, scope }) => {
  const [imageError, setImageError] = useState(false);

  // Atomic state subscriptions
  const isFav = useUserStore(useCallback((s) => s.favorites.has(channel.id), [channel.id]));
  const isPlaying = usePlayerStore(useCallback((s) => s.currentChannel?.id === channel.id, [channel.id]));
  const cleanChannelTitles = useSettingsStore((s) => s.cleanChannelTitles);

  const displayName = cleanChannelTitles ? ChannelSanitizer.cleanTitle(channel.name) : channel.name;

  const playChannel = usePlayerStore((s) => s.playChannel);
  const toggleFavorite = useUserStore((s) => s.toggleFavorite);

  const handleCardClick = () => {
    playChannel(channel, undefined, scope);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(channel.id);
  };

  return (
    <div
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleCardClick();
      }}
      className={`channel-card ${isPlaying ? 'channel-card-active' : ''}`}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '240px 140px',
      }}
    >
      <div className="channel-card-header">
        <div className="channel-logo-container">
          {channel.logo && !imageError ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="channel-logo"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="channel-logo-placeholder">
              <MatIcon name="tv" size={24} style={{ color: 'var(--text-muted)' }} />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleFavoriteClick}
          className={`favorite-btn ${isFav ? 'favorite-btn-active' : ''}`}
          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <MatIcon
            name={isFav ? 'favorite' : 'favorite_border'}
            size={18}
            style={{ color: isFav ? '#ef4444' : 'rgba(255, 255, 255, 0.55)' }}
          />
        </button>
      </div>

      <div className="channel-card-body">
        <h3 className="channel-name" title={displayName}>
          {displayName}
        </h3>
        
        <div className="channel-meta">
          <span className="channel-group" title={channel.group}>
            {channel.group}
          </span>

          <div className="channel-badges">
            {channel.resolution && (
              <span className="channel-badge badge-resolution">{channel.resolution}</span>
            )}
            {isPlaying && (
              <span className="channel-badge badge-live">
                <span className="live-indicator" /> LIVE
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ChannelCard.displayName = 'ChannelCard';
