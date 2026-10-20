# Tokerian: Complete IPTVnator 1:1 UI Clone & Multi-Platform Architecture Plan

> **Application**: **Tokerian** (IPTV, VOD & Series Client)  
> **Target Reference**: [`F:\Projects\iptvnator`](file:///F:/Projects/iptvnator) (Open-source Angular/Electron IPTV Client)  
> **Multi-Platform Target**: **Web**, **Tablet**, **Mobile** (iOS & Android via Capacitor), **Desktop** (Electron for Windows, macOS, Linux), and **Android TV** (10-foot D-Pad Remote Leanback UI)  
> **Design Philosophy**: Pure Vanilla CSS design tokens (no Tailwind), cinema dark aesthetic, glassmorphic surfaces, instant responsive adaptability, zero-dependency WebCrypto security.

---

## 1. Visual & Architectural Blueprint

```
┌──────┬────────────────────────────────────────────────────────────────────────────────────────┐
│  --  │ [📁 IPTV 11374 ch 🔄 ▾]   [ 🔍 Search in this playlist...  Ctrl+K ]  [⌨] [+]   [⤓] [-][□][✕]│
├──────┼────────────────────────────────────────────────────────────────────────────────────────┤
│ [⊞]  │ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ [☰]  │ │ ┌──────────┐  Sirippoli TV (576p)                                                 │ │
│ [🔍] │ │ │  [LOGO]  │  IPTV                                                                │ │
│ [♥]  │ │ └──────────┘  [ ▶ Continue Watching ]                     (Radial Crimson Glow)   │ │
│ [🕒] │ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ [📺] │                                                                                        │
│ [📁] │ Live now on your favorites (2)                                              See all >  │
│      │ ┌─────────────────────────┐  ┌─────────────────────────┐                               │
│      │ │ [📺] Sirippoli TV (576p)│  │ [📺] Sun TV HD (1080p)   │                               │
│      │ │ • LIVE   [━━━━━━━░░░░]  │  │ • LIVE   [━━━━░░░░░░░]   │                               │
│      │ └─────────────────────────┘  └─────────────────────────┘                               │
│      │                                                                                        │
│      │ Recently watched live TV (3)                                                See all >  │
│      │ ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│      │ │ [📺] Sirippoli TV       │  │ [📺] Sun TV HD          │  │ [📺] Jaya Plus (576p)   │  │
│      │ │ • LIVE   [━━━━━━━░░░░]  │  │ • LIVE   [━━━━░░░░░░░]   │  │ • LIVE   [━━━━░░░░░░░]   │  │
│      │ └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘  │
│      │                                                                                        │
│      │ Recently Used Sources (1)                                                   See all >  │
│      │ ┌───────────────────┐                                                                  │
│      │ │ [📁]         [⋮]  │                                                                  │
│      │ │ IPTV              │                                                                  │
│      │ └───────────────────┘                                                                  │
│ [⚙]  │                                                                                        │
└──────┴────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. All 10 Screens of IPTVnator — Detailed Specifications

### Screen 1: Home / Dashboard View (Route: `/home`)
- **Top Spotlight Hero Card**:
  - Radial gradient backdrop (deep dark obsidian with subtle crimson/burgundy radial light).
  - Left: Large vertical channel/movie card with rounded border, high-res channel logo, or movie poster.
  - Right: Title of the last played channel/program (`Sirippoli TV (576p)`), playlist source subtitle (`IPTV`).
  - Action Button: **`▶ Continue Watching`** pill button with accent glow that immediately launches playback.
- **Horizontal Carousels / Sections**:
  - **"Live now on your favorites"** (Count badge e.g. `2`, `See all >` action link):
    - Compact cards with square logo, clean channel title, red `• LIVE` badge, and dynamic broadcast progress bar calculated from EPG.
  - **"Recently watched live TV"** (Count badge e.g. `3`, `See all >` action link):
    - Recent watch history cards with live status and duration percentage.
  - **"Recently Used Sources"** (Count badge e.g. `1`, `See all >` action link):
    - Source cards displaying folder icon, source title (`IPTV`), total channels (`11,374 channels`), and `⋮` actions menu.

### Screen 2: Channel Explorer & Groups View (Route: `/channels`)
- **Left Category / Group Drawer**:
  - Collapsible list of groups: *"All Channels"*, *"Sports"*, *"News"*, *"Cinema"*, *"Kids"*, *"Documentary"*, etc., each with a channel count badge.
- **Toolbar & Actions**:
  - Search input scoped to the selected group.
  - View switcher: **Grid View** (modern visual cards with logos) vs. **List / Table View** (dense rows with channel index, logo, title, and group).
  - Sort selector: Default order, Alphabetical, or Quality (FHD/4K/HD).
- **Channel Item / Card**:
  - Channel logo with fallback icon.
  - Title (with automatic country prefix cleaner option).
  - Category pill.
  - Favorite heart toggle (`♥`).
  - Context menu (`⋮`): Play in browser player, Open in VLC, Open in MPV, Copy stream URL.

### Screen 3: Video Player & On-Screen Display (OSD)
- **Cinema Video Viewport**:
  - HLS.js adaptive live streaming + HTML5 native video.
- **Top OSD Bar**:
  - Close / Back button (`✕`).
  - Channel logo and title.
  - Current EPG broadcast title with start & end times (`18:00 - 19:30`).
- **Bottom Control Bar**:
  - Play / Pause toggle, Rewind 10s, Forward 10s.
  - Audio volume slider & mute toggle.
  - Stream track switcher: Multi-audio tracks, Subtitle/CC tracks, Quality level selector.
  - **External Desktop Player button**: Direct one-click spawn into VLC (`vlc.exe`) or MPV (`mpv.exe`).
  - Picture-in-Picture (PiP) toggle.
  - Fullscreen toggle.
- **EPG Live Ribbon**:
  - Interactive live progress bar along the bottom showing start time, elapsed scrubber, end time, and "Next Up" preview.
- **Quick Zap Channel Drawer**:
  - Side drawer accessible while watching to browse and zap channels without closing video.

### Screen 4: VOD Movies & TV Series Catalog (Route: `/vod` & `/series`)
- View switcher between **Movies** and **TV Series**.
- Category / Genre pills (Action, Comedy, Sci-Fi, Drama).
- Poster cards with year badge, duration, and IMDB rating (`★ 8.4`).
- **Detail Modal**:
  - Big backdrop hero image.
  - Synopsis, director, cast, release date.
  - For series: Season dropdown selector + episode cards grid with individual thumbnail and plot.
  - "Continue Watching" saved timestamp tracking.

### Screen 5: Favorites Screen (Route: `/favorites`)
- Dedicated view of all starred channels across all imported playlists.
- Category filtering and search.
- One-click heart toggle to remove.
- "Play All" or click to launch player.

### Screen 6: Watch History Screen (Route: `/history`)
- Chronological list of previously played streams grouped by: *"Today"*, *"Yesterday"*, *"Earlier this week"*.
- Channel thumbnail, stream title, last watched timestamp, and playback progress bar.
- **"Clear All History"** confirmation action.

### Screen 7: Playlists & Sources Manager (Route: `/playlists`)
- Grid/list of all imported sources:
  - Source title, badge (`M3U File`, `M3U URL`, `Xtream Codes API`).
  - Channel count (`11,374 channels`), last sync date, auto-refresh state.
  - Quick actions: Set active, Sync/Refresh (`🔄`), Edit, Delete (`🗑`).
- Floating or header **"+ Add Source"** button.

### Screen 8: Add Playlist / Import Modal
- **Tab 1: M3U File Upload**: Drag-and-drop zone or file picker for `.m3u` / `.m3u8` files.
- **Tab 2: Remote URL**: URL input with auto-refresh interval (Never, Hourly, Daily).
- **Tab 3: Xtream Codes API**: Server address, Username, Password, with switches to load Live TV, VOD Movies, and TV Series.
- **Tab 4: Paste Text**: Raw M3U playlist text area.

### Screen 9: Electronic Program Guide (EPG Timeline Schedule Matrix)
- Fullscreen multi-channel matrix grid:
  - Left column: Channel logos and titles.
  - Top header: 30-minute interval timestamps across a 24-hour window.
  - Red vertical **Current Time Indicator Line** updating continuously.
  - Program schedule blocks sized proportionally to duration with synopsis tooltips and click-to-play.

### Screen 10: Extended Settings Center (5 Tabs)
1. **General**: App theme, language, 10-foot TV remote mode toggle, data export/import.
2. **Playback & Stream**: HLS buffer slider (5s - 120s), hardware acceleration, auto-play next channel on error.
3. **External Desktop Players**: Default player (VLC / MPV), Windows executable path overrides (`vlc.exe`, `mpv.exe`), live status indicators.
4. **Channel Title Cleaner**: Prefix/country tag cleaner with live before/after test bench.
5. **Parental Control PIN**: 4-digit PIN setup via WebCrypto PBKDF2-SHA256, adult keyword blacklist, lock/unlock session toggle.

---

## 3. Multi-Platform UI Adaptation Matrix

| Component / Screen | Desktop (Electron) | Web Browser | Tablet (iPad / Android) | Mobile Phone | Android TV (10-Foot) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Top Header** | Window drag area, window controls (min/max/close), playlist selector, centered search (`Ctrl+K`), quick icons. | Standard web header, playlist dropdown, search with `⌘K`, shortcut button. | Compact search, playlist pill, hamburger drawer button. | Ultra-compact brand logo, search icon (expands to overlay), playlist selector pill. | Hidden or minimal top status bar; focused via D-pad Up to search and playlists. |
| **Navigation Sidebar** | Thin icon rail (56px) on the left with tooltip labels on hover. | Thin icon rail (56px) on the left. | Medium icon rail or slide-in drawer on touch. | **Bottom Navigation Bar** (`Home`, `Live TV`, `VOD`, `Favs`, `Settings`) + Slide-in drawer for groups. | Left vertical rail that expands on focus or top tab ribbon for remote left/right. |
| **Home Dashboard** | Full hero banner with crimson glow + 3-4 cards per horizontal carousel. | Full hero banner + responsive 3-4 cards per carousel. | 2-3 cards per carousel, touch swipe horizontal scrolling. | Stacked hero banner + 1.5 cards per row with horizontal native snap swipe. | 10-foot large hero banner; D-pad down navigates row by row; cards scale `1.08x` on remote focus. |
| **Channel Grid** | Multi-column grid (4-6 columns) or table list view. | Multi-column grid (3-5 columns) with virtual scroll. | 3-column grid, touch-friendly tap targets. | 1-column list or 2-column compact cards with quick favorite swipe. | 4-column large cards with high-contrast glowing border on focus (`box-shadow: 0 0 0 4px #6366f1`). |
| **Video Player** | Full window / fullscreen with PiP and external VLC/MPV spawning. | Native HTML5 / HLS.js with browser PiP and custom OSD. | Touch tap to reveal OSD, pinch to zoom/fit, touch seek gestures. | Native mobile orientation lock (auto landscape on play), swipe volume/brightness. | 10-foot player with D-Pad Play/Pause, Left/Right 10s seek, Up/Down quick zap channel overlay. |
| **Dialogs & Modals** | Centered floating glassmorphic windows with `ESC` to close. | Centered floating glassmorphic windows. | Sheet modals or centered popups. | Bottom slide-up bottom sheets with swipe-down to dismiss. | Fullscreen modal with auto-focused first button and remote `Back` button handling. |

---

## 4. Step-by-Step Implementation Roadmap

### Step 1: IPTVnator Navigation Shell (Icon Rail + Header) (COMPLETED)
- [x] Build the slim left navigation rail (`56px` width):
  - Icons: Home (`⊞`), Channels (`☰`), Search (`🔍`), Favorites (`♥`), History (`🕒`), Live TV (`📺`), Playlists (`📁`), and Settings (`⚙` at bottom).
  - Active indicator pill with light-blue accent.
- [x] Build the IPTVnator top header bar:
  - Left: Playlist selector dropdown pill (Folder icon, title `IPTV`, channel count `11374 channels`, refresh icon, down arrow).
  - Center: Pill-shaped `Search in this playlist...` with `Ctrl+K` shortcut badge.
  - Right: Quick Action icons: Virtual keyboard cheatsheet (`⌨`), Add source (`+`), Export (`⤓`), Window controls (Electron).

### Step 2: IPTVnator Home / Dashboard View (Current Screenshot Clone) (COMPLETED)
- [x] Create `src/components/home/HomeDashboard.tsx`:
  - **Spotlight Hero Card**:
    - Dark crimson radial glow background.
    - Large channel poster card with logo.
    - Channel title & playlist subtitle.
    - Light-blue `▶ Continue Watching` button.
  - **"Live now on your favorites" Row**:
    - Horizontal scroll container.
    - Channel cards with square logo, channel title, red `• LIVE` badge, and EPG broadcast progress bar.
    - `See all >` link to navigate to `/favorites`.
  - **"Recently watched live TV" Row**:
    - Horizontal scroll container with history cards and playback progress.
    - `See all >` link to navigate to `/history`.
  - **"Recently Used Sources" Row**:
    - Source folder card with folder icon, title, channel count, and `⋮` menu.
    - `See all >` link to navigate to `/playlists`.

### Step 3: Channels & Category Explorer (IPTVnator 2-Pane View) (COMPLETED)
- [x] Upgrade channel browsing into IPTVnator layout:
  - Collapsible left category drawer (list of groups with channel count badges).
  - Top filter bar with view toggle (**Grid View** vs **Table / List View**).
  - Channel cards with hover play overlay and favorite heart toggle.

### Step 4: Video Player & Full Cinema OSD (COMPLETED)
- [x] Refine `VideoPlayer.tsx` to match IPTVnator OSD:
  - Top bar with close `✕` button (`ESC`), logo, sanitized title, red `• LIVE` badge, and current program timeline interval (`18:00 - 19:30`).
  - Bottom bar with play/pause (`Space`), 10-second seek forward (`ArrowRight`) and rewind (`ArrowLeft`), volume slider (`M`), audio tracks selector, subtitles/captions menu, stream quality selector (Auto/1080p/720p), and external VLC/MPV player launcher.
  - Middle floating real-time EPG ribbon.
  - Side slide-in quick zap channel drawer (`Z` key or top right toggle) with instant live search and channel switching without interrupting playback.

### Step 5: Multi-Platform Responsive & TV Remote Optimization (COMPLETED)
- [x] **Mobile**: Bottom navigation bar includes `Home`, `Channels`, `Movies`, `Series`, `Favorites`, and `Settings`. Bottom padding prevents content clipping, and table rows adapt to small touch viewports.
- [x] **Tablet**: Responsive 2-pane category explorer (`220px` width) with responsive 3-column grid and touch carousel snap.
- [x] **Android TV**: Upgraded `DpadNavigationAdapter.ts` with 2D geometric Euclidean spatial navigation algorithm. Added `tabIndex={0}`, Enter key trigger, and high-contrast cyan/blue glowing halos (`box-shadow: 0 0 0 3px #38bdf8`) on all interactive cards, categories, table rows, and player controls for 10-foot remote operability.

### Step 6: UI Refinement, Dedicated Settings, Downloads Page & Cinema Timeline (COMPLETED)
- [x] **1. Hide Horizontal Scrollbars**:
  - Eliminated visible X-axis scrollbar tracks on `.dashboard-horizontal-scroll` across Chromium, Firefox, and WebKit while preserving smooth horizontal mouse-drag and touch swiping.
- [x] **2. Platform-Specific Window Controls**:
  - Restrict Close, Maximize, and Minimize titlebar buttons in `Header.tsx` strictly to Electron Desktop builds (`(window as any).electronAPI`).
  - Automatically hidden on Web browsers, Mobile (Capacitor), and Tablet viewports.
- [x] **3. Reorderable Favorites & Loop-Bound Zapping**:
  - Upgraded `useUserStore` to persist ordered favorite IDs (`orderedFavoriteIds: string[]`) and added `reorderFavorites`.
  - Added HTML5 Drag-and-Drop (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) with `GripVertical` handle in Favorites table view.
  - Bound `zapNext()` and `zapPrev()` in `usePlayerStore` to loop within `orderedFavoriteIds` when played with `scope="favorites"`.
- [x] **4. Dedicated Full-Page Settings View**:
  - Built full-page `SettingsPage.tsx` (`activeTab === 'settings'`) with 7 IPTVnator sections:
    - *General & Presets*, *Playback & Stream Engine*, *Recording & Storage*, *External Players (VLC/MPV)*, *Title Sanitizer*, *Parental Lock PIN*, *Backup & Factory Reset*.
- [x] **5. Dedicated Downloads & Recordings View**:
  - Added `activeTab === 'downloads'` into main navigation rail with segmented filter pills:
    - *All*, *Movies*, *Series*, *In Progress*, *Recordings*.
  - Added destination storage folder picker and live byte tracking metric.
- [x] **6. Relocate Session Backup Export to Settings**:
  - Removed JSON export icon from top header toolbar.
  - Placed JSON Backup Export, Backup Import with validation, and Factory Reset inside **Settings → Backup & Reset**.
- [x] **7. Interactive Player Timeline & Seek Progress Bar**:
  - Ported IPTVnator's cinema scrub timeline (`player-timeline-wrapper`) into `VideoPlayer.tsx`:
    - Current playback timestamp (`HH:mm:ss` / `mm:ss`) and duration / remaining time.
    - Custom range slider with live gradient track fill (`--seek-progress`).
    - Glowing animated `• LIVE` badge for live broadcast streams without finite duration.

### Step 7: Mobile Screen Responsiveness Across All Core Views (COMPLETED)
- [x] **1. Channels Page Mobile Responsiveness**:
  - 2-column mobile channel card grid (`repeat(2, 1fr)`) with compact logos (40x40px) and clean ellipsis typography.
  - Added swipeable horizontal category filter pill bar (`.mobile-categories-strip`) replacing the desktop left sidebar on phone screens with real-time channel counts.
  - Responsive explorer toolbar with stacked full-width title/counter row and sort dropdown.
  - Table mode hides secondary columns (`Group`, `Quality`) on small screens, keeping `#`, `Logo`, `Channel Name`, and `Play/Star Actions` legible.
- [x] **2. Favorites Page Mobile Responsiveness**:
  - Renders 2-column cards grid with instant star favorite toggle, channel count badge, and seamless playback scope loop.
  - Clean responsive empty state with guide prompt when favorites list is empty.
- [x] **3. Movies (VOD) Page Mobile Responsiveness**:
  - 2-column responsive cinema poster grid (`repeat(2, 1fr)`) with 2:3 aspect ratio poster frames.
  - Touch-friendly horizontal category filter pill scroll bar and resume shelf for partially watched movies.
  - Search input and sort dropdown wrapped into full-width stacked rows.
- [x] **4. TV Series Page Mobile Responsiveness**:
  - 2-column posters grid for TV Series catalog with floating IMDb rating pills and release years.
  - Responsive `VodDetailModal` with single-column layout on mobile, touch episode lists, and clean season pill selectors.
- [x] **5. Mobile Bottom Navigation**:
  - Top-left and top-right curved borders (`border-radius: 20px 20px 0 0`) with flat bottom edges adhering to native Android & iOS ergonomics.

---

## 5. Verification Standards
1. **Compilation**: `npm run build:web` must compile with 0 errors after each step.
2. **Capacitor Android Sync**: `npx cap sync android` after web builds.
3. **Electron Desktop**: Runs seamlessly with external VLC/MPV spawning and native shortcuts.
4. **Android TV**: Tested with D-pad remote inputs (Up, Down, Left, Right, Select, Back).

