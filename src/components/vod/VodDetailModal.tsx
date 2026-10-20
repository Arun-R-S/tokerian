// VOD & TV Series Detail Modal ported and adapted vod-details component
// Renders backdrop hero, synopsis, ratings, episodes selector, and external player launchers.

import React, { useState } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Star,
  Clock,
  MonitorPlay,
  Copy,
  Check,
} from 'lucide-react';
import { useVodStore } from '../../stores/useVodStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useMultiPlaylistStore } from '../../stores/useMultiPlaylistStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { ExternalPlayerService } from '../../services/player/ExternalPlayerService';
import { XtreamClient, type XtreamEpisode } from '../../services/portal/XtreamClient';
import type { Channel } from '../../core/domain/types';

export const VodDetailModal: React.FC = () => {
  const activeItem = useVodStore((s) => s.activeItem);
  const activeSeriesDetails = useVodStore((s) => s.activeSeriesDetails);
  const isLoadingDetails = useVodStore((s) => s.isLoadingDetails);
  const closeDetail = useVodStore((s) => s.closeDetail);
  const continueWatching = useVodStore((s) => s.continueWatching);
  const clearProgress = useVodStore((s) => s.clearProgress);

  const playChannel = usePlayerStore((s) => s.playChannel);
  const playlists = useMultiPlaylistStore((s) => s.playlists);
  const activePlaylistId = useMultiPlaylistStore((s) => s.activePlaylistId);
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);

  const customVlcPath = useSettingsStore((s) => s.customVlcPath);
  const customMpvPath = useSettingsStore((s) => s.customMpvPath);

  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [copied, setCopied] = useState(false);

  if (!activeItem) return null;

  const isSeries = 'seriesId' in activeItem;
  const savedPosition = continueWatching.find((p) => p.id === activeItem.id);

  // Helper to start playback inside Tokerian
  const handlePlayMovie = () => {
    if (isSeries) return;

    const channelItem: Channel = {
      id: activeItem.id,
      name: activeItem.name,
      url: (activeItem as any).url,
      logo: (activeItem as any).logo || '',
      group: activeItem.category,
    };

    playChannel(channelItem);
    closeDetail();
  };

  // Helper to play a specific TV Series episode
  const handlePlayEpisode = (ep: XtreamEpisode) => {
    if (!activePlaylist?.credentials) return;

    const streamUrl = XtreamClient.buildSeriesStreamUrl(
      activePlaylist.credentials,
      ep.id,
      ep.container_extension || 'mp4'
    );

    const episodeChannel: Channel = {
      id: `episode-${ep.id}`,
      name: `${activeItem.name} - S${selectedSeason}E${ep.episode_num}: ${ep.title}`,
      url: streamUrl,
      logo: ep.info?.movie_image || (activeItem as any).cover || '',
      group: activeItem.category,
    };

    playChannel(episodeChannel);
    closeDetail();
  };

  const handleLaunchExternal = async (player: 'vlc' | 'mpv', url: string, title: string) => {
    const customPath = player === 'vlc' ? customVlcPath : customMpvPath;
    await ExternalPlayerService.launch(player, url, title, customPath);
  };

  const handleCopy = async (url: string) => {
    const ok = await ExternalPlayerService.copyStreamUrl(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const poster = isSeries
    ? (activeItem as any).cover || (activeSeriesDetails?.info?.cover)
    : (activeItem as any).logo;

  const plot = isSeries
    ? activeSeriesDetails?.info?.plot || (activeItem as any).plot
    : (activeItem as any).plot;

  const rating = isSeries
    ? activeSeriesDetails?.info?.rating || activeItem.rating
    : activeItem.rating;

  const genre = isSeries
    ? activeSeriesDetails?.info?.genre || (activeItem as any).genre
    : activeItem.category;

  const cast = isSeries ? activeSeriesDetails?.info?.cast || (activeItem as any).cast : null;
  const director = isSeries ? activeSeriesDetails?.info?.director || (activeItem as any).director : null;

  // TV Series Seasons & Episodes
  const seasons = activeSeriesDetails?.seasons || [];
  const episodesBySeason = activeSeriesDetails?.episodes || {};
  const currentEpisodes: XtreamEpisode[] = episodesBySeason[String(selectedSeason)] || [];

  return (
    <div className="modal-backdrop" onClick={closeDetail}>
      <div
        className="modal-content glass-panel"
        style={{
          maxWidth: '850px',
          width: '92vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header / Backdrop Banner */}
        <div
          style={{
            position: 'relative',
            minHeight: '260px',
            background: poster
              ? `linear-gradient(to bottom, rgba(7, 9, 14, 0.4) 0%, rgba(7, 9, 14, 0.95) 100%), url(${poster}) center/cover no-repeat`
              : 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeDetail}
            className="tokerian-btn-icon"
            style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', width: '100%' }}>
            {/* Poster Thumbnail */}
            {poster && (
              <img
                src={poster}
                alt={activeItem.name}
                style={{
                  width: '130px',
                  height: '190px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  flexShrink: 0,
                }}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}

            {/* Meta Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: isSeries ? 'rgba(168, 85, 247, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    color: isSeries ? '#c084fc' : '#818cf8',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {isSeries ? 'TV Series' : 'Movie (VOD)'}
                </span>

                {rating && (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#facc15',
                      background: 'rgba(250, 204, 21, 0.15)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    <Star size={13} fill="#facc15" /> {rating}
                  </span>
                )}

                {activeItem.releaseDate && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {activeItem.releaseDate}
                  </span>
                )}
              </div>

              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                {activeItem.name}
              </h2>

              {genre && (
                <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {genre}
                </p>
              )}

              {/* Action Buttons for Movies */}
              {!isSeries && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handlePlayMovie}
                    className="tokerian-btn tokerian-btn-primary"
                    style={{ padding: '8px 20px', fontSize: '0.9rem', gap: '8px' }}
                  >
                    <Play size={16} fill="currentColor" />
                    {savedPosition && savedPosition.currentTime > 10
                      ? `Resume (${Math.floor(savedPosition.currentTime / 60)}m)`
                      : 'Watch Movie'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchExternal('vlc', (activeItem as any).url, activeItem.name)}
                    className="tokerian-btn"
                    title="Play in VLC Media Player"
                  >
                    <MonitorPlay size={16} color="#f97316" /> VLC
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchExternal('mpv', (activeItem as any).url, activeItem.name)}
                    className="tokerian-btn"
                    title="Play in MPV Player"
                  >
                    <MonitorPlay size={16} color="#8b5cf6" /> MPV
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy((activeItem as any).url)}
                    className="tokerian-btn"
                  >
                    {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                    {copied ? 'Copied' : 'Copy URL'}
                  </button>

                  {savedPosition && (
                    <button
                      type="button"
                      onClick={() => clearProgress(activeItem.id)}
                      className="tokerian-btn"
                      title="Clear watch progress"
                    >
                      <RotateCcw size={15} /> Reset Progress
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Plot Overview */}
          {plot && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                Synopsis
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {plot}
              </p>
            </div>
          )}

          {/* Cast & Director */}
          {(cast || director) && (
            <div style={{ display: 'flex', gap: '30px', marginBottom: '20px', fontSize: '0.85rem' }}>
              {director && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Director: </span>
                  <span style={{ color: '#fff', fontWeight: 500 }}>{director}</span>
                </div>
              )}
              {cast && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Cast: </span>
                  <span style={{ color: '#fff', fontWeight: 500 }}>{cast}</span>
                </div>
              )}
            </div>
          )}

          {/* Series Season Tabs & Episodes Grid */}
          {isSeries && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  Episodes & Seasons
                </h4>
                {isLoadingDetails && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                    Loading episodes...
                  </span>
                )}
              </div>

              {/* Seasons Selector Tabs */}
              {seasons.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
                  {seasons.map((s) => (
                    <button
                      key={s.season_number}
                      type="button"
                      onClick={() => setSelectedSeason(s.season_number)}
                      className={`tokerian-btn ${selectedSeason === s.season_number ? 'tokerian-btn-primary' : ''}`}
                      style={{ fontSize: '0.82rem', padding: '6px 16px', flexShrink: 0 }}
                    >
                      {s.name || `Season ${s.season_number}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Episode List Cards */}
              {currentEpisodes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {currentEpisodes.map((ep) => (
                    <div
                      key={ep.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        gap: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            fontFamily: 'var(--font-mono)',
                            width: '24px',
                            textAlign: 'center',
                          }}
                        >
                          {ep.episode_num}
                        </span>

                        <div style={{ minWidth: 0 }}>
                          <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                            {ep.title}
                          </h5>
                          {ep.info?.duration && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                              {ep.info.duration}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handlePlayEpisode(ep)}
                          className="tokerian-btn tokerian-btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.8rem', gap: '6px' }}
                        >
                          <Play size={14} fill="currentColor" /> Play
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  {isLoadingDetails
                    ? 'Fetching episodes from server...'
                    : 'No episode listings available for this season.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
