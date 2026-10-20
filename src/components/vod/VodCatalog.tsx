// VOD Movies & TV Series Catalog Grid ported and adapted
// Features cinema poster cards, category filters, sorting, and Continue Watching resume shelf.

import React, { useMemo } from 'react';
import {
  Film,
  Sparkles,
  Search,
  Star,
  Play,
  RotateCcw,
  ArrowUpDown,
} from 'lucide-react';
import { useVodStore, type VodSortOption } from '../../stores/useVodStore';
import { useMultiPlaylistStore } from '../../stores/useMultiPlaylistStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import type { VodItem, SeriesItem, PlaybackPosition } from '../../services/vod/VodService';
import type { Channel } from '../../core/domain/types';

interface VodCatalogProps {
  type: 'movies' | 'series';
}

export const VodCatalog: React.FC<VodCatalogProps> = ({ type }) => {
  const isMovies = type === 'movies';

  const movies = useVodStore((s) => s.movies);
  const series = useVodStore((s) => s.series);
  const movieCategories = useVodStore((s) => s.movieCategories);
  const seriesCategories = useVodStore((s) => s.seriesCategories);
  const selectedCategory = useVodStore((s) => s.selectedCategory);
  const setSelectedCategory = useVodStore((s) => s.setSelectedCategory);
  const searchQuery = useVodStore((s) => s.searchQuery);
  const setSearchQuery = useVodStore((s) => s.setSearchQuery);
  const sortBy = useVodStore((s) => s.sortBy);
  const setSortBy = useVodStore((s) => s.setSortBy);
  const continueWatching = useVodStore((s) => s.continueWatching);
  const openDetail = useVodStore((s) => s.openDetail);
  const isLoading = useVodStore((s) => s.isLoading);

  const playlists = useMultiPlaylistStore((s) => s.playlists);
  const activePlaylistId = useMultiPlaylistStore((s) => s.activePlaylistId);
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);

  const playChannel = usePlayerStore((s) => s.playChannel);

  const rawItems: Array<VodItem | SeriesItem> = isMovies ? movies : series;
  const categories = isMovies ? movieCategories : seriesCategories;

  // Filter items by category & search query
  const filteredItems = useMemo(() => {
    let result = rawItems;

    // Filter by category
    if (selectedCategory !== 'ALL') {
      result = result.filter(
        (item) => item.categoryId === selectedCategory || item.category === selectedCategory
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => item.name.toLowerCase().includes(q));
    }

    // Sort items
    return [...result].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'rating') {
        const ratingA = parseFloat(a.rating || '0') || 0;
        const ratingB = parseFloat(b.rating || '0') || 0;
        return ratingB - ratingA;
      }
      // 'recent'
      const dateA = a.releaseDate ? parseInt(a.releaseDate, 10) : 0;
      const dateB = b.releaseDate ? parseInt(b.releaseDate, 10) : 0;
      return dateB - dateA;
    });
  }, [rawItems, selectedCategory, searchQuery, sortBy]);

  // Relevant continue watching items
  const relevantContinueWatching = useMemo(() => {
    return continueWatching.filter((item) => (isMovies ? !item.isSeries : item.isSeries));
  }, [continueWatching, isMovies]);

  const handleResumeClick = (pos: PlaybackPosition) => {
    const channel: Channel = {
      id: pos.id,
      name: pos.title,
      url: pos.url,
      logo: pos.poster || '',
      group: isMovies ? 'Movies' : 'TV Series',
    };
    playChannel(channel);
  };

  return (
    <div style={{ padding: '16px 20px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
      {/* Top Controls: Search, Sort, Category Selector */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          {/* Header Title with Counter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isMovies ? (
              <Film size={24} color="var(--accent-primary)" />
            ) : (
              <Sparkles size={24} color="#a855f7" />
            )}
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
              {isMovies ? 'Movies (VOD)' : 'TV Series Catalog'}
            </h2>
            <span
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {filteredItems.length} titles
            </span>
          </div>

          {/* Right Action: Search Bar & Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
              }}
            >
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${isMovies ? 'movies' : 'series'}...`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '0.85rem',
                  width: '180px',
                }}
              />
            </div>

            {/* Sort Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpDown size={15} color="var(--text-muted)" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as VodSortOption)}
                className="tokerian-select"
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              >
                <option value="recent">Recently Added / Year</option>
                <option value="rating">Top Rated (★)</option>
                <option value="name">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Horizontal Filter Pills */}
        {categories.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`tokerian-btn ${selectedCategory === 'ALL' ? 'tokerian-btn-primary' : ''}`}
              style={{ fontSize: '0.8rem', padding: '6px 16px', borderRadius: 'var(--radius-full)', flexShrink: 0 }}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`tokerian-btn ${selectedCategory === cat.id ? 'tokerian-btn-primary' : ''}`}
                style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: 'var(--radius-full)', flexShrink: 0 }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Continue Watching Section (if partially watched items exist) */}
      {relevantContinueWatching.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <RotateCcw size={16} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
              Continue Watching
            </h3>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '14px',
              overflowX: 'auto',
              paddingBottom: '10px',
              scrollbarWidth: 'thin',
            }}
          >
            {relevantContinueWatching.map((item) => (
              <div
                key={item.id}
                onClick={() => handleResumeClick(item)}
                style={{
                  minWidth: '220px',
                  width: '220px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#0a0d14' }}>
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Film size={32} color="var(--text-muted)" />
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'rgba(99, 102, 241, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Play size={16} fill="#fff" color="#fff" />
                    </div>
                  </div>

                  {/* Bottom Progress Bar */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(255, 255, 255, 0.2)' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${item.percentage}%`,
                        background: 'var(--accent-primary)',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.title}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {Math.floor(item.currentTime / 60)}m watched ({Math.round(item.percentage)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posters Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <span>Loading catalog...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          {isMovies ? <Film size={44} style={{ opacity: 0.5, marginBottom: '12px' }} /> : <Sparkles size={44} style={{ opacity: 0.5, marginBottom: '12px' }} />}
          <h3 style={{ margin: '0 0 6px', color: '#fff' }}>No {isMovies ? 'Movies' : 'TV Series'} Found</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            {activePlaylist?.type === 'built-in'
              ? 'Tokerian Global built-in catalog focuses on Live Television. Switch to an Xtream Codes account or upload an M3U with VOD files in Playlists & Accounts.'
              : 'No items match your category or search filter.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '18px',
          }}
        >
          {filteredItems.map((item) => {
            const poster = isMovies ? (item as any).logo : (item as any).cover;

            return (
              <div
                key={item.id}
                onClick={() => openDetail(item, activePlaylist)}
                className="tokerian-vod-card"
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* 2:3 Aspect Ratio Poster Frame */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '150%', // 2:3 ratio
                    background: '#0a0d14',
                    overflow: 'hidden',
                  }}
                >
                  {poster ? (
                    <img
                      src={poster}
                      alt={item.name}
                      loading="lazy"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease',
                      }}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {isMovies ? <Film size={36} /> : <Sparkles size={36} />}
                      <span style={{ fontSize: '0.72rem', textAlign: 'center', padding: '0 8px' }}>
                        {item.name}
                      </span>
                    </div>
                  )}

                  {/* Top Floating Rating Badge */}
                  {item.rating && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(4px)',
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#facc15',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
                      }}
                    >
                      <Star size={11} fill="#facc15" />
                      <span>{item.rating}</span>
                    </div>
                  )}

                  {/* Year Tag */}
                  {item.releaseDate && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(4px)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        color: '#e2e8f0',
                      }}
                    >
                      {item.releaseDate}
                    </div>
                  )}
                </div>

                {/* Card Title & Category */}
                <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#fff',
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                    title={item.name}
                  >
                    {item.name}
                  </h4>
                  <span
                    style={{
                      marginTop: '4px',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
