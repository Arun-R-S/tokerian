export interface ExternalPlayerOptions {
  player: 'vlc' | 'mpv';
  url: string;
  title?: string;
  userAgent?: string;
  referer?: string;
  customPath?: string;
}

export interface ExternalPlayerCheckResult {
  vlc: boolean;
  mpv: boolean;
  vlcPath?: string;
  mpvPath?: string;
  platform: string;
}

export interface TokerianDesktopBridge {
  isElectron: boolean;
  platform: string;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  toggleFullscreen: () => void;
  checkExternalPlayers: (customPaths?: { vlc?: string; mpv?: string }) => Promise<ExternalPlayerCheckResult>;
  openExternalPlayer: (options: ExternalPlayerOptions) => Promise<{ success: boolean; error?: string; pid?: number }>;
  openVlc: (url: string, title?: string, customPath?: string) => Promise<{ success: boolean; error?: string }>;
  openMpv: (url: string, title?: string, customPath?: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    tokerianDesktop?: TokerianDesktopBridge;
  }
}
