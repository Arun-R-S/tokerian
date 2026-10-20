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

import { useChannelStore } from './stores/useChannelStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useUserStore } from './stores/useUserStore';
import { usePlayerStore } from './stores/usePlayerStore';
import { useMultiPlaylistStore } from './stores/useMultiPlaylistStore';
import { dpadNavigation } from './adapters/input/DpadNavigationAdapter';

import './styles/index.css';
import './styles/components.css';

export function App() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('channels');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAddPlaylistOpen, setIsAddPlaylistOpen] = useState(false);
  const [isPlaylistManagerOpen, setIsPlaylistManagerOpen] = useState(false);

  const m3uUrl = useSettingsStore((s) => s.m3uUrl);
  const loadInitialSettings = useSettingsStore((s) => s.loadInitialSettings);
  const tvMode = useSettingsStore((s) => s.tvMode);

  const loadUserData = useUserStore((s) => s.loadUserData);
  const loadPlaylist = useChannelStore((s) => s.loadPlaylist);
  const initPlaylists = useMultiPlaylistStore((s) => s.initPlaylists);
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
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
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
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);

    return () => {
      dpadNavigation.stop();
      unsubscribe();
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, [currentChannel, isSettingsOpen, isMobileSidebarOpen, togglePlay, toggleMute, toggleFullscreen, zapNext, zapPrev]);

  return (
    <div className={`tokerian-shell ${tvMode ? 'tv-mode-active' : ''}`}>
      {/* Top Application Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPlaylists={() => setIsPlaylistManagerOpen(true)}
        onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="tokerian-body">
        {/* Left Navigation Sidebar / Mobile Slide-in Drawer */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenPlaylists={() => setIsPlaylistManagerOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Center Main Browsing Area */}
        <main className="tokerian-main">
          {/* Top Video Player (if a channel is currently loaded) */}
          {currentChannel && <VideoPlayer />}

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
    </div>
  );
}

export default App;
