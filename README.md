# Tokerian 📺

> **High-Performance Cross-Platform Live Television & Stream Player**  
> Built with **Hexagonal Architecture (Ports & Adapters)**, **React 19**, **TypeScript**, and **Vite**.

Tokerian is a modern streaming application designed for seamless live television playback across **Web Browsers**, **Desktop (Windows / macOS / Linux)**, **Mobile (Android / iOS)**, and **Android TV (10-Foot UI & D-Pad Remote)**.

---

## ✨ Features

- **📡 Worldwide Stream Index**: Powered by [iptv-org/iptv](https://github.com/iptv-org/iptv) with 30,000+ public live channels from around the world.
- **⚡ Infinite Scroll & Chunked Batch Loading**: Renders 100 channels initially to prevent browser lag. Scrolling down smoothly loads the next batch (configurable in Settings: 50, 100, 200, 500).
- **🎬 Adaptive HLS Video Engine**: Auto-adjusts bitrate to network speeds, with auto-recovery for transient network and media hiccups.
- **🌐 In-Browser CORS Proxy**: Built-in toggle to transparently proxy international streams that lack permissive web cross-origin headers.
- **🔊 Multiple Audio Tracks**: Switch between commentary, languages, or stereo/surround tracks on live broadcasts.
- **💬 Subtitles & Closed Captions**: Full WebVTT and embedded stream subtitle selection.
- **🖼️ Picture-in-Picture (PiP)**: Keep watching streams in a floating window while multitasking.
- **📺 Android TV & 10-Foot UI Mode**: Full remote-control D-pad spatial navigation with high-contrast glowing focus indicators.
- **⭐ Favorites & Watch History**: Offline-first persistent storage (IndexedDB) for pinned channels and recent watch history.
- **🔍 Instant Search & Categorization**: O(1) indexed filtering across 30,000+ channel names, countries, and languages.
- **⚙️ Changeable M3U URL & Curated Presets**: Switch to any custom M3U/M3U8 link or choose 1-click presets (News, Sports, Movies, USA, India, UK, etc.).
- **📡 Casting**: Ready for Google Cast / Chromecast.

---

## 🏗️ Architecture & SOLID Principles

Tokerian follows **Hexagonal Architecture (Ports and Adapters)**:

```text
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

- **S (Single Responsibility)**: M3U parser only parses; Player adapter only drives media; Storage adapter only handles persistence.
- **O (Open/Closed)**: Add new platforms (e.g. Android TV, Electron) by creating new Adapters without modifying core logic.
- **L (Liskov Substitution)**: Any player implementing `IPlayerPort` can be plugged in without changing the UI.
- **I (Interface Segregation)**: Small, focused ports (`IPlayerPort`, `IStoragePort`, `ICastPort`).
- **D (Dependency Inversion)**: UI and domain logic depend only on abstract Port interfaces.

---

## 📁 Project Structure

```text
src/
├── core/                         # 100% Platform-Agnostic Core Domain
│   ├── domain/
│   │   └── types.ts              # Channel, AudioTrack, SubtitleTrack, Settings
│   ├── ports/
│   │   ├── IPlayerPort.ts        # Contract for video playback engines
│   │   └── IStoragePort.ts       # Contract for offline cache and user storage
│   ├── parser/
│   │   └── m3uParser.ts          # Single-pass non-blocking M3U parser
│   └── presets/
│       └── iptvPresets.ts        # iptv-org presets catalogue (Global, News, Sports, etc.)
│
├── adapters/                     # Platform-Specific Plugs
│   ├── player/
│   │   └── HlsPlayerAdapter.ts   # Hls.js live stream engine with audio/subtitle tracks
│   ├── storage/
│   │   └── IndexedDbAdapter.ts   # IndexedDB high-volume storage via idb-keyval
│   └── input/
│       └── DpadNavigationAdapter.ts # TV D-pad remote controller & keyboard navigation
│
├── stores/                       # Reactive Zustand Stores
│   ├── useChannelStore.ts        # Channels, categories, instant search
│   ├── usePlayerStore.ts         # Player state, tracks, zapping
│   ├── useUserStore.ts           # Favorites Set, LRU history
│   └── useSettingsStore.ts       # M3U URL, CORS proxy, TV mode, batch size
│
├── components/                   # UI Layer
│   ├── layout/
│   │   ├── Header.tsx            # Search bar, statistics, TV mode toggle, settings
│   │   └── Sidebar.tsx           # Navigation tabs, genre shortcuts, mini-player
│   ├── channel/
│   │   ├── ChannelGrid.tsx       # Infinite scroll batch container
│   │   ├── ChannelCard.tsx       # Memoized channel item with live indicator & star
│   │   └── CategoryPills.tsx     # Horizontal category filter chips
│   ├── player/
│   │   └── VideoPlayer.tsx       # Video canvas, auto-hiding OSD, track menus, PiP
│   └── settings/
│       └── SettingsModal.tsx     # Changeable M3U URL, presets, batch size, CORS proxy
│
├── styles/
│   ├── index.css                 # Cinema dark theme variables, focus rings
│   └── components.css            # Component-specific styles
│
├── App.tsx                       # Main Application Shell
└── main.tsx                      # Application Entry Point
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or pnpm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Arun-R-S/tokerian.git

# Navigate into project directory
cd tokerian

# Install dependencies
npm install
```

### Running Locally

```bash
npm run dev
```

The application will start at `http://localhost:5173/`.

### Production Build

```bash
npm run build
```

Builds the optimized production assets into `dist/`.

---

## 🎮 Keyboard & Remote Control Shortcuts

Tokerian supports physical keyboards and Android TV D-pad remotes out of the box:

| Key | Action |
| :--- | :--- |
| `Space` | Play / Pause Stream |
| `M` | Mute / Unmute Audio |
| `F` | Toggle Fullscreen |
| `ArrowUp` / `ArrowDown` | Navigate Channels / Volume |
| `ArrowLeft` / `ArrowRight` | Channel Zapping (`Prev` / `Next`) |
| `Enter` / `Select` | Open Channel / Activate Control |
| `PageUp` / `ChannelUp` | Next Channel |
| `PageDown` / `ChannelDown` | Previous Channel |
| `Escape` / `Back` | Close Settings / Exit Fullscreen |

---

## 🌐 Supported Source Feeds

Tokerian ships pre-configured with [iptv-org](https://github.com/iptv-org/iptv) streams:
- **Master Index**: `https://iptv-org.github.io/iptv/index.m3u`
- **Categories**: News, Sports, Movies, Animation, Music, Documentaries
- **Countries**: USA, India, UK, Canada, Germany, France, Spain, Australia

You can also input **any custom `.m3u` or `.m3u8` URL** in the Settings modal!

---

## 📄 License

MIT License. Designed and built with ❤️ for universal live stream entertainment.
