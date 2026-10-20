import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  key: string;
  description: string;
  category: string;
}

const SHORTCUTS: ShortcutEntry[] = [
  { key: 'Ctrl + K / ⌘K', description: 'Open Command Palette & Global Search', category: 'General' },
  { key: 'G or E', description: 'Open TV Guide (EPG Timeline Matrix)', category: 'General' },
  { key: 'Space', description: 'Play / Pause active stream', category: 'Player' },
  { key: 'F', description: 'Toggle Fullscreen', category: 'Player' },
  { key: 'M', description: 'Toggle Mute Audio', category: 'Player' },
  { key: 'Arrow Left / Right', description: 'Seek Backward / Forward 10s', category: 'Player' },
  { key: 'Arrow Up / Down', description: 'Increase / Decrease Volume or Channel Nav', category: 'Navigation' },
  { key: 'Enter / Return', description: 'Select item or play focused channel', category: 'Navigation' },
  { key: 'ESC / Back', description: 'Close active modal, drawer or back to channels', category: 'General' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const categories = Array.from(new Set(SHORTCUTS.map((s) => s.category)));

  return (
    <div className="tokerian-modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="tokerian-modal glass-panel"
        style={{ maxWidth: '520px', width: '92vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="tokerian-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <Keyboard size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                Keyboard Shortcuts
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                IPTVnator hotkeys and navigation controls
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="tokerian-btn-icon"
            style={{ padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="tokerian-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: '18px' }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                }}
              >
                {cat}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {SHORTCUTS.filter((s) => s.category === cat).map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{s.description}</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: 'var(--accent-primary)',
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Command size={14} />
            <span>Works across Web, Desktop & Android TV</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="tokerian-btn tokerian-btn-primary"
            style={{ padding: '5px 14px', fontSize: '0.8rem' }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
