import { memo, useCallback, useState } from 'react';
import type { Channel } from '../../core/domain/types';
import { useUserStore } from '../../stores/useUserStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { Tv, Star } from 'lucide-react';

interface ChannelCardProps {
  channel: Channel;
}

/**
 * High-performance memoized ChannelCard.
 * Adheres to Vercel React Best Practices (rerender-memo, rerender-derived-state, list-performance-item-memo).
 */
export const ChannelCard: React.FC<ChannelCardProps> = memo(({ channel }) => {
  const [imageError, setImageError] = useState(false);

  // Atomic state subscriptions
  const isFav = useUserStore(useCallback((s) => s.favorites.has(channel.id), [channel.id]));
  const isPlaying = usePlayerStore(useCallback((s) => s.currentChannel?.id === channel.id, [channel.id]));

  const playChannel = usePlayerStore((s) => s.playChannel);
  const toggleFavorite = useUserStore((s) => s.toggleFavorite);

  const handleCardClick = () => {
    playChannel(channel);
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
              <Tv size={22} className="text-muted" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleFavoriteClick}
          className={`favorite-btn ${isFav ? 'favorite-btn-active' : ''}`}
          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={16} fill={isFav ? '#eab308' : 'none'} color={isFav ? '#eab308' : 'currentColor'} />
        </button>
      </div>

      <div className="channel-card-body">
        <h3 className="channel-name" title={channel.name}>
          {channel.name}
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
