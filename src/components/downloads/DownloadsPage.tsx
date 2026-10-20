// Dedicated Downloads & DVR Recordings Page ported & adapted from IPTVnator libs/portal/downloads
// Features segmented filters (All, Movies, Series, In Progress, Recordings) and destination folder configuration.

import React, { useState } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import {
  Download,
  Film,
  Layers,
  Clock,
  HardDrive,
  FolderOpen,
  Play,
  Trash2,
} from 'lucide-react';

export type DownloadFilter = 'all' | 'movies' | 'series' | 'inprogress' | 'recordings';

interface DownloadItem {
  id: string;
  title: string;
  type: 'movie' | 'episode' | 'recording';
  sizeBytes: number;
  progressPct: number;
  status: 'completed' | 'downloading' | 'queued' | 'error';
  filePath?: string;
  timestamp: number;
}

export const DownloadsPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<DownloadFilter>('all');
  const recordingFolder = useSettingsStore((s) => s.recordingFolder) || 'C:\\Users\\arunr\\Downloads\\TokerianRecordings';
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  const handleDelete = (id: string) => {
    setDownloads((prev) => prev.filter((item) => item.id !== id));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDownloads = downloads.filter((d) => {
    if (activeFilter === 'movies') return d.type === 'movie';
    if (activeFilter === 'series') return d.type === 'episode';
    if (activeFilter === 'inprogress') return d.status === 'downloading' || d.status === 'queued';
    if (activeFilter === 'recordings') return d.type === 'recording';
    return true;
  });

  const totalTrackedBytes = downloads.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);

  const handleChangeFolder = () => {
    const next = prompt('Enter default destination folder path for downloads and recordings:', recordingFolder);
    if (next && next.trim()) {
      updateSettings({ recordingFolder: next.trim() });
    }
  };

  return (
    <div className="downloads-page-container">
      {/* Header */}
      <div className="downloads-page-header">
        <div className="downloads-header-left">
          <div className="downloads-title-row">
            <h1 className="downloads-title">Downloads & Recordings</h1>
            {downloads.filter((d) => d.status === 'downloading').length > 0 && (
              <span className="downloads-active-pill">
                {downloads.filter((d) => d.status === 'downloading').length} Active
              </span>
            )}
          </div>
          <div className="downloads-tracked-metric">
            <span>Tracked Storage: </span>
            <strong>{formatBytes(totalTrackedBytes)}</strong>
          </div>
        </div>

        <div className="downloads-folder-bar">
          <div className="folder-path-box" title={recordingFolder}>
            <FolderOpen size={16} color="var(--accent-primary)" />
            <span className="folder-path-text">{recordingFolder}</span>
          </div>
          <button
            type="button"
            onClick={handleChangeFolder}
            className="tokerian-btn"
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            Change Folder
          </button>
        </div>
      </div>

      {/* Segmented Filter Pills */}
      <div className="downloads-filter-bar">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`filter-pill ${activeFilter === 'all' ? 'filter-pill-active' : ''}`}
        >
          <span>All</span>
          <span className="filter-count-badge">{downloads.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('movies')}
          className={`filter-pill ${activeFilter === 'movies' ? 'filter-pill-active' : ''}`}
        >
          <Film size={14} />
          <span>Movies</span>
          <span className="filter-count-badge">
            {downloads.filter((d) => d.type === 'movie').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('series')}
          className={`filter-pill ${activeFilter === 'series' ? 'filter-pill-active' : ''}`}
        >
          <Layers size={14} />
          <span>Series</span>
          <span className="filter-count-badge">
            {downloads.filter((d) => d.type === 'episode').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('inprogress')}
          className={`filter-pill ${activeFilter === 'inprogress' ? 'filter-pill-active' : ''}`}
        >
          <Clock size={14} />
          <span>In Progress</span>
          <span className="filter-count-badge">
            {downloads.filter((d) => d.status === 'downloading' || d.status === 'queued').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('recordings')}
          className={`filter-pill ${activeFilter === 'recordings' ? 'filter-pill-active' : ''}`}
        >
          <HardDrive size={14} />
          <span>Live Recordings</span>
          <span className="filter-count-badge">
            {downloads.filter((d) => d.type === 'recording').length}
          </span>
        </button>
      </div>

      {/* Empty State or Downloads List */}
      {filteredDownloads.length === 0 ? (
        <div className="downloads-empty-state glass-panel">
          <div className="empty-icon-wrap">
            <Download size={42} color="#3b82f6" />
          </div>
          <h3 className="empty-title">No downloads or recordings yet</h3>
          <p className="empty-description">
            Use the download button on any movie, series episode, or live stream to save it for offline playback.
          </p>
        </div>
      ) : (
        <div className="downloads-list">
          {filteredDownloads.map((item) => (
            <div key={item.id} className="download-item-card glass-panel">
              <div className="download-item-info">
                <span className="download-item-title">{item.title}</span>
                <span className="download-item-meta">{formatBytes(item.sizeBytes)} • {item.type.toUpperCase()}</span>
              </div>
              <div className="download-item-actions">
                <button type="button" className="tokerian-btn-icon" title="Play">
                  <Play size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="tokerian-btn-icon"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
