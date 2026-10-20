// EPG Live Timeline Ribbon ported and adapted
// Displays "Now Playing", remaining minutes, progress bar, and "Next Up" preview.

import React from 'react';
import { useEpgStore } from '../../stores/useEpgStore';
import { Clock, Calendar } from 'lucide-react';

interface EpgRibbonProps {
  tvgId?: string;
  channelName: string;
  compact?: boolean;
  onOpenFullGuide?: () => void;
}

export const EpgRibbon: React.FC<EpgRibbonProps> = ({
  tvgId,
  channelName,
  compact = false,
  onOpenFullGuide,
}) => {
  const getLiveProgramInfo = useEpgStore((s) => s.getLiveProgramInfo);
  const liveInfo = getLiveProgramInfo(tvgId, channelName);
  const { current, next, progressPct, remainingMinutes } = liveInfo;

  if (!current) {
    return (
      <div
        className="epg-ribbon epg-ribbon-empty"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: compact ? '4px 8px' : '8px 12px',
          background: 'rgba(0, 0, 0, 0.45)',
          borderRadius: 'var(--radius-sm)',
          fontSize: compact ? '0.72rem' : '0.8rem',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={compact ? 12 : 14} /> Live Broadcast
        </span>
        {onOpenFullGuide && (
          <button
            type="button"
            onClick={onOpenFullGuide}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
            }}
          >
            <Calendar size={12} /> TV Guide
          </button>
        )}
      </div>
    );
  }

  // Format time HH:MM
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  const startTimeStr = formatTime(current.start);
  const stopTimeStr = formatTime(current.stop);

  return (
    <div
      className={`epg-ribbon ${compact ? 'epg-ribbon-compact' : ''}`}
      style={{
        background: 'rgba(10, 14, 24, 0.75)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-sm)',
        padding: compact ? '6px 10px' : '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '4px' : '6px',
      }}
    >
      {/* Top Row: Current Program Title & Time */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontWeight: 700,
              color: '#fff',
              fontSize: compact ? '0.8rem' : '0.88rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={current.title}
          >
            {current.title}
          </span>
          {current.category && (
            <span
              style={{
                fontSize: '0.65rem',
                padding: '1px 6px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}
            >
              {current.category}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: compact ? '0.72rem' : '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {startTimeStr} - {stopTimeStr}
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#818cf8',
              background: 'rgba(99, 102, 241, 0.18)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {remainingMinutes}m left
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: compact ? '3px' : '4px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progressPct}%`,
            height: '100%',
            background: 'var(--accent-gradient)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Bottom Row: Next Up Preview & Guide trigger */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
        {next ? (
          <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Next:</strong> {next.title} ({formatTime(next.start)})
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>Followed by scheduled programming</span>
        )}

        {onOpenFullGuide && (
          <button
            type="button"
            onClick={onOpenFullGuide}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontWeight: 600,
              marginLeft: '8px',
              flexShrink: 0,
            }}
          >
            <Calendar size={12} /> Full Guide
          </button>
        )}
      </div>
    </div>
  );
};
