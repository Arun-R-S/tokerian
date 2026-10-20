import { useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, type SidebarTab } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { CategoryPills } from './components/channel/CategoryPills';
import { ChannelGrid } from './components/channel/ChannelGrid';
import { VideoPlayer } from './components/player/VideoPlayer';
import { SettingsModal } from './components/settings/SettingsModal';
import { AddPlaylistModal } from './components/playlist/AddPlaylistModal';
import { PlaylistManagerModal } from './components/playlist/PlaylistManagerModal';
import { EpgGridModal } from './components/epg/EpgGridModal';

import { useChannelStore } from './stores/useChannelStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useUserStore } from './stores/useUserStore';
import { usePlayerStore } from './stores/usePlayerStore';
import { useMultiPlaylistStore } from './stores/useMultiPlaylistStore';
import { useEpgStore } from './stores/useEpgStore';
import { dpadNavigation } from './adapters/input/DpadNavigationAdapter';

import './styles/index.css';
import './styles/components.css';

export function App() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('channels');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAddPlaylistOpen, setIsAddPlaylistOpen] = useState(false);
  const [isPlaylistManagerOpen, setIsPlaylistManagerOpen] = useState(false);
  const [isEpgGridOpen, setIsEpgGridOpen] = useState(false);

  const m3uUrl = useSettingsStore((s) => s.m3uUrl);
  const loadInitialSettings = useSettingsStore((s) => s.loadInitialSettings);
  const tvMode = useSettingsStore((s) => s.tvMode);

  const loadUserData = useUserStore((s) => s.loadUserData);
  const loadPlaylist = useChannelStore((s) => s.loadPlaylist);
  const initPlaylists = useMultiPlaylistStore((s) => s.initPlaylists);
  const playlists = useMultiPlaylistStore((s) => s.playlists);
  const activePlaylistId = useMultiPlaylistStore((s) => s.activePlaylistId);
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
        if (isEpgGridOpen) {
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
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'g' || e.key === 'G' || e.key === 'e' || e.key === 'E') {
        setIsEpgGridOpen((prev) => !prev);
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPlaylists={() => setIsPlaylistManagerOpen(true)}
        onOpenEpgGuide={() => setIsEpgGridOpen(true)}
        onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="tokerian-body">
        {/* Left Navigation Sidebar / Mobile Slide-in Drawer */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenPlaylists={() => setIsPlaylistManagerOpen(true)}
          onOpenEpgGuide={() => setIsEpgGridOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Center Main Browsing Area */}
        <main className="tokerian-main">
          {/* Top Video Player (if a channel is currently loaded) */}
          {currentChannel && <VideoPlayer onOpenEpgGuide={() => setIsEpgGridOpen(true)} />}

          {/* Category Quick Filter Pills (visible in channels tab) */}
          {activeTab === 'channels' && <CategoryPills />}

          {/* Virtualized Channel Cards Grid */}
          <ChannelGrid activeTab={activeTab} />
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
    </div>
  );
}

export default App;
