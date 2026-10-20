// Tokerian Domain Models & Types

export interface Channel {
  id: string;
  name: string;
  logo: string;
  url: string;
  group: string;
  country?: string;
  language?: string;
  tvgId?: string;
  tvgName?: string;
  resolution?: string;
  httpReferrer?: string;
  userAgent?: string;
}

export interface AudioTrack {
  id: number;
  name: string;
  language: string;
  default?: boolean;
}

export interface SubtitleTrack {
  id: number;
  name: string;
  language: string;
  default?: boolean;
}

export interface QualityLevel {
  id: number;
  bitrate: number;
  width?: number;
  height?: number;
  name: string;
}

export interface HistoryItem {
  channelId: string;
  channelName: string;
  channelLogo: string;
  group: string;
  timestamp: number;
}

export interface PlaylistPreset {
  id: string;
  title: string;
  description: string;
  url: string;
  category: 'global' | 'genre' | 'country';
  badge?: string;
  icon?: string;
}

export interface Settings {
  m3uUrl: string;
  corsProxyEnabled: boolean;
  corsProxyUrl: string;
  bufferLength: number;
  autoPlayNextOnError: boolean;
  hardwareAcceleration: boolean;
  theme: 'dark' | 'midnight' | 'oled';
  tvMode: boolean;
  pageSize: number;
  defaultExternalPlayer?: 'vlc' | 'mpv';
  customVlcPath?: string;
  customMpvPath?: string;
  cleanChannelTitles?: boolean;
  parentalLockEnabled?: boolean;
  parentalLockPinHash?: string | null;
  lockedKeywords?: string[];
  recordingFolder?: string;
  recordingFormat?: 'ts' | 'mp4' | 'mkv';

  // Complete Settings Spec
  language?: string;
  visualTheme?: 'light' | 'dark' | 'system';
  coverSize?: 'small' | 'medium' | 'large';
  showCoverTitles?: boolean;
  startupView?: 'first' | 'dashboard' | 'channels' | 'sources';
  startupWindowMode?: 'normal' | 'maximized' | 'fullscreen';
  updateChannel?: 'stable' | 'nightly';
  fullscreenChannelPanel?: boolean;
  vodAutoFailover?: boolean;
  stripCountryPrefix?: boolean;
  epgViewMode?: 'timeline' | 'list';
  epgOffsetMinutes?: number;
  preferUploadedEpgOverXtream?: boolean;
  dashboardRails?: {
    continueWatching: boolean;
    favorites: boolean;
    recent: boolean;
    sources: boolean;
  };
  remoteControl?: boolean;
  remoteControlPort?: number;
  tmdbEnabled?: boolean;
  tmdbApiKey?: string;
  m3uVodDetails?: boolean;
  mpvPlayerArguments?: string;
  mpvReuseInstance?: boolean;
  vlcPlayerArguments?: string;
  vlcReuseInstance?: boolean;
  parentalLockRelockMinutes?: number;
}
