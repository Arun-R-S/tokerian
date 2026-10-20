import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Sliders,
  Calendar,
  FolderPlus,
  Radio,
  Film,
  Layers,
  Star,
  Clock,
  Tv,
  Maximize,
  VolumeX,
  Play,
  SkipForward,
  SkipBack,
  Lock,
  RefreshCw,
  X,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  MonitorPlay,
} from 'lucide-react';
import type { SidebarTab } from '../layout/Sidebar';
import { useChannelStore } from '../../stores/useChannelStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useVodStore } from '../../stores/useVodStore';
import { useMultiPlaylistStore } from '../../stores/useMultiPlaylistStore';
import { isContentRestricted } from '../../utils/parentalLock';
import { cleanTitle } from '../../utils/channelSanitizer';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenPlaylists: () => void;
  onOpenEpgGuide: () => void;
  onTabChange: (tab: SidebarTab) => void;
}

interface PaletteItem {
  id: string;
  category: 'ACTIONS' | 'VIEWS' | 'CHANNELS' | 'VOD';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  onSelect: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenPlaylists,
  onOpenEpgGuide,
  onTabChange,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const channels = useChannelStore((s) => s.channels);
  const loadPlaylist = useChannelStore((s) => s.loadPlaylist);
  const m3uUrl = useSettingsStore((s) => s.m3uUrl);
  const tvMode = useSettingsStore((s) => s.tvMode);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const cleanChannelTitles = useSettingsStore((s) => s.cleanChannelTitles);
  const parentalLockEnabled = useSettingsStore((s) => s.parentalLockEnabled);
  const isSessionUnlocked = useSettingsStore((s) => s.isSessionUnlocked);
  const lockedKeywords = useSettingsStore((s) => s.lockedKeywords);
  const lockParentalSession = useSettingsStore((s) => s.lockParentalSession);

  const playChannel = usePlayerStore((s) => s.playChannel);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const toggleFullscreen = usePlayerStore((s) => s.toggleFullscreen);
  const zapNext = usePlayerStore((s) => s.zapNext);
  const zapPrev = usePlayerStore((s) => s.zapPrev);

  const movies = useVodStore((s) => s.movies);
  const series = useVodStore((s) => s.series);
  const openDetail = useVodStore((s) => s.openDetail);

  const activePlaylistId = useMultiPlaylistStore((s) => s.activePlaylistId);
  const playlists = useMultiPlaylistStore((s) => s.playlists);
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);

  // Focus input automatically on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build items based on search query
  const items = useMemo(() => {
    if (!isOpen) return [];

    const q = query.trim().toLowerCase();
    const result: PaletteItem[] = [];

    // --- 1. QUICK ACTIONS ---
    const actions: PaletteItem[] = [
      {
        id: 'action-epg',
        category: 'ACTIONS',
        title: 'Open TV Guide & Schedule (EPG Matrix)',
        subtitle: 'Multi-channel live broadcast matrix',
        icon: <Calendar size={18} color="var(--accent-primary)" />,
        badge: 'Key G',
        onSelect: () => {
          onClose();
          onOpenEpgGuide();
        },
      },
      {
        id: 'action-playlists',
        category: 'ACTIONS',
        title: 'Manage Playlists & Xtream Accounts',
        subtitle: 'Switch or add M3U files, URLs, Xtream credentials',
        icon: <FolderPlus size={18} color="#38bdf8" />,
        badge: `${playlists.length} Sources`,
        onSelect: () => {
          onClose();
          onOpenPlaylists();
        },
      },
      {
        id: 'action-settings',
        category: 'ACTIONS',
        title: 'Open App Settings & Preferences',
        subtitle: 'Player buffers, CORS proxies, external VLC/MPV, Parental PIN',
        icon: <Sliders size={18} color="#a855f7" />,
        badge: 'Preferences',
        onSelect: () => {
          onClose();
          onOpenSettings();
        },
      },
      {
        id: 'action-tvmode',
        category: 'ACTIONS',
        title: tvMode ? 'Disable TV D-Pad Mode' : 'Enable 10-Foot TV D-Pad Mode',
        subtitle: 'Optimizes cards, buttons & focus halos for Android TV remotes',
        icon: <Tv size={18} color="#fbbf24" />,
        badge: tvMode ? 'Active' : 'Off',
        onSelect: () => {
          updateSettings({ tvMode: !tvMode });
          onClose();
        },
      },
      {
        id: 'action-fullscreen',
        category: 'ACTIONS',
        title: 'Toggle Fullscreen Player',
        subtitle: 'Enter or exit cinema display mode',
        icon: <Maximize size={18} color="#34d399" />,
        badge: 'Key F',
        onSelect: () => {
          toggleFullscreen();
          onClose();
        },
      },
      {
        id: 'action-mute',
        category: 'ACTIONS',
        title: 'Toggle Mute Audio',
        subtitle: 'Silence or restore video player audio stream',
        icon: <VolumeX size={18} color="#f87171" />,
        badge: 'Key M',
        onSelect: () => {
          toggleMute();
          onClose();
        },
      },
      {
        id: 'action-playpause',
        category: 'ACTIONS',
        title: 'Toggle Play / Pause',
        subtitle: 'Play or pause currently loaded channel or VOD',
        icon: <Play size={18} color="#60a5fa" />,
        badge: 'Space',
        onSelect: () => {
          togglePlay();
          onClose();
        },
      },
      {
        id: 'action-zapnext',
        category: 'ACTIONS',
        title: 'Zap Next Channel',
        subtitle: 'Switch to next channel in current playlist',
        icon: <SkipForward size={18} color="#cbd5e1" />,
        badge: 'Ch+',
        onSelect: () => {
          zapNext();
          onClose();
        },
      },
      {
        id: 'action-zapprev',
        category: 'ACTIONS',
        title: 'Zap Previous Channel',
        subtitle: 'Switch to previous channel in current playlist',
        icon: <SkipBack size={18} color="#cbd5e1" />,
        badge: 'Ch-',
        onSelect: () => {
          zapPrev();
          onClose();
        },
      },
      {
        id: 'action-reload',
        category: 'ACTIONS',
        title: 'Reload Active Playlist Streams',
        subtitle: 'Fetch fresh M3U / Xtream live stream entries',
        icon: <RefreshCw size={18} color="#38bdf8" />,
        badge: 'Sync',
        onSelect: () => {
          loadPlaylist(m3uUrl, true);
          onClose();
        },
      },
    ];

    if (parentalLockEnabled) {
      if (isSessionUnlocked) {
        actions.push({
          id: 'action-lock',
          category: 'ACTIONS',
          title: 'Lock Parental Session Now',
          subtitle: 'Re-lock adult categories and channels immediately',
          icon: <Lock size={18} color="#ef4444" />,
          badge: 'Locked',
          onSelect: () => {
            lockParentalSession();
            onClose();
          },
        });
      } else {
        actions.push({
          id: 'action-unlock',
          category: 'ACTIONS',
          title: 'Unlock Parental Session (Enter PIN in Settings)',
          subtitle: 'Verify your 4-digit PIN to show protected content',
          icon: <Lock size={18} color="#f59e0b" />,
          badge: 'PIN',
          onSelect: () => {
            onClose();
            onOpenSettings();
          },
        });
      }
    }

    const filteredActions = q
      ? actions.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            (a.subtitle && a.subtitle.toLowerCase().includes(q))
        )
      : actions;
    result.push(...filteredActions);

    // --- 2. NAVIGATION VIEWS ---
    const views: PaletteItem[] = [
      {
        id: 'view-channels',
        category: 'VIEWS',
        title: 'Go to Live TV Channels',
        subtitle: 'Browse all live channels with categories & logos',
        icon: <Radio size={18} color="var(--accent-primary)" />,
        badge: `${channels.length}`,
        onSelect: () => {
          onTabChange('channels');
          onClose();
        },
      },
      {
        id: 'view-movies',
        category: 'VIEWS',
        title: 'Go to Movies (VOD)',
        subtitle: 'On-demand movies with metadata, ratings & posters',
        icon: <Film size={18} color="#ec4899" />,
        badge: `${movies.length}`,
        onSelect: () => {
          onTabChange('movies');
          onClose();
        },
      },
      {
        id: 'view-series',
        category: 'VIEWS',
        title: 'Go to TV Series Catalog',
        subtitle: 'Episodic series, seasons & episode browser',
        icon: <Layers size={18} color="#8b5cf6" />,
        badge: `${series.length}`,
        onSelect: () => {
          onTabChange('series');
          onClose();
        },
      },
      {
        id: 'view-favorites',
        category: 'VIEWS',
        title: 'Go to Favorite Channels',
        subtitle: 'Quick access to your starred channels',
        icon: <Star size={18} color="#eab308" />,
        onSelect: () => {
          onTabChange('favorites');
          onClose();
        },
      },
      {
        id: 'view-history',
        category: 'VIEWS',
        title: 'Go to Watch History',
        subtitle: 'Recently watched channels and streams',
        icon: <Clock size={18} color="#94a3b8" />,
        onSelect: () => {
          onTabChange('history');
          onClose();
        },
      },
    ];

    const filteredViews = q
      ? views.filter(
          (v) =>
            v.title.toLowerCase().includes(q) ||
            (v.subtitle && v.subtitle.toLowerCase().includes(q))
        )
      : views;
    result.push(...filteredViews);

    // --- 3. LIVE CHANNELS SEARCH (Top matches) ---
    if (q) {
      const isAdultProtected = parentalLockEnabled && !isSessionUnlocked;
      let matchedCount = 0;
      for (const ch of channels) {
        if (matchedCount >= 15) break;

        // Skip restricted content if locked
        if (
          isAdultProtected &&
          isContentRestricted(ch.name, ch.group, lockedKeywords)
        ) {
          continue;
        }

        const nameMatch = ch.name.toLowerCase().includes(q);
        const groupMatch = ch.group?.toLowerCase().includes(q);

        if (nameMatch || groupMatch) {
          matchedCount++;
          const displayName = cleanChannelTitles ? cleanTitle(ch.name) : ch.name;
          result.push({
            id: `ch-${ch.id || ch.url}`,
            category: 'CHANNELS',
            title: displayName,
            subtitle: ch.group || 'Live Stream',
            icon: ch.logo ? (
              <img
                src={ch.logo}
                alt=""
                style={{
                  width: '20px',
                  height: '20px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Radio size={18} color="var(--accent-primary)" />
            ),
            badge: 'Play',
            onSelect: () => {
              playChannel(ch);
              onClose();
            },
          });
        }
      }

      // --- 4. VOD MOVIES & SERIES SEARCH (Top matches) ---
      let vodCount = 0;
      for (const m of movies) {
        if (vodCount >= 6) break;
        if (
          isAdultProtected &&
          isContentRestricted(m.name, m.category, lockedKeywords)
        ) {
          continue;
        }

        if (
          m.name.toLowerCase().includes(q) ||
          m.category?.toLowerCase().includes(q)
        ) {
          vodCount++;
          const yearStr = m.releaseDate ? ` • ${m.releaseDate.slice(0, 4)}` : '';
          result.push({
            id: `vod-m-${m.id}`,
            category: 'VOD',
            title: m.name,
            subtitle: `Movie • ${m.category || 'Cinema'}${yearStr}`,
            icon: <Film size={18} color="#ec4899" />,
            badge: m.rating ? `★ ${m.rating}` : 'Movie',
            onSelect: () => {
              openDetail(m, activePlaylist);
              onClose();
            },
          });
        }
      }

      for (const s of series) {
        if (vodCount >= 10) break;
        if (
          isAdultProtected &&
          isContentRestricted(s.name, s.category, lockedKeywords)
        ) {
          continue;
        }

        if (
          s.name.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q)
        ) {
          vodCount++;
          const yearStr = s.releaseDate ? ` • ${s.releaseDate.slice(0, 4)}` : '';
          result.push({
            id: `vod-s-${s.id}`,
            category: 'VOD',
            title: s.name,
            subtitle: `Series • ${s.category || 'TV Show'}${yearStr}`,
            icon: <Layers size={18} color="#8b5cf6" />,
            badge: s.rating ? `★ ${s.rating}` : 'Series',
            onSelect: () => {
              openDetail(s, activePlaylist);
              onClose();
            },
          });
        }
      }
    }

    return result;
  }, [
    isOpen,
    query,
    channels,
    movies,
    series,
    playlists,
    tvMode,
    parentalLockEnabled,
    isSessionUnlocked,
    lockedKeywords,
    cleanChannelTitles,
    activePlaylist,
    onClose,
    onOpenEpgGuide,
    onOpenPlaylists,
    onOpenSettings,
    onTabChange,
    updateSettings,
    toggleFullscreen,
    toggleMute,
    togglePlay,
    zapNext,
    zapPrev,
    loadPlaylist,
    m3uUrl,
    lockParentalSession,
    playChannel,
    openDetail,
  ]);

  // Adjust selectedIndex when items list changes
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (items.length === 0) return 0;
      if (prev >= items.length) return items.length - 1;
      return prev;
    });
  }, [items.length]);

  // Handle keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length === 0 ? 0 : (prev + 1) % items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        items.length === 0 ? 0 : (prev - 1 + items.length) % items.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Auto-scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="tokerian-modal-backdrop palette-backdrop"
      onClick={onClose}
      style={{
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
      }}
    >
      <div
        className="tokerian-command-palette glass-panel"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="palette-input-wrapper">
          <Search size={20} className="palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="palette-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, jump to channel, or search VOD... (Ctrl+K)"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="palette-clear-btn"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <span className="palette-shortcut-badge">ESC</span>
        </div>

        {/* Results List */}
        <div className="palette-list" ref={listRef}>
          {items.length === 0 ? (
            <div className="palette-empty-state">
              <Search size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p>No commands, channels or media matching &ldquo;{query}&rdquo;</p>
              <span>Try searching for channel names, TV guide, movies, or settings</span>
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const prevItem = items[idx - 1];
              const showCategoryHeader = !prevItem || prevItem.category !== item.category;

              return (
                <React.Fragment key={item.id}>
                  {showCategoryHeader && (
                    <div className="palette-category-header">
                      {item.category === 'ACTIONS' && 'QUICK ACTIONS'}
                      {item.category === 'VIEWS' && 'NAVIGATION VIEWS'}
                      {item.category === 'CHANNELS' && 'LIVE CHANNELS'}
                      {item.category === 'VOD' && 'MOVIES & TV SERIES'}
                    </div>
                  )}

                  <div
                    data-index={idx}
                    className={`palette-item ${isSelected ? 'palette-item-selected' : ''}`}
                    onClick={() => item.onSelect()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="palette-item-icon-col">{item.icon}</div>
                    <div className="palette-item-text-col">
                      <div className="palette-item-title">{item.title}</div>
                      {item.subtitle && (
                        <div className="palette-item-subtitle">{item.subtitle}</div>
                      )}
                    </div>
                    {item.badge && (
                      <span className="palette-item-badge">{item.badge}</span>
                    )}
                    {isSelected && (
                      <CornerDownLeft
                        size={14}
                        className="palette-item-enter-icon"
                      />
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Palette Footer Hints */}
        <div className="palette-footer">
          <div className="palette-footer-shortcuts">
            <span className="palette-footer-hint">
              <span className="kbd-pill">
                <ArrowUp size={11} />
                <ArrowDown size={11} />
              </span>{' '}
              Navigate
            </span>
            <span className="palette-footer-hint">
              <span className="kbd-pill">↵</span> Select
            </span>
            <span className="palette-footer-hint">
              <span className="kbd-pill">ESC</span> Close
            </span>
          </div>

          <div className="palette-footer-brand">
            <MonitorPlay size={13} style={{ opacity: 0.6 }} />
            <span>Tokerian Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
};
