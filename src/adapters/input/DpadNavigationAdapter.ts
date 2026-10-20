// D-pad & Remote Control Navigation Engine for Android TV and Desktop

export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

export interface SpatialNavListener {
  onNavigate?: (dir: NavigationDirection) => void;
  onSelect?: () => void;
  onBack?: () => void;
  onPlayPause?: () => void;
  onChannelNext?: () => void;
  onChannelPrev?: () => void;
}

export class DpadNavigationAdapter {
  private listeners: Set<SpatialNavListener> = new Set();
  private isListening = false;

  start(): void {
    if (this.isListening) return;
    this.isListening = true;
    window.addEventListener('keydown', this.handleKeyDown);
  }

  stop(): void {
    if (!this.isListening) return;
    this.isListening = false;
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  subscribe(listener: SpatialNavListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Avoid intercepting input fields when typing search queries or URLs
    const target = e.target as HTMLElement | null;
    const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
    if (isInput && e.key !== 'Escape' && e.key !== 'Enter') {
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.emitNavigate('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.emitNavigate('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.emitNavigate('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.emitNavigate('right');
        break;
      case 'Enter':
      case 'Select':
        this.emitSelect();
        break;
      case 'Escape':
      case 'Back':
      case 'BrowserBack':
        this.emitBack();
        break;
      case ' ':
        // Space bar for play/pause
        if (!isInput) {
          e.preventDefault();
          this.emitPlayPause();
        }
        break;
      case 'PageUp':
      case 'ChannelUp':
        this.emitChannelNext();
        break;
      case 'PageDown':
      case 'ChannelDown':
        this.emitChannelPrev();
        break;
    }
  };

  private emitNavigate(dir: NavigationDirection): void {
    for (const l of this.listeners) l.onNavigate?.(dir);
  }

  private emitSelect(): void {
    for (const l of this.listeners) l.onSelect?.();
  }

  private emitBack(): void {
    for (const l of this.listeners) l.onBack?.();
  }

  private emitPlayPause(): void {
    for (const l of this.listeners) l.onPlayPause?.();
  }

  private emitChannelNext(): void {
    for (const l of this.listeners) l.onChannelNext?.();
  }

  private emitChannelPrev(): void {
    for (const l of this.listeners) l.onChannelPrev?.();
  }
}

export const dpadNavigation = new DpadNavigationAdapter();
