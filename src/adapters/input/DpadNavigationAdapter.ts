// D-pad & Remote Control Navigation Engine for Android TV and Desktop
// Provides 2D geometric spatial navigation, key interception, and remote lifecycle hooks.

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
  private currentFocusedElement: HTMLElement | null = null;

  start(): void {
    if (this.isListening) return;
    this.isListening = true;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('focusin', this.handleFocusIn);
  }

  stop(): void {
    if (!this.isListening) return;
    this.isListening = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('focusin', this.handleFocusIn);
  }

  subscribe(listener: SpatialNavListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleFocusIn = (e: FocusEvent): void => {
    if (e.target instanceof HTMLElement) {
      this.currentFocusedElement = e.target;
    }
  };

  /**
   * Finds the best candidate element in a 2D geometric plane based on Euclidean direction
   */
  public navigateSpatial(dir: NavigationDirection): boolean {
    const focusableQuery =
      'button:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [data-tv-card], .iptvnator-compact-card, .table-channel-row, .category-list-item, .nav-item, .bottom-nav-item, .zap-channel-item';

    const candidates = Array.from(document.querySelectorAll<HTMLElement>(focusableQuery)).filter(
      (el) => {
        // Must be visible
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          el.offsetParent !== null
        );
      }
    );

    if (candidates.length === 0) return false;

    const current =
      (document.activeElement as HTMLElement) || this.currentFocusedElement || candidates[0];

    // If nothing currently focused, focus the first candidate
    if (!document.activeElement || document.activeElement === document.body) {
      candidates[0].focus();
      this.currentFocusedElement = candidates[0];
      return true;
    }

    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    };

    let bestCandidate: HTMLElement | null = null;
    let minDistance = Infinity;

    for (const cand of candidates) {
      if (cand === current || cand.contains(current)) continue;

      const candRect = cand.getBoundingClientRect();
      const candCenter = {
        x: candRect.left + candRect.width / 2,
        y: candRect.top + candRect.height / 2,
      };

      const dx = candCenter.x - currentCenter.x;
      const dy = candCenter.y - currentCenter.y;

      let isInDirection = false;
      let primaryDist = 0;
      let secondaryDist = 0;

      if (dir === 'up') {
        isInDirection = dy < -8;
        primaryDist = Math.abs(dy);
        secondaryDist = Math.abs(dx);
      } else if (dir === 'down') {
        isInDirection = dy > 8;
        primaryDist = Math.abs(dy);
        secondaryDist = Math.abs(dx);
      } else if (dir === 'left') {
        isInDirection = dx < -8;
        primaryDist = Math.abs(dx);
        secondaryDist = Math.abs(dy);
      } else if (dir === 'right') {
        isInDirection = dx > 8;
        primaryDist = Math.abs(dx);
        secondaryDist = Math.abs(dy);
      }

      if (isInDirection) {
        // Weighted distance metric favoring collinear items in direction of movement
        const score = primaryDist + secondaryDist * 2.2;
        if (score < minDistance) {
          minDistance = score;
          bestCandidate = cand;
        }
      }
    }

    if (bestCandidate) {
      bestCandidate.focus();
      bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      this.currentFocusedElement = bestCandidate;
      return true;
    }

    return false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Avoid intercepting text fields unless Enter or Escape
    const target = e.target as HTMLElement | null;
    const isInput =
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.getAttribute('contenteditable') === 'true';

    if (isInput && e.key !== 'Escape' && e.key !== 'Enter') {
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.emitNavigate('up');
        this.navigateSpatial('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.emitNavigate('down');
        this.navigateSpatial('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.emitNavigate('left');
        this.navigateSpatial('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.emitNavigate('right');
        this.navigateSpatial('right');
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

