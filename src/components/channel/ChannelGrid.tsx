import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Channel } from '../../core/domain/types';
import { ChannelCard } from './ChannelCard';
import { useChannelStore } from '../../stores/useChannelStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { type SidebarTab } from '../layout/Sidebar';
import { Star, Clock, Tv, RefreshCw, AlertCircle, ChevronDown, Check } from 'lucide-react';

interface ChannelGridProps {
  activeTab: SidebarTab;
}

export const ChannelGrid: React.FC<ChannelGridProps> = ({ activeTab }) => {
  const channels = useChannelStore((s) => s.channels);
  const activeCategory = useChannelStore((s) => s.activeCategory);
  const searchQuery = useChannelStore((s) => s.searchQuery);
  const isLoading = useChannelStore((s) => s.isLoading);
  const loadingProgress = useChannelStore((s) => s.loadingProgress);
  const loadingStatusText = useChannelStore((s) => s.loadingStatusText);
  const error = useChannelStore((s) => s.error);
  const loadPlaylist = useChannelStore((s) => s.loadPlaylist);
  const activePlaylistUrl = useChannelStore((s) => s.activePlaylistUrl);

  const favorites = useUserStore((s) => s.favorites);
  const history = useUserStore((s) => s.history);
  const pageSize = useSettingsStore((s) => s.pageSize) || 100;

  // Track number of channels to render (starts at pageSize, e.g. 100)
  const [visibleCount, setVisibleCount] = useState<number>(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset pagination whenever filters or tabs change
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [activeTab, activeCategory, searchQuery, pageSize]);

  // Compute displayed channels based on active tab, category, and search query
  const displayedChannels = useMemo(() => {
    let sourceList: Channel[] = [];

    if (activeTab === 'favorites') {
      sourceList = channels.filter((c) => favorites.has(c.id));
    } else if (activeTab === 'history') {
      const historyMap = new Map(history.map((h) => [h.channelId, h.timestamp]));
      sourceList = channels
        .filter((c) => historyMap.has(c.id))
        .sort((a, b) => (historyMap.get(b.id) || 0) - (historyMap.get(a.id) || 0));
    } else {
      sourceList = channels;
    }

    const query = searchQuery.trim().toLowerCase();

    return sourceList.filter((ch) => {
      // Category filter applies only in 'channels' tab
      if (activeTab === 'channels' && activeCategory !== 'All' && ch.group !== activeCategory) {
        return false;
      }

      if (!query) return true;

      return (
        ch.name.toLowerCase().includes(query) ||
        (ch.tvgName && ch.tvgName.toLowerCase().includes(query)) ||
        (ch.country && ch.country.toLowerCase().includes(query)) ||
        (ch.language && ch.language.toLowerCase().includes(query))
      );
    });
  }, [channels, activeTab, activeCategory, searchQuery, favorites, history]);

  // Slice down to visible batch (100, 200, 300, etc.)
  const visibleChannels = useMemo(() => {
    return displayedChannels.slice(0, visibleCount);
  }, [displayedChannels, visibleCount]);

  const hasMore = visibleCount < displayedChannels.length;

  // Infinite scroll trigger via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + pageSize, displayedChannels.length));
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, pageSize, displayedChannels.length]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + pageSize, displayedChannels.length));
  };

  // Loading state
  if (isLoading && channels.length === 0) {
    return (
      <div className="grid-loading-container">
        <div className="spinner" />
        <h3 className="loading-heading">Loading Tokerian Channels</h3>
        <p className="loading-sub">{loadingStatusText}</p>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${loadingProgress}%` }} />
        </div>
      </div>
    );
  }

  // Error state
  if (error && channels.length === 0) {
    return (
      <div className="grid-empty-state">
        <AlertCircle size={48} color="#ef4444" />
        <h3>Failed to Load Playlist</h3>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => loadPlaylist(activePlaylistUrl, true)}
          className="tokerian-btn tokerian-btn-primary"
          style={{ marginTop: '16px' }}
        >
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  // Empty favorites state
  if (activeTab === 'favorites' && displayedChannels.length === 0) {
    return (
      <div className="grid-empty-state">
        <Star size={48} color="#eab308" />
        <h3>No Favorites Added Yet</h3>
        <p>Star your favorite channels in the live channel list to access them quickly here.</p>
      </div>
    );
  }

  // Empty history state
  if (activeTab === 'history' && displayedChannels.length === 0) {
    return (
      <div className="grid-empty-state">
        <Clock size={48} color="#6366f1" />
        <h3>No Watch History</h3>
        <p>Channels you watch will automatically be logged here for instant resumption.</p>
      </div>
    );
  }

  // Empty search state
  if (displayedChannels.length === 0) {
    return (
      <div className="grid-empty-state">
        <Tv size={48} color="#64748b" />
        <h3>No Channels Found</h3>
        <p>Try searching for a different channel name, category, or country.</p>
      </div>
    );
  }

  return (
    <div className="channel-grid-container">
      {/* Active Channels Counter */}
      <div className="channel-grid-status">
        <span className="channel-grid-count">
          Showing <strong>{visibleChannels.length.toLocaleString()}</strong> of{' '}
          <strong>{displayedChannels.length.toLocaleString()}</strong> channels
        </span>
      </div>

      {/* Grid of only the currently visible slice (prevents DOM hang) */}
      <div className="channel-grid">
        {visibleChannels.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} />
        ))}
      </div>

      {/* Infinite Scroll Sentinel & Load More Action */}
      {hasMore && (
        <div ref={sentinelRef} className="load-more-section">
          <button
            type="button"
            onClick={handleLoadMore}
            className="tokerian-btn tokerian-btn-primary load-more-btn"
          >
            <ChevronDown size={18} />
            <span>Load Next {Math.min(pageSize, displayedChannels.length - visibleCount)} Channels</span>
          </button>
          <span className="load-more-hint">Or scroll down to load automatically</span>
        </div>
      )}

      {!hasMore && displayedChannels.length > pageSize && (
        <div className="all-loaded-indicator">
          <Check size={16} className="text-accent" />
          <span>All {displayedChannels.length.toLocaleString()} channels loaded</span>
        </div>
      )}
    </div>
  );
};
