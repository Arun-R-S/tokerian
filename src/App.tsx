import { useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, type SidebarTab } from './components/layout/Sidebar';
import { CategoryPills } from './components/channel/CategoryPills';
import { ChannelGrid } from './components/channel/ChannelGrid';
import { VideoPlayer } from './components/player/VideoPlayer';
import { SettingsModal } from './components/settings/SettingsModal';

import { useChannelStore } from './stores/useChannelStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useUserStore } from './stores/useUserStore';
import { usePlayerStore } from './stores/usePlayerStore';
import { dpadNavigation } from './adapters/input/DpadNavigationAdapter';

import './styles/index.css';
import './styles/components.css';

export function App() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('channels');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const m3uUrl = useSettingsStore((s) => s.m3uUrl);
  const loadInitialSettings = useSettingsStore((s) => s.loadInitialSettings);
  const tvMode = useSettingsStore((s) => s.tvMode);

  const loadUserData = useUserStore((s) => s.loadUserData);
  const loadPlaylist = useChannelStore((s) => s.loadPlaylist);
  const currentChannel = usePlayerStore((s) => s.currentChannel);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const toggleFullscreen = usePlayerStore((s) => s.toggleFullscreen);
  const zapNext = usePlayerStore((s) => s.zapNext);
  const zapPrev = usePlayerStore((s) => s.zapPrev);

  // Initialize settings, user data (favorites/history), and default playlist
  useEffect(() => {
    async function init() {
      await loadInitialSettings();
      await loadUserData();
      // Load current playlist
      loadPlaylist(m3uUrl, false);
    }
    init();
  }, [loadInitialSettings, loadUserData, loadPlaylist, m3uUrl]);

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
  }, [currentChannel, isSettingsOpen, togglePlay, toggleMute, toggleFullscreen, zapNext, zapPrev]);

  return (
    <div className={`tokerian-shell ${tvMode ? 'tv-mode-active' : ''}`}>
      {/* Top Application Header */}
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      <div className="tokerian-body">
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

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

      {/* Settings Modal (changeable M3U URL, presets, CORS proxy) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
