// Playlist Manager Modal ported and adapted
// Manages, switches, renames, and deletes saved playlists.

import React, { useState } from 'react';
import { X, Plus, Trash2, Check, Radio, Edit2, Server, FileText, Globe } from 'lucide-react';
import { useMultiPlaylistStore, type PlaylistRecord } from '../../stores/useMultiPlaylistStore';

interface PlaylistManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddModal: () => void;
}

export const PlaylistManagerModal: React.FC<PlaylistManagerModalProps> = ({
  isOpen,
  onClose,
  onOpenAddModal,
}) => {
  const playlists = useMultiPlaylistStore((s) => s.playlists);
  const activePlaylistId = useMultiPlaylistStore((s) => s.activePlaylistId);
  const isSwitching = useMultiPlaylistStore((s) => s.isSwitching);
  const selectPlaylist = useMultiPlaylistStore((s) => s.selectPlaylist);
  const removePlaylist = useMultiPlaylistStore((s) => s.removePlaylist);
  const renamePlaylist = useMultiPlaylistStore((s) => s.renamePlaylist);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  if (!isOpen) return null;

  const handleStartRename = (playlist: PlaylistRecord) => {
    setEditingId(playlist.id);
    setEditTitle(playlist.title);
  };

  const handleSaveRename = async (id: string) => {
    if (editTitle.trim()) {
      await renamePlaylist(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const getPlaylistIcon = (type: PlaylistRecord['type']) => {
    switch (type) {
      case 'xtream':
        return <Server size={18} color="var(--accent-primary)" />;
      case 'm3u-file':
        return <FileText size={18} color="#38bdf8" />;
      case 'm3u-url':
        return <Globe size={18} color="#a855f7" />;
      default:
        return <Radio size={18} color="#eab308" />;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        style={{ maxWidth: '620px', width: '92%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={22} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Playlists & Accounts</h3>
          </div>
          <button type="button" onClick={onClose} className="tokerian-btn-icon" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Action Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px 8px 24px',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {playlists.length} {playlists.length === 1 ? 'Source' : 'Sources'} Configured
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAddModal();
            }}
            className="tokerian-btn tokerian-btn-primary"
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            <Plus size={15} /> Add Playlist
          </button>
        </div>

        {/* Playlist List */}
        <div
          style={{
            padding: '10px 24px 24px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            flex: 1,
          }}
        >
          {playlists.map((playlist) => {
            const isActive = playlist.id === activePlaylistId;
            const isEditing = editingId === playlist.id;

            return (
              <div
                key={playlist.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: isActive ? '1px solid var(--border-glow)' : '1px solid var(--border-subtle)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Left: Icon & Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getPlaylistIcon(playlist.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="tokerian-input"
                          style={{ padding: '4px 8px', fontSize: '0.85rem', flex: 1 }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(playlist.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(playlist.id)}
                          className="tokerian-btn tokerian-btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              color: '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {playlist.title}
                          </span>
                          {isActive && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: 'rgba(34, 197, 94, 0.2)',
                                color: '#4ade80',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                border: '1px solid rgba(34, 197, 94, 0.4)',
                              }}
                            >
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <span>{playlist.count.toLocaleString()} Channels</span>
                          {playlist.vodCount !== undefined && playlist.vodCount > 0 && (
                            <span>• {playlist.vodCount.toLocaleString()} Movies</span>
                          )}
                          {playlist.seriesCount !== undefined && playlist.seriesCount > 0 && (
                            <span>• {playlist.seriesCount.toLocaleString()} Series</span>
                          )}
                          <span style={{ textTransform: 'uppercase' }}>• {playlist.type}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
                  {!isActive && (
                    <button
                      type="button"
                      disabled={isSwitching}
                      onClick={() => selectPlaylist(playlist.id)}
                      className="tokerian-btn tokerian-btn-primary"
                      style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                    >
                      {isSwitching ? 'Loading...' : 'Switch'}
                    </button>
                  )}

                  {playlist.id !== 'built-in' && !isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartRename(playlist)}
                        className="tokerian-btn-icon"
                        title="Rename Playlist"
                        style={{ width: '32px', height: '32px' }}
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove "${playlist.title}" from Tokerian?`)) {
                            removePlaylist(playlist.id);
                          }
                        }}
                        className="tokerian-btn-icon"
                        title="Delete Playlist"
                        style={{ width: '32px', height: '32px', color: '#f87171' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
