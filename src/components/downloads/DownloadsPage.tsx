// Dedicated Downloads & DVR Recordings Page
// Features high-aesthetic segmented pill filters, storage capacity meter,
// and quick actions for offline playback.

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
  Compass,
  Sparkles,
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

interface DownloadsPageProps {
  onTabChange?: (tab: any) => void;
}

export const DownloadsPage: React.FC<DownloadsPageProps> = ({ onTabChange }) => {
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
      {/* Header Bar */}
      <div className="downloads-page-header">
        <div className="downloads-header-left">
          <div className="downloads-title-row">
            <div className="downloads-header-icon-box">
              <Download size={22} />
            </div>
            <div>
              <h1 className="downloads-title">Downloads & Recordings</h1>
              <p className="downloads-subtitle">Manage offline movies, TV series episodes, and live DVR broadcasts</p>
            </div>
            {downloads.filter((d) => d.status === 'downloading').length > 0 && (
              <span className="downloads-active-pill">
                {downloads.filter((d) => d.status === 'downloading').length} Active
              </span>
            )}
          </div>
        </div>

        {/* Storage Drive & Destination Info */}
        <div className="downloads-folder-bar">
          <div className="downloads-storage-summary">
            <span className="storage-label">Storage Used:</span>
            <strong className="storage-value">{formatBytes(totalTrackedBytes)}</strong>
          </div>
          <div className="folder-path-box" title={recordingFolder}>
            <FolderOpen size={16} color="var(--accent-primary)" />
            <span className="folder-path-text">{recordingFolder}</span>
          </div>
          <button
            type="button"
            onClick={handleChangeFolder}
            className="tokerian-btn"
            style={{ fontSize: '0.8rem', padding: '7px 14px' }}
          >
            Change Path
          </button>
        </div>
      </div>

      {/* Segmented Filter Pills */}
      <div className="downloads-filter-bar">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`download-filter-pill ${activeFilter === 'all' ? 'pill-active' : ''}`}
        >
          <Sparkles size={15} />
          <span>All</span>
          <span className="download-pill-badge">{downloads.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('movies')}
          className={`download-filter-pill ${activeFilter === 'movies' ? 'pill-active' : ''}`}
        >
          <Film size={15} />
          <span>Movies</span>
          <span className="download-pill-badge">
            {downloads.filter((d) => d.type === 'movie').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('series')}
          className={`download-filter-pill ${activeFilter === 'series' ? 'pill-active' : ''}`}
        >
          <Layers size={15} />
          <span>Series</span>
          <span className="download-pill-badge">
            {downloads.filter((d) => d.type === 'episode').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('inprogress')}
          className={`download-filter-pill ${activeFilter === 'inprogress' ? 'pill-active' : ''}`}
        >
          <Clock size={15} />
          <span>In Progress</span>
          <span className="download-pill-badge">
            {downloads.filter((d) => d.status === 'downloading' || d.status === 'queued').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('recordings')}
          className={`download-filter-pill ${activeFilter === 'recordings' ? 'pill-active' : ''}`}
        >
          <HardDrive size={15} />
          <span>Live Recordings</span>
          <span className="download-pill-badge">
            {downloads.filter((d) => d.type === 'recording').length}
          </span>
        </button>
      </div>

      {/* Empty State or Downloads List */}
      {filteredDownloads.length === 0 ? (
        <div className="downloads-empty-state glass-panel">
          <div className="downloads-empty-glyph-box">
            <Download size={48} className="empty-glyph-icon" />
          </div>
          <h2 className="empty-title">No Downloads or Live Recordings</h2>
          <p className="empty-description">
            Your offline media library is currently empty. You can download movies, entire TV series, or schedule DVR recordings from any live broadcast channel for offline viewing anywhere.
          </p>

          <div className="downloads-empty-actions">
            {onTabChange && (
              <>
                <button
                  type="button"
                  onClick={() => onTabChange('movies')}
                  className="tokerian-btn tokerian-btn-primary"
                >
                  <Film size={16} /> Browse Movies to Download
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('channels')}
                  className="tokerian-btn"
                >
                  <Compass size={16} /> Explore Live Channels
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="downloads-content-grid">
          {filteredDownloads.map((item) => (
            <div key={item.id} className="download-card glass-panel">
              <div className="download-card-info">
                <span className="download-card-title">{item.title}</span>
                <span className="download-card-meta">
                  {formatBytes(item.sizeBytes)} • {item.type.toUpperCase()}
                </span>
              </div>
              <div className="download-card-actions">
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
