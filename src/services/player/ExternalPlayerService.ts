// External Player Service ported and adapted from IPTVnator
// Orchestrates spawning and IPC communication for desktop media players (VLC, MPV).

export interface ExternalPlayerLaunchResult {
  success: boolean;
  player: 'vlc' | 'mpv';
  error?: string;
  pid?: number;
  isWebFallback?: boolean;
}

export class ExternalPlayerService {
  /**
   * Returns true if currently running within the Electron desktop wrapper.
   */
  static isDesktopApp(): boolean {
    return typeof window !== 'undefined' && Boolean(window.tokerianDesktop?.isElectron);
  }

  /**
   * Checks if VLC and MPV are installed and detected on the host OS.
   */
  static async checkInstalled(customPaths?: { vlc?: string; mpv?: string }) {
    if (this.isDesktopApp() && window.tokerianDesktop?.checkExternalPlayers) {
      try {
        return await window.tokerianDesktop.checkExternalPlayers(customPaths);
      } catch (err) {
        console.warn('Failed to query external players from desktop host:', err);
      }
    }

    return {
      vlc: false,
      mpv: false,
      platform: 'web',
    };
  }

  /**
   * Spawns an external player process with stream URL, meta-title, and headers.
   */
  static async launch(
    player: 'vlc' | 'mpv',
    url: string,
    title?: string,
    customPath?: string
  ): Promise<ExternalPlayerLaunchResult> {
    if (!url) {
      return { success: false, player, error: 'Empty stream URL' };
    }

    // 1. Electron Desktop Native Process Spawn
    if (this.isDesktopApp() && window.tokerianDesktop?.openExternalPlayer) {
      try {
        const res = await window.tokerianDesktop.openExternalPlayer({
          player,
          url,
          title,
          customPath,
        });

        if (res.success) {
          return { success: true, player, pid: res.pid };
        } else {
          return {
            success: false,
            player,
            error: res.error || `Could not launch ${player.toUpperCase()}. Check executable path in Settings.`,
          };
        }
      } catch (err) {
        return {
          success: false,
          player,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    // 2. Web / Browser / Mobile Fallback
    // For VLC, browsers support the vlc:// custom protocol URL scheme
    if (player === 'vlc') {
      try {
        const vlcUri = `vlc://${url}`;
        window.location.href = vlcUri;
        return { success: true, player, isWebFallback: true };
      } catch (err) {
        return {
          success: false,
          player,
          isWebFallback: true,
          error: 'VLC protocol handler failed. Copy stream URL to open manually.',
        };
      }
    }

    // MPV has no standard registered browser scheme on web, so return fallback notification
    return {
      success: false,
      player,
      isWebFallback: true,
      error: 'MPV direct launching requires Tokerian Desktop. You can copy the stream URL to play in MPV.',
    };
  }

  /**
   * Utility to copy stream URL to clipboard
   */
  static async copyStreamUrl(url: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}
