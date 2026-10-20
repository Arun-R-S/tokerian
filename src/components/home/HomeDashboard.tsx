import React, { useMemo } from 'react';
import {
  Play,
  Tv,
  ChevronRight,
  Folder,
  MoreVertical,
  Radio,
  Star,
  Clock,
  FolderPlus,
} from 'lucide-react';
import type { Channel } from '../../core/domain/types';
import type { SidebarTab } from '../layout/Sidebar';
import { useChannelStore } from '../../stores/useChannelStore';
import { useUserStore } from '../../stores/useUserStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useMultiPlaylistStore } from '../../stores/useMultiPlaylistStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useEpgStore } from '../../stores/useEpgStore';
import { cleanTitle } from '../../utils/channelSanitizer';
import { isContentRestricted } from '../../utils/parentalLock';

interface HomeDashboardProps {
  onTabChange: (tab: SidebarTab) => void;
  onOpenPlaylists: () => void;
  onOpenAddPlaylist: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onTabChange,
  onOpenPlaylists,
  onOpenAddPlaylist,
}) => {
  const channels = useChannelStore((s) => s.channels);
  const currentChannel = usePlayerStore((s) => s.currentChannel);
  const playChannel = usePlayerStore((s) => s.playChannel);

  const favorites = useUserStore((s) => s.favorites);
  const history = useUserStore((s) => s.history);

  const playlists = useMultiPlaylistStore((s) => s.playlists);
  const activePlaylistId = useMultiPlaylistStore((s) => s.activePlaylistId);
  const selectPlaylist = useMultiPlaylistStore((s) => s.selectPlaylist);
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);

  const cleanChannelTitles = useSettingsStore((s) => s.cleanChannelTitles);
  const parentalLockEnabled = useSettingsStore((s) => s.parentalLockEnabled);
  const isSessionUnlocked = useSettingsStore((s) => s.isSessionUnlocked);
  const lockedKeywords = useSettingsStore((s) => s.lockedKeywords);

  const getLiveProgramInfo = useEpgStore((s) => s.getLiveProgramInfo);

  // Filter out adult channels if locked
  const isAdultProtected = parentalLockEnabled && !isSessionUnlocked;
  const isAllowed = (name: string, group?: string) => {
    if (!isAdultProtected) return true;
    return !isContentRestricted(name, group, lockedKeywords);
  };

  // 1. Determine Featured / Spotlight Channel
  const featuredChannel: Channel | null = useMemo(() => {
    // Priority 1: Currently loaded channel
    if (currentChannel && isAllowed(currentChannel.name, currentChannel.group)) {
      return currentChannel;
    }
    // Priority 2: Most recent from history
    if (history.length > 0) {
      const recentId = history[0].channelId;
      const found = channels.find((c) => (c.id || c.url) === recentId);
      if (found && isAllowed(found.name, found.group)) return found;
    }
    // Priority 3: First favorite
    if (favorites.size > 0) {
      const favId = Array.from(favorites)[0];
      const found = channels.find((c) => (c.id || c.url) === favId);
      if (found && isAllowed(found.name, found.group)) return found;
    }
    // Priority 4: First available channel from current playlist
    return channels.find((c) => isAllowed(c.name, c.group)) || null;
  }, [currentChannel, history, favorites, channels, isAdultProtected, lockedKeywords]);

  // 2. Favorite Channels List
  const favoriteChannels: Channel[] = useMemo(() => {
    if (favorites.size === 0) return [];
    const list: Channel[] = [];
    for (const ch of channels) {
      if (favorites.has(ch.id || ch.url) && isAllowed(ch.name, ch.group)) {
        list.push(ch);
      }
    }
    return list;
  }, [favorites, channels, isAdultProtected, lockedKeywords]);

  // 3. Recently Watched Channels List
  const recentChannels: Channel[] = useMemo(() => {
    if (history.length === 0) return [];
    const list: Channel[] = [];
    const seen = new Set<string>();

    for (const h of history) {
      if (seen.has(h.channelId)) continue;
      seen.add(h.channelId);

      const found = channels.find((c) => (c.id || c.url) === h.channelId);
      if (found && isAllowed(found.name, found.group)) {
        list.push(found);
      } else if (isAllowed(h.channelName, h.group)) {
        // Fallback reconstructed item if not currently in playlist
        list.push({
          id: h.channelId,
          name: h.channelName,
          logo: h.channelLogo,
          url: '',
          group: h.group,
        });
      }
      if (list.length >= 10) break;
    }
    return list;
  }, [history, channels, isAdultProtected, lockedKeywords]);

  // Helper to format title
  const formatTitle = (name: string) => {
    return cleanChannelTitles ? cleanTitle(name) : name;
  };

  return (
    <div className="iptvnator-home-dashboard">
      {/* =========================================================================
          HERO SPOTLIGHT BANNER: Crimson Glow, Channel Poster & Continue Watching
          ========================================================================= */}
      {featuredChannel && (
        <div className="iptvnator-hero-card">
          <div className="hero-radial-glow" />

          <div className="hero-content-row">
            {/* Left: Channel Poster / Vertical Logo Container */}
            <div className="hero-poster-box">
              {featuredChannel.logo ? (
                <img
                  src={featuredChannel.logo}
                  alt={featuredChannel.name}
                  className="hero-poster-img"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Tv size={42} style={{ opacity: 0.5, color: '#fff' }} />
              )}
            </div>

            {/* Right: Channel Title, Playlist Subtitle & Continue Watching Button */}
            <div className="hero-meta-col">
              <h1 className="hero-channel-title">
                {formatTitle(featuredChannel.name)}
              </h1>
              <span className="hero-playlist-subtitle">
                {activePlaylist?.title || 'IPTV'}
              </span>

              <button
                type="button"
                onClick={() => playChannel(featuredChannel)}
                className="hero-continue-btn"
                title="Continue watching live stream"
              >
                <Play size={16} fill="currentColor" />
                <span>Continue Watching</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: Live Now on Your Favorites
          ========================================================================= */}
      <section className="iptvnator-dashboard-section">
        <div className="dashboard-section-header">
          <div className="section-title-wrap">
            <h2 className="dashboard-section-title">Live now on your favorites</h2>
            <span className="dashboard-count-badge">
              {favoriteChannels.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onTabChange('favorites')}
            className="dashboard-see-all-btn"
          >
            <span>See all</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {favoriteChannels.length === 0 ? (
          <div className="dashboard-empty-row">
            <Star size={18} style={{ opacity: 0.4 }} />
            <span>No favorite channels starred yet. Click the heart icon on any channel to pin it here.</span>
          </div>
        ) : (
          <div className="dashboard-horizontal-scroll">
            {favoriteChannels.map((ch) => {
              const liveInfo = getLiveProgramInfo(ch.tvgId, ch.name);
              const progressPct = liveInfo.progressPct > 0 ? liveInfo.progressPct : 45;

              return (
                <div
                  key={ch.id || ch.url}
                  className="iptvnator-compact-card"
                  onClick={() => playChannel(ch)}
                  title={`Play ${ch.name}`}
                >
                  <div className="compact-card-logo-box">
                    {ch.logo ? (
                      <img
                        src={ch.logo}
                        alt=""
                        className="compact-card-logo"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Radio size={18} style={{ opacity: 0.6 }} />
                    )}
                  </div>

                  <div className="compact-card-info-col">
                    <span className="compact-card-name">
                      {formatTitle(ch.name)}
                    </span>

                    <div className="compact-card-live-row">
                      <span className="compact-live-badge">
                        <span className="compact-live-dot" /> LIVE
                      </span>
                    </div>

                    <div className="compact-progress-track">
                      <div
                        className="compact-progress-fill"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 2: Recently Watched Live TV
          ========================================================================= */}
      <section className="iptvnator-dashboard-section">
        <div className="dashboard-section-header">
          <div className="section-title-wrap">
            <h2 className="dashboard-section-title">Recently watched live TV</h2>
            <span className="dashboard-count-badge">
              {recentChannels.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onTabChange('history')}
            className="dashboard-see-all-btn"
          >
            <span>See all</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {recentChannels.length === 0 ? (
          <div className="dashboard-empty-row">
            <Clock size={18} style={{ opacity: 0.4 }} />
            <span>No watch history yet. Start watching any live channel or movie.</span>
          </div>
        ) : (
          <div className="dashboard-horizontal-scroll">
            {recentChannels.map((ch) => {
              const liveInfo = getLiveProgramInfo(ch.tvgId, ch.name);
              const progressPct = liveInfo.progressPct > 0 ? liveInfo.progressPct : 55;

              return (
                <div
                  key={`rec-${ch.id || ch.url}`}
                  className="iptvnator-compact-card"
                  onClick={() => playChannel(ch)}
                  title={`Resume ${ch.name}`}
                >
                  <div className="compact-card-logo-box">
                    {ch.logo ? (
                      <img
                        src={ch.logo}
                        alt=""
                        className="compact-card-logo"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Radio size={18} style={{ opacity: 0.6 }} />
                    )}
                  </div>

                  <div className="compact-card-info-col">
                    <span className="compact-card-name">
                      {formatTitle(ch.name)}
                    </span>

                    <div className="compact-card-live-row">
                      <span className="compact-live-badge">
                        <span className="compact-live-dot" /> LIVE
                      </span>
                    </div>

                    <div className="compact-progress-track">
                      <div
                        className="compact-progress-fill"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 3: Recently Used Sources
          ========================================================================= */}
      <section className="iptvnator-dashboard-section">
        <div className="dashboard-section-header">
          <div className="section-title-wrap">
            <h2 className="dashboard-section-title">Recently Used Sources</h2>
            <span className="dashboard-count-badge">
              {playlists.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenPlaylists}
            className="dashboard-see-all-btn"
          >
            <span>See all</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="dashboard-horizontal-scroll">
          {playlists.map((p) => {
            const isActive = p.id === activePlaylistId;

            return (
              <div
                key={p.id}
                className={`iptvnator-source-card ${isActive ? 'source-card-active' : ''}`}
                onClick={() => selectPlaylist(p.id)}
                title={`Switch to ${p.title}`}
              >
                <div className="source-card-top-row">
                  <div className="source-card-icon-wrap">
                    <Folder
                      size={22}
                      color={isActive ? 'var(--accent-primary)' : '#94a3b8'}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPlaylists();
                    }}
                    className="source-card-dots-btn"
                    title="Source options"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div className="source-card-bottom-row">
                  <span className="source-card-title">{p.title}</span>
                  <span className="source-card-count">
                    {p.count ? `${p.count.toLocaleString()} channels` : p.type.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Add Source Card */}
          <div
            className="iptvnator-source-card add-source-card"
            onClick={onOpenAddPlaylist}
            title="Import new playlist, URL or Xtream account"
          >
            <div className="add-source-icon-wrap">
              <FolderPlus size={22} color="var(--accent-primary)" />
            </div>
            <span className="source-card-title" style={{ marginTop: 'auto' }}>
              Add Source
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
