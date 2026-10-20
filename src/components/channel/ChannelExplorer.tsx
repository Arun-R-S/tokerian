import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LayoutGrid,
  List,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Tv,
  Star,
  Play,
  MoreVertical,
  Radio,
  ExternalLink,
  Copy,
  Check,
  ArrowUpDown,
  AlertCircle,
  RefreshCw,
  Folder,
} from 'lucide-react';
import type { Channel } from '../../core/domain/types';
import type { SidebarTab } from '../layout/Sidebar';
import { useChannelStore } from '../../stores/useChannelStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { ExternalPlayerService } from '../../services/player/ExternalPlayerService';
import { ChannelCard } from './ChannelCard';
import { cleanTitle } from '../../utils/channelSanitizer';
import { isContentRestricted } from '../../utils/parentalLock';

export type ChannelViewMode = 'grid' | 'table';
export type ChannelSortOption = 'default' | 'name-asc' | 'name-desc';

interface ChannelExplorerProps {
  activeTab?: SidebarTab;
}

export const ChannelExplorer: React.FC<ChannelExplorerProps> = ({ activeTab = 'channels' }) => {
  const channels = useChannelStore((s) => s.channels);
  const groups = useChannelStore((s) => s.groups);
  const activeCategory = useChannelStore((s) => s.activeCategory);
  const setActiveCategory = useChannelStore((s) => s.setActiveCategory);
  const globalSearchQuery = useChannelStore((s) => s.searchQuery);
  const isLoading = useChannelStore((s) => s.isLoading);
  const loadingProgress = useChannelStore((s) => s.loadingProgress);
  const loadingStatusText = useChannelStore((s) => s.loadingStatusText);
  const error = useChannelStore((s) => s.error);
  const loadPlaylist = useChannelStore((s) => s.loadPlaylist);
  const activePlaylistUrl = useChannelStore((s) => s.activePlaylistUrl);

  const favorites = useUserStore((s) => s.favorites);
  const toggleFavorite = useUserStore((s) => s.toggleFavorite);
  const history = useUserStore((s) => s.history);

  const currentChannel = usePlayerStore((s) => s.currentChannel);
  const playChannel = usePlayerStore((s) => s.playChannel);

  const pageSize = useSettingsStore((s) => s.pageSize) || 100;
  const cleanChannelTitles = useSettingsStore((s) => s.cleanChannelTitles);
  const parentalLockEnabled = useSettingsStore((s) => s.parentalLockEnabled);
  const isSessionUnlocked = useSettingsStore((s) => s.isSessionUnlocked);
  const lockedKeywords = useSettingsStore((s) => s.lockedKeywords);
  const customVlcPath = useSettingsStore((s) => s.customVlcPath);
  const customMpvPath = useSettingsStore((s) => s.customMpvPath);

  // Explorer Local UI State
  const [viewMode, setViewMode] = useState<ChannelViewMode>('grid');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [sortBy, setSortBy] = useState<ChannelSortOption>('default');
  const [visibleCount, setVisibleCount] = useState<number>(pageSize);
  const [activeMenuChannelId, setActiveMenuChannelId] = useState<string | null>(null);
  const [copiedChannelId, setCopiedChannelId] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuChannelId(null);
      }
    };
    if (activeMenuChannelId) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [activeMenuChannelId]);

  // Reset visibleCount on filter or tab change
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [activeCategory, activeTab, globalSearchQuery, sortBy, pageSize]);

  // Filter out adult content if locked
  const isAdultProtected = parentalLockEnabled && !isSessionUnlocked;
  const isAllowed = (name: string, group?: string) => {
    if (!isAdultProtected) return true;
    return !isContentRestricted(name, group, lockedKeywords);
  };

  // 1. Compute Category Channel Counts
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;

    for (const ch of channels) {
      if (!isAllowed(ch.name, ch.group)) continue;
      total++;
      const g = ch.group || 'Uncategorized';
      map.set(g, (map.get(g) || 0) + 1);
    }
    map.set('All', total);
    return map;
  }, [channels, isAdultProtected, lockedKeywords]);

  // 2. Filter Categories List
  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    const list = groups.filter((g) => {
      if (!isAllowed(g)) return false;
      if (!q) return true;
      return g.toLowerCase().includes(q);
    });
    return list;
  }, [groups, categorySearch, isAdultProtected, lockedKeywords]);

  // 3. Compute Displayed Channels
  const displayedChannels = useMemo(() => {
    let sourceList: Channel[] = [];

    if (activeTab === 'favorites') {
      sourceList = channels.filter((c) => favorites.has(c.id || c.url));
    } else if (activeTab === 'history') {
      const historyMap = new Map(history.map((h) => [h.channelId, h.timestamp]));
      sourceList = channels
        .filter((c) => historyMap.has(c.id || c.url))
        .sort((a, b) => (historyMap.get(b.id || b.url) || 0) - (historyMap.get(a.id || a.url) || 0));
    } else {
      sourceList = channels;
    }

    const query = globalSearchQuery.trim().toLowerCase();

    const filtered = sourceList.filter((ch) => {
      if (!isAllowed(ch.name, ch.group)) return false;

      // Category filter (only in channels tab)
      if (activeTab === 'channels' && activeCategory !== 'All' && ch.group !== activeCategory) {
        return false;
      }

      if (!query) return true;

      return (
        ch.name.toLowerCase().includes(query) ||
        (ch.tvgName && ch.tvgName.toLowerCase().includes(query)) ||
        (ch.group && ch.group.toLowerCase().includes(query)) ||
        (ch.country && ch.country.toLowerCase().includes(query)) ||
        (ch.language && ch.language.toLowerCase().includes(query))
      );
    });

    // Apply Sorting
    if (sortBy === 'name-asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    }

    return filtered;
  }, [
    channels,
    activeTab,
    activeCategory,
    globalSearchQuery,
    sortBy,
    favorites,
    history,
    isAdultProtected,
    lockedKeywords,
  ]);

  // Slice visible batch for fast rendering
  const visibleChannels = useMemo(() => {
    return displayedChannels.slice(0, visibleCount);
  }, [displayedChannels, visibleCount]);

  const hasMore = visibleCount < displayedChannels.length;

  // Infinite Scroll Trigger
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

  const handleCopyUrl = (ch: Channel) => {
    if (ch.url) {
      navigator.clipboard.writeText(ch.url);
      setCopiedChannelId(ch.id || ch.url);
      setTimeout(() => setCopiedChannelId(null), 1500);
      setActiveMenuChannelId(null);
    }
  };

  const handleLaunchExternal = async (player: 'vlc' | 'mpv', ch: Channel) => {
    setActiveMenuChannelId(null);
    const path = player === 'vlc' ? customVlcPath : customMpvPath;
    await ExternalPlayerService.launch(player, ch.url, ch.name, path);
  };

  const formatTitle = (name: string) => {
    return cleanChannelTitles ? cleanTitle(name) : name;
  };

  // Loading State
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

  // Error State
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

  return (
    <div className="iptvnator-channel-explorer">
      {/* =========================================================================
          LEFT PANE: Collapsible Categories & Groups Sidebar
          ========================================================================= */}
      {activeTab === 'channels' && (
        <aside
          className={`explorer-categories-pane ${isSidebarCollapsed ? 'categories-pane-collapsed' : ''}`}
        >
          {/* Categories Search Header */}
          <div className="categories-pane-header">
            <div className="categories-search-box">
              <Search size={14} className="categories-search-icon" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Filter groups..."
                className="categories-search-input"
              />
              {categorySearch && (
                <button
                  type="button"
                  onClick={() => setCategorySearch('')}
                  className="categories-search-clear"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <span className="categories-count-tag">
              {filteredCategories.length}
            </span>
          </div>

          {/* Groups List */}
          <div className="categories-pane-list">
            {/* All Channels Group */}
            <div
              className={`category-list-item ${activeCategory === 'All' ? 'category-item-active' : ''}`}
              onClick={() => setActiveCategory('All')}
            >
              <div className="category-item-title-wrap">
                <Folder size={14} className="category-item-icon" />
                <span className="category-item-name">All Channels</span>
              </div>
              <span className="category-item-badge">
                {(categoryCounts.get('All') || 0).toLocaleString()}
              </span>
            </div>

            {/* Individual Category Groups */}
            {filteredCategories.map((group) => {
              if (group === 'All') return null;
              const isActive = activeCategory === group;
              const count = categoryCounts.get(group) || 0;

              return (
                <div
                  key={group}
                  className={`category-list-item ${isActive ? 'category-item-active' : ''}`}
                  onClick={() => setActiveCategory(group)}
                  title={group}
                >
                  <div className="category-item-title-wrap">
                    <span className="category-item-name">{group}</span>
                  </div>
                  <span className="category-item-badge">
                    {count.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* =========================================================================
          RIGHT PANE: Channels Control Toolbar & Main Display Matrix
          ========================================================================= */}
      <div className="explorer-channels-pane">
        {/* Explorer Control Toolbar */}
        <div className="explorer-toolbar">
          <div className="toolbar-left-col">
            {activeTab === 'channels' && (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="tokerian-btn-icon toolbar-collapse-btn"
                title={isSidebarCollapsed ? 'Expand Groups Drawer' : 'Collapse Groups Drawer'}
              >
                {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            )}

            <div className="toolbar-active-category">
              <h2 className="toolbar-category-title">
                {activeTab === 'favorites'
                  ? 'Favorite Channels'
                  : activeTab === 'history'
                  ? 'Watch History'
                  : activeCategory}
              </h2>
              <span className="toolbar-count-pill">
                {displayedChannels.length.toLocaleString()} channels
              </span>
            </div>
          </div>

          <div className="toolbar-right-col">
            {/* Sort Selector Dropdown */}
            <div className="toolbar-sort-wrap">
              <ArrowUpDown size={14} style={{ opacity: 0.6 }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ChannelSortOption)}
                className="toolbar-sort-select"
                title="Sort Channels"
              >
                <option value="default">Default Playlist Order</option>
                <option value="name-asc">Name (A → Z)</option>
                <option value="name-desc">Name (Z → A)</option>
              </select>
            </div>

            {/* View Mode Toggle: Grid vs Table/List */}
            <div className="toolbar-view-toggle">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`view-toggle-btn ${viewMode === 'grid' ? 'view-btn-active' : ''}`}
                title="Grid Cards View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`view-toggle-btn ${viewMode === 'table' ? 'view-btn-active' : ''}`}
                title="Table / List View"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Channels Content: Empty States or Channels Grid / Table */}
        {displayedChannels.length === 0 ? (
          <div className="grid-empty-state" style={{ marginTop: '30px' }}>
            <Tv size={48} color="#64748b" />
            <h3>No Channels Found</h3>
            <p>
              {globalSearchQuery
                ? `No channels matching "${globalSearchQuery}" in this category.`
                : 'Try selecting a different category or refreshing your playlist.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* =========================================================================
             MODE A: Visual Cards Grid
             ========================================================================= */
          <div className="explorer-channels-grid">
            {visibleChannels.map((channel) => (
              <ChannelCard key={channel.id || channel.url} channel={channel} />
            ))}
          </div>
        ) : (
          /* =========================================================================
             MODE B: IPTVnator Table / List View
             ========================================================================= */
          <div className="explorer-channels-table-wrap">
            <table className="iptvnator-channel-table">
              <thead>
                <tr>
                  <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '56px' }}>Logo</th>
                  <th>Channel Name</th>
                  <th>Group</th>
                  <th style={{ width: '90px' }}>Quality</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleChannels.map((channel, idx) => {
                  const chId = channel.id || channel.url;
                  const isPlaying = currentChannel?.id === channel.id || currentChannel?.url === channel.url;
                  const isFav = favorites.has(chId);
                  const isMenuOpen = activeMenuChannelId === chId;

                  return (
                    <tr
                      key={chId}
                      className={`table-channel-row ${isPlaying ? 'table-row-playing' : ''}`}
                      onClick={() => playChannel(channel)}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {idx + 1}
                      </td>

                      <td>
                        <div className="table-logo-box">
                          {channel.logo ? (
                            <img
                              src={channel.logo}
                              alt=""
                              className="table-logo-img"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Radio size={14} style={{ opacity: 0.5 }} />
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="table-name-col">
                          <span className="table-channel-name">
                            {formatTitle(channel.name)}
                          </span>
                          {isPlaying && (
                            <span className="table-live-pill">
                              <span className="compact-live-dot" /> LIVE
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="table-group-badge">
                          {channel.group || 'General'}
                        </span>
                      </td>

                      <td>
                        {channel.resolution ? (
                          <span className="channel-badge badge-resolution">
                            {channel.resolution}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Auto</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div
                          className="table-actions-cell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Play Row Button */}
                          <button
                            type="button"
                            onClick={() => playChannel(channel)}
                            className="table-action-icon-btn play-icon-btn"
                            title="Play Stream"
                          >
                            <Play size={14} fill={isPlaying ? 'currentColor' : 'none'} />
                          </button>

                          {/* Star Favorite Button */}
                          <button
                            type="button"
                            onClick={() => toggleFavorite(chId)}
                            className={`table-action-icon-btn ${isFav ? 'table-fav-active' : ''}`}
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star
                              size={14}
                              fill={isFav ? '#eab308' : 'none'}
                              color={isFav ? '#eab308' : 'currentColor'}
                            />
                          </button>

                          {/* Context Menu Trigger */}
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => setActiveMenuChannelId(isMenuOpen ? null : chId)}
                              className="table-action-icon-btn"
                              title="More options"
                            >
                              <MoreVertical size={14} />
                            </button>

                            {/* Row Options Dropdown */}
                            {isMenuOpen && (
                              <div className="table-row-menu glass-panel" ref={menuRef}>
                                <button
                                  type="button"
                                  onClick={() => handleLaunchExternal('vlc', channel)}
                                  className="table-menu-item"
                                >
                                  <ExternalLink size={13} color="#f97316" />
                                  <span>Play in VLC Player</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleLaunchExternal('mpv', channel)}
                                  className="table-menu-item"
                                >
                                  <ExternalLink size={13} color="#8b5cf6" />
                                  <span>Play in MPV Player</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCopyUrl(channel)}
                                  className="table-menu-item"
                                >
                                  {copiedChannelId === chId ? (
                                    <>
                                      <Check size={13} color="#10b981" />
                                      <span style={{ color: '#10b981' }}>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={13} />
                                      <span>Copy Stream URL</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Infinite Scroll Sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="load-more-section">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + pageSize, displayedChannels.length))}
              className="tokerian-btn tokerian-btn-primary load-more-btn"
            >
              <span>Load Next {Math.min(pageSize, displayedChannels.length - visibleCount)} Channels</span>
            </button>
            <span className="load-more-hint">Scroll down to load automatically</span>
          </div>
        )}
      </div>
    </div>
  );
};
