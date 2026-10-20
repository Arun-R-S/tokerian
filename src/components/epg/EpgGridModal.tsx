// Multi-Channel EPG Timeline Grid Modal ported and adapted
// Displays multi-channel broadcast matrix with timeline slots, live progress, and show details.

import React, { useState, useMemo } from 'react';
import { X, Search, Play, Calendar } from 'lucide-react';
import { useChannelStore } from '../../stores/useChannelStore';
import { useEpgStore } from '../../stores/useEpgStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import type { EpgProgramItem } from '../../services/epg/EpgService';
import type { Channel } from '../../core/domain/types';

interface EpgGridModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EpgGridModal: React.FC<EpgGridModalProps> = ({ isOpen, onClose }) => {
  const channels = useChannelStore((s) => s.channels);
  const playChannel = usePlayerStore((s) => s.playChannel);
  const currentChannel = usePlayerStore((s) => s.currentChannel);
  const getChannelPrograms = useEpgStore((s) => s.getChannelPrograms);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<{
    program: EpgProgramItem;
    channel: Channel;
  } | null>(null);

  // Time window: 1 hour in past to 3 hours in future
  const timeWindow = useMemo(() => {
    const now = new Date();
    // Round down to current half hour
    const start = new Date(now);
    start.setMinutes(start.getMinutes() < 30 ? 0 : 30, 0, 0);
    start.setHours(start.getHours() - 1); // 1 hour past

    const totalHours = 4;
    const slots: Date[] = [];
    for (let i = 0; i < totalHours * 2; i++) {
      const slot = new Date(start.getTime() + i * 30 * 60 * 1000);
      slots.push(slot);
    }

    const end = new Date(start.getTime() + totalHours * 60 * 60 * 1000);

    return {
      startMs: start.getTime(),
      endMs: end.getTime(),
      totalMs: totalHours * 60 * 60 * 1000,
      slots,
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter channels based on search query
  const filteredChannels = channels.filter((ch) => {
    if (!searchQuery.trim()) return true;
    return (
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ch.group && ch.group.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }).slice(0, 50); // limit to top 50 in view for silky smooth 60fps scrolling

  const formatSlotTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleChannelClick = (channel: Channel) => {
    playChannel(channel);
    onClose();
  };

  // Calculate now marker position percentage
  const nowMs = Date.now();
  const nowPositionPct = Math.min(
    100,
    Math.max(0, ((nowMs - timeWindow.startMs) / timeWindow.totalMs) * 100)
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        style={{
          width: '95vw',
          maxWidth: '1280px',
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(8, 10, 16, 0.95)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={22} color="var(--accent-primary)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>TV Guide & Schedule</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Multi-channel broadcast matrix & electronic program guide
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                padding: '4px 12px',
                width: '240px',
              }}
            >
              <Search size={14} color="var(--text-muted)" style={{ marginRight: '6px' }} />
              <input
                type="text"
                placeholder="Filter channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>

            <button type="button" onClick={onClose} className="tokerian-btn-icon" title="Close Guide">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* EPG Timeline Matrix Container */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {/* Timeline Header Row */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 20, 32, 0.9)' }}>
            {/* Fixed Left Header Corner (Channels column) */}
            <div
              style={{
                width: '220px',
                minWidth: '220px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                borderRight: '1px solid var(--border-subtle)',
              }}
            >
              Channels ({filteredChannels.length})
            </div>

            {/* Time Slot Columns */}
            <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
              {timeWindow.slots.map((slot, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '10px 8px',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                    textAlign: 'center',
                  }}
                >
                  {formatSlotTime(slot)}
                </div>
              ))}
            </div>
          </div>

          {/* Matrix Rows (Scrollable) */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
            {/* Vertical "NOW" Live Red Indicator Line */}
            {nowPositionPct > 0 && nowPositionPct < 100 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `calc(220px + ${nowPositionPct}% * (1 - 220px / 100%))`,
                  width: '2px',
                  background: '#ef4444',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                  zIndex: 20,
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    position: 'sticky',
                    top: '2px',
                    left: '-16px',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '1px 4px',
                    borderRadius: '2px',
                    width: '32px',
                    textAlign: 'center',
                  }}
                >
                  NOW
                </div>
              </div>
            )}

            {filteredChannels.map((channel) => {
              const isPlayingThis = currentChannel?.id === channel.id;
              const programs = getChannelPrograms(channel.tvgId, channel.name);

              return (
                <div
                  key={channel.id}
                  style={{
                    display: 'flex',
                    minHeight: '62px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    background: isPlayingThis ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  }}
                >
                  {/* Left Column: Channel Info & Quick Play */}
                  <div
                    onClick={() => handleChannelClick(channel)}
                    style={{
                      width: '220px',
                      minWidth: '220px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      borderRight: '1px solid var(--border-subtle)',
                      background: isPlayingThis ? 'rgba(99, 102, 241, 0.15)' : 'rgba(12, 16, 26, 0.7)',
                      cursor: 'pointer',
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                    }}
                    title="Click to play channel"
                  >
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        style={{
                          width: '32px',
                          height: '32px',
                          objectFit: 'contain',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '2px',
                        }}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {channel.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          color: isPlayingThis ? 'var(--accent-primary)' : '#fff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {channel.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{channel.group}</div>
                    </div>

                    <Play
                      size={14}
                      color={isPlayingThis ? 'var(--accent-primary)' : 'var(--text-muted)'}
                      style={{ opacity: isPlayingThis ? 1 : 0.4 }}
                    />
                  </div>

                  {/* Right Column: Timeline Program Blocks */}
                  <div style={{ flex: 1, display: 'flex', position: 'relative', minWidth: '960px' }}>
                    {programs.length > 0 ? (
                      programs
                        .filter((p) => p.stopTimestamp > timeWindow.startMs && p.startTimestamp < timeWindow.endMs)
                        .map((prog, pIdx) => {
                          const progStart = Math.max(prog.startTimestamp, timeWindow.startMs);
                          const progStop = Math.min(prog.stopTimestamp, timeWindow.endMs);
                          const leftPct = ((progStart - timeWindow.startMs) / timeWindow.totalMs) * 100;
                          const widthPct = ((progStop - progStart) / timeWindow.totalMs) * 100;

                          const isCurrentAiring = nowMs >= prog.startTimestamp && nowMs < prog.stopTimestamp;

                          return (
                            <div
                              key={pIdx}
                              onClick={() => setSelectedProgram({ program: prog, channel })}
                              style={{
                                position: 'absolute',
                                left: `${leftPct}%`,
                                width: `${Math.max(1, widthPct)}%`,
                                height: '100%',
                                padding: '6px 8px',
                                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                                background: isCurrentAiring
                                  ? 'rgba(99, 102, 241, 0.15)'
                                  : 'rgba(255, 255, 255, 0.02)',
                                borderTop: isCurrentAiring ? '2px solid var(--accent-primary)' : 'none',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                transition: 'background var(--transition-fast)',
                              }}
                              title={`${prog.title} (${new Date(prog.startTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                            >
                              <div
                                style={{
                                  fontWeight: isCurrentAiring ? 700 : 500,
                                  fontSize: '0.78rem',
                                  color: isCurrentAiring ? '#fff' : 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {prog.title}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.68rem',
                                  color: 'var(--text-muted)',
                                  marginTop: '2px',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {new Date(prog.startTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '16px',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          fontStyle: 'italic',
                        }}
                      >
                        No scheduled guide info for this time window.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Program Synopsis Drawer / Bottom Banner */}
        {selectedProgram && (
          <div
            style={{
              padding: '14px 20px',
              background: 'rgba(12, 16, 26, 0.98)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  {selectedProgram.program.title}
                </h4>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--accent-primary)',
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {new Date(selectedProgram.program.startTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {new Date(selectedProgram.program.stopTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  on <strong>{selectedProgram.channel.name}</strong>
                </span>
              </div>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  maxHeight: '38px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedProgram.program.desc || 'No program description provided by broadcaster.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleChannelClick(selectedProgram.channel)}
                className="tokerian-btn tokerian-btn-primary"
                style={{ fontSize: '0.85rem', padding: '8px 18px' }}
              >
                <Play size={15} fill="currentColor" /> Watch Channel
              </button>
              <button
                type="button"
                onClick={() => setSelectedProgram(null)}
                className="tokerian-btn-icon"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
