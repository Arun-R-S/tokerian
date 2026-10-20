// Add Playlist Modal ported and adapted from IPTVnator
// Supports M3U File drag & drop, Remote M3U URL, and Xtream Codes API integration.

import React, { useState, useRef } from 'react';
import { X, Upload, Server, Check, AlertCircle, FileText, Globe, Radio } from 'lucide-react';
import { M3UImporter } from '../../services/playlist/M3UImporter';
import { XtreamClient, type XtreamCredentials, type XtreamAccountInfo } from '../../services/portal/XtreamClient';
import { useMultiPlaylistStore } from '../../stores/useMultiPlaylistStore';
import type { Channel } from '../../core/domain/types';

interface AddPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabMode = 'file-url' | 'xtream' | 'presets';

export const AddPlaylistModal: React.FC<AddPlaylistModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('file-url');
  const [playlistTitle, setPlaylistTitle] = useState('');

  // File / URL tab state
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xtream Codes tab state
  const [xtreamServer, setXtreamServer] = useState('');
  const [xtreamUser, setXtreamUser] = useState('');
  const [xtreamPass, setXtreamPass] = useState('');
  const [xtreamFormat, setXtreamFormat] = useState<'m3u8' | 'ts'>('m3u8');
  const [accountInfo, setAccountInfo] = useState<XtreamAccountInfo | null>(null);

  // Status state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const addM3uUrlPlaylist = useMultiPlaylistStore((s) => s.addM3uUrlPlaylist);
  const addM3uFilePlaylist = useMultiPlaylistStore((s) => s.addM3uFilePlaylist);
  const addXtreamPlaylist = useMultiPlaylistStore((s) => s.addXtreamPlaylist);

  if (!isOpen) return null;

  const resetForm = () => {
    setUrlInput('');
    setSelectedFile(null);
    setPlaylistTitle('');
    setXtreamServer('');
    setXtreamUser('');
    setXtreamPass('');
    setAccountInfo(null);
    setIsLoading(false);
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPlaylistTitle(M3UImporter.cleanTitle(file.name));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPlaylistTitle(M3UImporter.cleanTitle(file.name));
    }
  };

  // Submit M3U File or URL
  const handleImportM3u = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (selectedFile) {
        setStatusMessage('Reading and parsing file...');
        const res = await M3UImporter.importFromFile(selectedFile);
        setStatusMessage(`Parsed ${res.channels.length.toLocaleString()} channels! Saving...`);

        await addM3uFilePlaylist(
          playlistTitle || res.title,
          selectedFile.name,
          res.channels,
          res.epgUrls
        );
        handleClose();
      } else if (urlInput.trim()) {
        setStatusMessage('Downloading playlist from URL...');
        const res = await M3UImporter.importFromUrl(urlInput.trim());
        setStatusMessage(`Parsed ${res.channels.length.toLocaleString()} channels! Saving...`);

        await addM3uUrlPlaylist(
          playlistTitle || res.title,
          urlInput.trim(),
          res.channels,
          res.epgUrls
        );
        handleClose();
      } else {
        setErrorMessage('Please provide an M3U URL or select a local .m3u file.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to import playlist');
    } finally {
      setIsLoading(false);
    }
  };

  // Test Xtream Connection
  const handleTestXtream = async () => {
    if (!xtreamServer.trim() || !xtreamUser.trim() || !xtreamPass.trim()) {
      setErrorMessage('Please fill in server URL, username, and password.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    setStatusMessage('Authenticating with Xtream server...');

    const creds: XtreamCredentials = {
      serverUrl: xtreamServer,
      username: xtreamUser,
      password: xtreamPass,
      outputFormat: xtreamFormat,
    };

    const res = await XtreamClient.authenticate(creds);
    setIsLoading(false);

    if (res.ok && res.account) {
      setAccountInfo(res.account);
      setStatusMessage('Connected successfully! Account active.');
    } else {
      setErrorMessage(res.error || 'Authentication failed. Please check your credentials.');
    }
  };

  // Submit Xtream Playlist
  const handleImportXtream = async () => {
    if (!xtreamServer.trim() || !xtreamUser.trim() || !xtreamPass.trim()) {
      setErrorMessage('Please fill in server URL, username, and password.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    const creds: XtreamCredentials = {
      serverUrl: xtreamServer,
      username: xtreamUser,
      password: xtreamPass,
      outputFormat: xtreamFormat,
    };

    try {
      setStatusMessage('Connecting and fetching live channel catalog...');
      const liveStreams = await XtreamClient.getLiveStreams(creds);

      const channels: Channel[] = liveStreams.map((item, idx) => ({
        id: `xtream-${item.stream_id}-${idx}`,
        name: item.name || `Live Stream ${item.stream_id}`,
        logo: item.stream_icon || '',
        url: XtreamClient.buildLiveStreamUrl(creds, item.stream_id, xtreamFormat),
        group: item.category_id || 'Live Streams',
        tvgId: item.epg_channel_id || undefined,
      }));

      setStatusMessage(`Found ${channels.length.toLocaleString()} live channels! Saving...`);

      // Optionally check VOD count
      let vodCount = 0;
      let seriesCount = 0;
      try {
        const vods = await XtreamClient.getVodStreams(creds);
        vodCount = vods.length;
        const series = await XtreamClient.getSeries(creds);
        seriesCount = series.length;
      } catch {}

      await addXtreamPlaylist(
        playlistTitle || `Xtream: ${new URL(XtreamClient.normalizeServerUrl(xtreamServer)).hostname}`,
        creds,
        accountInfo || undefined,
        channels,
        vodCount,
        seriesCount
      );

      handleClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to import Xtream catalog');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-content glass-panel"
        style={{ maxWidth: '640px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={22} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Add New Playlist</h3>
          </div>
          <button type="button" onClick={handleClose} className="tokerian-btn-icon" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '8px', padding: '16px 24px 0 24px' }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('file-url');
              setErrorMessage('');
            }}
            className={`tokerian-btn ${activeTab === 'file-url' ? 'tokerian-btn-primary' : ''}`}
            style={{ flex: 1, justifyContent: 'center', padding: '9px 12px', fontSize: '0.85rem' }}
          >
            <Upload size={16} /> M3U File / URL
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('xtream');
              setErrorMessage('');
            }}
            className={`tokerian-btn ${activeTab === 'xtream' ? 'tokerian-btn-primary' : ''}`}
            style={{ flex: 1, justifyContent: 'center', padding: '9px 12px', fontSize: '0.85rem' }}
          >
            <Server size={16} /> Xtream Codes API
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Playlist Name Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              PLAYLIST DISPLAY NAME (OPTIONAL)
            </label>
            <input
              type="text"
              placeholder="e.g. My Premium Sports & News"
              value={playlistTitle}
              onChange={(e) => setPlaylistTitle(e.target.value)}
              className="tokerian-input"
              style={{ width: '100%' }}
            />
          </div>

          {/* TAB 1: M3U File / URL */}
          {activeTab === 'file-url' && (
            <>
              {/* File Drag and Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed rgba(255, 255, 255, 0.15)',
                  background: isDragging ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".m3u,.m3u8,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <FileText size={32} color="var(--accent-primary)" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                {selectedFile ? (
                  <div>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{selectedFile.name}</span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB — Click or drop to replace
                    </span>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      Drag & drop your .m3u or .m3u8 playlist file here
                    </span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      or click to browse from device storage
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR ENTER REMOTE URL</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              </div>

              {/* URL Input */}
              <div>
                <div style={{ position: 'relative' }}>
                  <Globe size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="url"
                    placeholder="https://example.com/playlist.m3u8"
                    value={urlInput}
                    disabled={Boolean(selectedFile)}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (e.target.value && !playlistTitle) {
                        setPlaylistTitle(M3UImporter.cleanTitle(e.target.value));
                      }
                    }}
                    className="tokerian-input"
                    style={{ width: '100%', paddingLeft: '38px' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* TAB 2: Xtream Codes API */}
          {activeTab === 'xtream' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  SERVER URL (HOST & PORT)
                </label>
                <input
                  type="text"
                  placeholder="http://example.iptvserver.com:8080"
                  value={xtreamServer}
                  onChange={(e) => setXtreamServer(e.target.value)}
                  className="tokerian-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    USERNAME
                  </label>
                  <input
                    type="text"
                    placeholder="username"
                    value={xtreamUser}
                    onChange={(e) => setXtreamUser(e.target.value)}
                    className="tokerian-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={xtreamPass}
                    onChange={(e) => setXtreamPass(e.target.value)}
                    className="tokerian-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stream Format:</label>
                  <select
                    value={xtreamFormat}
                    onChange={(e) => setXtreamFormat(e.target.value as 'm3u8' | 'ts')}
                    className="tokerian-input"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  >
                    <option value="m3u8">HLS (.m3u8) - Recommended</option>
                    <option value="ts">MPEG-TS (.ts)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleTestXtream}
                  disabled={isLoading}
                  className="tokerian-btn"
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  <Check size={14} /> Test Login
                </button>
              </div>

              {/* Account Info Pill if Authenticated */}
              {accountInfo && (
                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    fontSize: '0.82rem',
                    color: '#86efac',
                  }}
                >
                  <div><strong>Account Status:</strong> {accountInfo.status} {accountInfo.isTrial ? '(Trial)' : ''}</div>
                  <div><strong>Expires:</strong> {accountInfo.expDate || 'Unlimited'}</div>
                  <div><strong>Connections:</strong> {accountInfo.activeConnections} / {accountInfo.maxConnections}</div>
                </div>
              )}
            </div>
          )}

          {/* Feedback & Error Alerts */}
          {statusMessage && (
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', textAlign: 'center' }}>
              {statusMessage}
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                color: '#fca5a5',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={handleClose} disabled={isLoading} className="tokerian-btn">
            Cancel
          </button>
          <button
            type="button"
            onClick={activeTab === 'file-url' ? handleImportM3u : handleImportXtream}
            disabled={isLoading || (activeTab === 'file-url' && !selectedFile && !urlInput.trim())}
            className="tokerian-btn tokerian-btn-primary"
            style={{ minWidth: '140px', justifyContent: 'center' }}
          >
            {isLoading ? 'Importing...' : 'Add Playlist'}
          </button>
        </div>
      </div>
    </div>
  );
};
