import React, { useEffect } from 'react';
import { X, Keyboard, MonitorPlay } from 'lucide-react';

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
  // General & Navigation
  { key: 'Ctrl + K / ⌘K', description: 'Open Find / Command Palette & Search', category: 'General' },
  { key: 'G or E', description: 'Open TV Guide & Schedule (EPG Matrix)', category: 'General' },
  { key: '?', description: 'Show this Keyboard Shortcuts cheatsheet', category: 'General' },
  { key: 'ESC / Back', description: 'Close modal, drawer, or exit search', category: 'General' },

  // Player & Cinema Controls
  { key: 'Space', description: 'Play / Pause active video stream', category: 'Player' },
  { key: 'F', description: 'Toggle Fullscreen Player mode', category: 'Player' },
  { key: 'M', description: 'Toggle Mute / Unmute audio', category: 'Player' },
  { key: 'Arrow Left / Right', description: 'Seek backward / forward 10s', category: 'Player' },
  { key: 'Arrow Up / Down', description: 'Increase / Decrease volume', category: 'Player' },

  // D-Pad & TV Navigation
  { key: 'D-Pad / Arrow Keys', description: 'Navigate channels, categories & grid cards', category: 'Navigation & TV' },
  { key: 'Enter / OK', description: 'Select item or play highlighted channel', category: 'Navigation & TV' },
  { key: 'Page Up / Page Down', description: 'Zap previous / next channel in playlist', category: 'Navigation & TV' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = Array.from(new Set(SHORTCUTS.map((s) => s.category)));

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div
        className="shortcuts-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-dialog-title"
      >
        {/* Header */}
        <div className="shortcuts-header">
          <div className="shortcuts-header-title">
            <div className="shortcuts-icon-pill">
              <Keyboard size={20} />
            </div>
            <div>
              <h2 id="shortcuts-dialog-title" className="shortcuts-title-text">
                Keyboard Shortcuts
              </h2>
              <span className="shortcuts-subtitle-text">
                Hotkeys and remote navigation controls
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shortcuts-close-btn"
            title="Close (ESC)"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="shortcuts-body">
          {categories.map((cat) => (
            <div key={cat} className="shortcuts-category-section">
              <div className="shortcuts-category-header">
                {cat}
              </div>

              <div className="shortcuts-row-list">
                {SHORTCUTS.filter((s) => s.category === cat).map((s, idx) => (
                  <div key={idx} className="shortcut-item-row">
                    <span className="shortcut-desc">{s.description}</span>
                    <span className="shortcut-key-badge">{s.key}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shortcuts-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MonitorPlay size={15} style={{ color: 'var(--accent-primary)', opacity: 0.9 }} />
            <span>Works across Web, Desktop & Android TV</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="tokerian-btn tokerian-btn-primary"
            style={{ padding: '6px 18px', fontSize: '0.82rem', borderRadius: '8px' }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
