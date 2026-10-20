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
}
