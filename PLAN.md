# Tokerian: Architecture & Implementation Plan

> **Application Name**: **Tokerian**  
> **Platforms Supported**: Web, Desktop (Windows/macOS/Linux), Mobile (Android/iOS), and Android TV (10-Foot UI / D-Pad Remote)  
> **Source Playlist**: [iptv-org/iptv](https://github.com/iptv-org/iptv) (`https://iptv-org.github.io/iptv/index.m3u` + Presets)  
> **Architecture Pattern**: Hexagonal Architecture (Ports & Adapters) + SOLID Principles + Clean Layering  
> **Performance Benchmarks**: Vercel React Best Practices, React Native Architecture, and React Native Performance Skills

---

## 1. Architectural Foundation & Principles

### 1.1 Hexagonal Architecture (Ports and Adapters)
The application decouples core domain rules (playlist parsing, channel indexing, favorites, history, settings) from external device platforms and streaming engines.

```
                      ┌──────────────────────────────────────────────┐
                      │              DRIVING ADAPTERS                │
                      │  Web Browser UI │ Desktop UI │ Android TV UI │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │                DRIVING PORTS                 │
                      │         (UI Actions & Navigation)            │
                      ├──────────────────────────────────────────────┤
                      │                 CORE DOMAIN                  │
                      │  • Single-pass M3U Streaming Parser          │
                      │  • Category & Country O(1) Index Engine      │
                      │  • Reactive Stores (Zustand)                 │
                      │  • Favorites & History Business Logic        │
                      ├──────────────────────────────────────────────┤
                      │                DRIVEN PORTS                  │
                      │   IPlayerPort │ IStoragePort │ ICastPort     │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │               DRIVEN ADAPTERS                │
                      │  • Player:  Hls.js (Web/Desktop) / ExoPlayer │
                      │  • Storage: IndexedDB (Web) / SQLite         │
                      │  • Input:   D-Pad (Android TV) / Keyboard    │
                      └──────────────────────────────────────────────┘
```

### 1.2 SOLID Principles Implementation
* **S (Single Responsibility)**: M3U parser only parses; Player adapter only drives media playback; Storage adapter only handles persistence.
* **O (Open/Closed)**: New target platforms (e.g. Apple TV, macOS) are added by implementing new Adapters without modifying core business code.
* **L (Liskov Substitution)**: `HlsPlayerAdapter` (Web) and `ExoPlayerAdapter` (Android/TV) implement the identical `IPlayerPort` contract and can be swapped transparently.
* **I (Interface Segregation)**: Segregated, focused ports (`IPlayerPort`, `IStoragePort`, `ICastPort`, `IInputPort`) rather than a monolithic interface.
* **D (Dependency Inversion)**: High-level UI and business logic depend exclusively on abstract TypeScript Port interfaces, never concrete vendor libraries.

### 1.3 Key Design Patterns
* **Adapter Pattern**: Bridges third-party video engines (`hls.js`, ExoPlayer, Chromecast SDK) to unified internal ports.
* **Facade Pattern**: `PlaybackFacade` orchestrates channel switching, proxy fallback, history updates, and error recovery.
* **Proxy Pattern**: Transparent CORS routing for in-browser playback of non-CORS streams.
* **Strategy Pattern**: Dynamic selection of playback engines (HLS.js vs Native HLS vs Direct MP4) and input handlers (D-pad vs Touch/Mouse).
* **Command Pattern**: Encapsulates TV remote and keyboard actions (`ZapNext`, `ToggleFav`, `TogglePiP`, `ToggleFullscreen`) for remappable input.
* **Observer Pattern**: Reactive Zustand stores synchronize player state (buffering, audio/sub tracks, errors) across UI overlays.

---

## 2. Best-Practice Performance Rules Applied

Incorporated from **Vercel React Best Practices**, **React Native Architecture**, and **React Native Skills**:

1. **List Virtualization (`list-performance-virtualize`, `rendering-content-visibility`)**:
   - `index.m3u` contains 30,000+ channels.
   - **Native & Android TV**: Uses `@shopify/flash-list` with `estimatedItemSize={72}`, `removeClippedSubviews={true}`, and `getItemType`.
   - **Web**: Virtualized viewport with CSS `content-visibility: auto`.
2. **Channel Logo Caching (`ui-expo-image`, `list-performance-images`)**:
   - Uses `expo-image` (Native) and memory/disk LRU caching to eliminate scroll stutter and OOM issues.
   - SVG fallback placeholders when broadcaster logos are broken or offline.
3. **Memoized Channel Cards (`list-performance-item-memo`, `rerender-memo`)**:
   - `ChannelCard` is wrapped in `React.memo` with zero inline functions or inline style objects in render loops.
4. **Fine-Grained Reactive Subscriptions (`rerender-derived-state`, `react-state-minimize`)**:
   - Channel items subscribe only to boolean selectors (e.g., `useFavoritesStore(s => s.has(channelId))`), preventing full list re-renders when toggling favorites.
5. **Non-Blocking Parser (`async-defer-await`, `async-parallel`)**:
   - Playlist downloading and regex parsing run in a **Web Worker** / background isolate, ensuring 60fps UI responsiveness.
6. **Offline-First Persistence**:
   - Playlists and metadata are saved to `IndexedDB` (Web) and `SQLite` (Native) via TanStack Query's offline persister for instant startup (< 100ms).

---

## 3. Directory & File Structure

```text
iptv-project/
├── app/                                 # Expo Router / Application Screens
│   ├── (tabs)/                          # Main Shell
│   │   ├── _layout.tsx                  # Adaptive Navigation (Sidebar for Web/TV, Tabs for Mobile)
│   │   ├── index.tsx                    # Live TV / Channel Browser Screen
│   │   ├── categories.tsx               # Category Explorer Screen
│   │   ├── favorites.tsx                # Pinned Favorites Screen
│   │   ├── history.tsx                  # Watch History Screen
│   │   └── settings.tsx                 # M3U Source, CORS Proxy, Audio/Sub defaults
│   ├── player/
│   │   └── [channelId].tsx              # Fullscreen OSD Video Player Screen
│   └── _layout.tsx                      # Root Providers (QueryClient, Theme, PlayerProvider)
│
├── src/
│   ├── core/                            # 100% Platform-Agnostic Hexagonal Core
│   │   ├── domain/                      # Models & Types
│   │   │   ├── Channel.ts               # Channel, Stream, Group, EPG types
│   │   │   ├── Track.ts                 # AudioTrack, SubtitleTrack, QualityLevel
│   │   │   └── Settings.ts              # ProxyConfig, BufferConfig, PlaylistConfig
│   │   ├── parser/                      # Streaming M3U Parser
│   │   │   ├── m3uParser.ts             # Single-pass regex parser
│   │   │   └── m3uParser.worker.ts      # Web Worker for non-blocking execution
│   │   ├── presets/
│   │   │   └── iptvOrgPresets.ts        # Index, Categories (News, Sports, etc.), Countries
│   │   └── ports/                       # Hexagonal Abstract Interfaces
│   │       ├── IPlayerPort.ts           # play, pause, setAudioTrack, setSubtitleTrack, seek
│   │       ├── IStoragePort.ts          # getChannels, saveChannels, getFavorites, getHistory
│   │       ├── ICastPort.ts             # startCast, stopCast, getCastState
│   │       └── IInputPort.ts            # D-pad and keyboard event contracts
│   │
│   ├── adapters/                        # Concrete Implementations of Ports
│   │   ├── player/
│   │   │   ├── HlsPlayerAdapter.web.ts  # Web & Desktop player via Hls.js
│   │   │   ├── ExoPlayerAdapter.native.ts# Android Mobile & Android TV via ExoPlayer
│   │   │   └── PipAdapter.ts            # Native Android PiP & Web HTML5 PiP
│   │   ├── storage/
│   │   │   ├── IndexedDbAdapter.web.ts  # Web high-volume IndexedDB storage
│   │   │   └── SqliteAdapter.native.ts  # Native SQLite / AsyncStorage adapter
│   │   └── input/
│   │       ├── DpadNavigation.tv.ts     # Android TV D-pad spatial focus engine
│   │       └── KeyboardShortcuts.web.ts # Desktop & Web hotkeys (F, M, Space, Up/Down)
│   │
│   ├── stores/                          # Atomic Reactive Stores (Zustand)
│   │   ├── useChannelStore.ts           # Channel catalogue, active category, search
│   │   ├── usePlayerStore.ts            # Stream state, tracks, volume, buffering
│   │   ├── useFavoritesStore.ts         # Fast O(1) Set lookup for pinned channels
│   │   └── useHistoryStore.ts           # LRU watch history with timestamps
│   │
│   ├── components/                      # High-Performance UI Layer
│   │   ├── channel/
│   │   │   ├── ChannelList.tsx          # FlashList / VirtualGrid container
│   │   │   ├── ChannelCard.tsx          # Memoized item (expo-image logo, live badge, focus ring)
│   │   │   └── CategoryPill.tsx         # Memoized horizontal category chip
│   │   ├── player/
│   │   │   ├── VideoSurface.tsx         # Platform-swapped video view
│   │   │   ├── PlayerControls.tsx       # Auto-hiding OSD overlay
│   │   │   ├── TrackSelectorModal.tsx   # Multiple audio & subtitle tracks selector
│   │   │   └── CastButton.tsx           # Chromecast trigger
│   │   └── ui/                          # Design System Primitives
│   │       ├── FocusablePressable.tsx   # TV D-pad focus-aware pressable
│   │       ├── SearchInput.tsx          # Debounced fast-filter input
│   │       └── GlassModal.tsx           # Glassmorphic modal overlay
│   │
│   └── hooks/                           # Reusable Business Hooks
│       ├── useChannelFilter.ts          # Memoized O(1) Category & Search indexing
│       ├── useTvFocus.ts                # D-pad remote controller registration
│       └── useAudioSubtitleTracks.ts   # Track synchronization with PlayerPort
│
├── package.json
└── app.json                             # Expo Configuration (Android TV Leanback, TV banner, Web)
```

---

## 4. Feature Specifications Matrix

| Feature | Web / Desktop Implementation | Mobile & Android TV Implementation |
| :--- | :--- | :--- |
| **Channel Listing** | Virtualized grid with CSS `content-visibility: auto` | `@shopify/flash-list` with `estimatedItemSize={72}` |
| **Categories** | Pre-indexed `group-title -> IDs` map; horizontal pill bar | Pre-indexed horizontal scroll list with TV D-pad focus |
| **Live Playback** | `hls.js` with adaptive bitrate, auto buffer management | Google `ExoPlayer` with hardware decoding (4K/60fps) |
| **Search** | Debounced (150ms) input with fuzzy and regex token matching | On-screen TV keyboard / voice input with debounced filter |
| **Favorites** | `Set<string>` stored in `IndexedDB` with O(1) membership | `Set<string>` stored in `AsyncStorage`/`SQLite` |
| **Viewing History** | LRU array (max 50) with channel ID and timestamp | LRU array (max 50) with channel ID and timestamp |
| **Fullscreen Player** | HTML5 Fullscreen API with auto-hiding OSD | Native Fullscreen Activity with auto-hiding OSD |
| **Multiple Audio Tracks** | `hls.audioTracks` API with selector modal | ExoPlayer `TrackSelectionOverride` selector modal |
| **Subtitles / Captions** | `hls.subtitleTracks` and WebVTT support | ExoPlayer embedded CEA-608/708 & WebVTT tracks |
| **Picture-in-Picture** | `video.requestPictureInPicture()` | Android OS native `enterPictureInPictureMode()` |
| **Casting** | Google Cast Web SDK (Chromecast) | Google Cast SDK for Android / iOS |
| **Changeable IPTV URL** | Settings modal supporting any custom M3U/M3U8 link | Settings screen with preset dropdown + custom URL field |
| **CORS Stream Handling** | In-browser CORS Proxy switch with custom proxy input | Native direct streaming (CORS is not enforced on Android) |
| **10-Foot Remote (TV)** | Keyboard hotkeys (`F`, `M`, `Space`, `Arrows`, `Enter`) | Full D-pad spatial navigation with high-contrast focus rings |

---

## 5. Phased Execution Roadmap

### Phase 1: Foundation, Hexagonal Ports & Streaming Engine
1. Initialize project structure and dependencies (`zustand`, `@shopify/flash-list`, `expo-image`, `hls.js`, `lucide-react`).
2. Implement `core/domain` and `core/ports` TypeScript contracts.
3. Build the non-blocking single-pass M3U parser with `iptv-org` built-in presets.
4. Set up offline-first storage adapter (`IndexedDB` & `AsyncStorage`).

### Phase 2: High-Performance Channel Browser & Categories
1. Implement the virtualized channel container with memoized `ChannelCard`s.
2. Build category pill selector and instant debounced search bar.
3. Wire O(1) Favorites store and LRU Viewing History store.

### Phase 3: Unified Media Player with Audio/Subtitles & PiP
1. Implement `HlsPlayerAdapter` (Web/Desktop) and native player hooks.
2. Build auto-hiding On-Screen Display (OSD) controls with channel zapping (`Prev` / `Next`).
3. Build Audio Track and Subtitle selector modals.
4. Implement Picture-in-Picture (PiP) and Fullscreen controls.

### Phase 4: Android TV Spatial Navigation & Settings
1. Integrate D-pad spatial navigation (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, `Back`).
2. Add high-contrast glowing focus indicators for 10-foot TV viewing.
3. Build Settings screen for custom M3U playlist URLs, preset switching, and CORS proxy toggles.

### Phase 5: Casting, Mobile Packaging & Production Verification
1. Add Google Cast support.
2. Configure Android TV Leanback banner and permissions in `app.json`.
3. Validate performance with 30,000+ channel master playlist.
