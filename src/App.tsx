import { useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, type SidebarTab } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { CategoryPills } from './components/channel/CategoryPills';
import { ChannelGrid } from './components/channel/ChannelGrid';
import { ChannelExplorer } from './components/channel/ChannelExplorer';
import { VideoPlayer } from './components/player/VideoPlayer';
import { SettingsModal } from './components/settings/SettingsModal';
import { AddPlaylistModal } from './components/playlist/AddPlaylistModal';
import { PlaylistManagerModal } from './components/playlist/PlaylistManagerModal';
import { EpgGridModal } from './components/epg/EpgGridModal';
import { VodCatalog } from './components/vod/VodCatalog';
import { VodDetailModal } from './components/vod/VodDetailModal';
import { CommandPalette } from './components/command/CommandPalette';
import { KeyboardShortcutsModal } from './components/layout/KeyboardShortcutsModal';
import { HomeDashboard } from './components/home/HomeDashboard';
import { SettingsPage } from './components/settings/SettingsPage';
import { DownloadsPage } from './components/downloads/DownloadsPage';
import { Tv } from 'lucide-react';

import { useChannelStore } from './stores/useChannelStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useUserStore } from './stores/useUserStore';
import { usePlayerStore } from './stores/usePlayerStore';
import { useMultiPlaylistStore } from './stores/useMultiPlaylistStore';
import { useEpgStore } from './stores/useEpgStore';
import { useVodStore } from './stores/useVodStore';
import { dpadNavigation } from './adapters/input/DpadNavigationAdapter';

import './styles/index.css';
import './styles/components.css';

export function App() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAddPlaylistOpen, setIsAddPlaylistOpen] = useState(false);
  const [isPlaylistManagerOpen, setIsPlaylistManagerOpen] = useState(false);
  const [isEpgGridOpen, setIsEpgGridOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const m3uUrl = useSettingsStore((s) => s.m3uUrl);
  const loadInitialSettings = useSettingsStore((s) => s.loadInitialSettings);
  const tvMode = useSettingsStore((s) => s.tvMode);

  const loadUserData = useUserStore((s) => s.loadUserData);
  const loadPlaylist = useChannelStore((s) => s.loadPlaylist);
  const initPlaylists = useMultiPlaylistStore((s) => s.initPlaylists);
  const playlists = useMultiPlaylistStore((s) => s.playlists);
  const activePlaylistId = useMultiPlaylistStore((s) => s.activePlaylistId);
  const channels = useChannelStore((s) => s.channels);
  const currentChannel = usePlayerStore((s) => s.currentChannel);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const toggleFullscreen = usePlayerStore((s) => s.toggleFullscreen);
  const zapNext = usePlayerStore((s) => s.zapNext);
  const zapPrev = usePlayerStore((s) => s.zapPrev);

  // Initialize settings, user data (favorites/history), and multi-playlist system
  useEffect(() => {
    async function init() {
      await loadInitialSettings();
      await loadUserData();
      await initPlaylists();

      // Only load default catalog if still on built-in
      const currentActive = useMultiPlaylistStore.getState().activePlaylistId;
      if (currentActive === 'built-in') {
        loadPlaylist(m3uUrl, false);
      }
    }
    init();
  }, [loadInitialSettings, loadUserData, initPlaylists, loadPlaylist, m3uUrl]);

  // EPG Periodic Ticker: Update current time every 30 seconds for live progress ribbon & grid
  useEffect(() => {
    const ticker = setInterval(() => {
      useEpgStore.getState().updateCurrentTime();
    }, 30000);
    return () => clearInterval(ticker);
  }, []);

  // Auto-fetch EPG when active playlist changes (if playlist defines epgUrls)
  useEffect(() => {
    const active = playlists.find((p) => p.id === activePlaylistId);
    if (active?.epgUrls && active.epgUrls.length > 0) {
      useEpgStore.getState().loadEpgUrl(active.epgUrls[0]);
    }
  }, [activePlaylistId, playlists]);

  // Fetch Xtream live EPG whenever playing channel changes on an Xtream playlist
  useEffect(() => {
    if (!currentChannel) return;
    const active = playlists.find((p) => p.id === activePlaylistId);
    if (active?.type === 'xtream' && active.credentials && currentChannel.id) {
      useEpgStore.getState().loadXtreamEpg(active.credentials, currentChannel.id);
    }
  }, [currentChannel, activePlaylistId, playlists]);

  // Auto-load VOD Movies & Series Catalog when active playlist or channels change
  useEffect(() => {
    const active = playlists.find((p) => p.id === activePlaylistId);
    if (active) {
      useVodStore.getState().loadCatalog(active, channels);
    }
  }, [activePlaylistId, playlists, channels]);

  // Setup Global Keyboard & TV Remote Navigation
  useEffect(() => {
    dpadNavigation.start();

    const unsubscribe = dpadNavigation.subscribe({
      onPlayPause: () => {
        if (currentChannel) togglePlay();
      },
      onChannelNext: () => zapNext(),
      onChannelPrev: () => zapPrev(),
      onBack: () => {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
        } else if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
        } else if (useVodStore.getState().activeItem) {
          useVodStore.getState().closeDetail();
        } else if (isEpgGridOpen) {
          setIsEpgGridOpen(false);
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isPlaylistManagerOpen) {
          setIsPlaylistManagerOpen(false);
        } else if (isAddPlaylistOpen) {
          setIsAddPlaylistOpen(false);
        } else if (isMobileSidebarOpen) {
          setIsMobileSidebarOpen(false);
        }
      },
    });

    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Global Ctrl+K / Cmd+K Command Palette trigger
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'g' || e.key === 'G' || e.key === 'e' || e.key === 'E') {
        setIsEpgGridOpen((prev) => !prev);
      } else if (e.key === '?') {
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);

    return () => {
      dpadNavigation.stop();
      unsubscribe();
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, [
    currentChannel,
    isShortcutsOpen,
    isCommandPaletteOpen,
    isEpgGridOpen,
    isSettingsOpen,
    isPlaylistManagerOpen,
    isAddPlaylistOpen,
    isMobileSidebarOpen,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    zapNext,
    zapPrev,
  ]);

  return (
    <div className={`tokerian-shell ${tvMode ? 'tv-mode-active' : ''}`}>
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPlaylists={() => setIsPlaylistManagerOpen(true)}
        onOpenAddPlaylist={() => setIsAddPlaylistOpen(true)}
        onOpenEpgGuide={() => setIsEpgGridOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenKeyboardShortcuts={() => setIsShortcutsOpen(true)}
        onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="tokerian-body">
        {/* Left Navigation Sidebar / Mobile Slide-in Drawer */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenPlaylists={() => setIsPlaylistManagerOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenEpgGuide={() => setIsEpgGridOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Center Main Browsing Area */}
        <main className="tokerian-main">
          {/* Top Video Player (if a channel is currently loaded) */}
          {currentChannel && <VideoPlayer onOpenEpgGuide={() => setIsEpgGridOpen(true)} />}

          {/* Home / Dashboard View (IPTVnator 1:1 Clone) */}
          {activeTab === 'home' && (
            <HomeDashboard
              onTabChange={setActiveTab}
              onOpenPlaylists={() => setIsPlaylistManagerOpen(true)}
              onOpenAddPlaylist={() => setIsAddPlaylistOpen(true)}
            />
          )}

          {/* Live Channels View (IPTVnator 2-Pane Explorer) */}
          {activeTab === 'channels' && <ChannelExplorer activeTab="channels" />}

          {/* Movies (VOD) View */}
          {activeTab === 'movies' && <VodCatalog type="movies" />}

          {/* TV Series View */}
          {activeTab === 'series' && <VodCatalog type="series" />}

          {/* Favorites & History Views (IPTVnator Explorer) */}
          {(activeTab === 'favorites' || activeTab === 'history') && (
            <ChannelExplorer activeTab={activeTab} />
          )}

          {/* Live TV Cinema Mode View */}
          {activeTab === 'livetv' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!currentChannel && (
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <Tv size={42} style={{ opacity: 0.4, marginBottom: '12px' }} />
                  <h3 style={{ color: '#fff', margin: '0 0 8px 0' }}>No Channel Selected</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '18px' }}>
                    Choose any live channel below to start cinema stream playback.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('channels')}
                    className="tokerian-btn tokerian-btn-primary"
                  >
                    Browse Live Channels
                  </button>
                </div>
              )}
              <CategoryPills />
              <ChannelGrid activeTab="channels" />
            </div>
          )}

          {/* Downloads & DVR Recordings View */}
          {activeTab === 'downloads' && <DownloadsPage />}

          {/* Dedicated Full-Page Settings View */}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenGenres={() => setIsMobileSidebarOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Settings Modal (changeable M3U URL, presets, CORS proxy) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Playlists & Accounts Manager Modal */}
      <PlaylistManagerModal
        isOpen={isPlaylistManagerOpen}
        onClose={() => setIsPlaylistManagerOpen(false)}
        onOpenAddModal={() => setIsAddPlaylistOpen(true)}
      />

      {/* Add Playlist Modal (M3U File/URL & Xtream Codes) */}
      <AddPlaylistModal
        isOpen={isAddPlaylistOpen}
        onClose={() => setIsAddPlaylistOpen(false)}
      />

      {/* Fullscreen Multi-Channel EPG Timeline Matrix */}
      <EpgGridModal
        isOpen={isEpgGridOpen}
        onClose={() => setIsEpgGridOpen(false)}
      />

      {/* VOD & TV Series Detail Modal */}
      <VodDetailModal />

      {/* Global Command Palette (Ctrl+K / Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPlaylists={() => setIsPlaylistManagerOpen(true)}
        onOpenEpgGuide={() => setIsEpgGridOpen(true)}
        onTabChange={setActiveTab}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

export default App;
