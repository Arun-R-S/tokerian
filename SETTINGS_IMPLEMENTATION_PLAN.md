# Implementation Plan: Converting UI-Only Settings to Fully Working Features

> **Reference Audit:** [`SETTINGS_STATUS_AUDIT.md`](file:///f:/Projects/IP-TV/SETTINGS_STATUS_AUDIT.md)  
> **Target:** 24 UI-Only Settings -> 100% Fully Functional  
> **Project Scope:** `src/`, `electron/`  

---

## 1. Executive Roadmap & Phased Execution

To deliver these features reliably without regression, the 24 settings are grouped into **5 structured phases** based on dependency hierarchy, complexity, and user impact.

```
+---------------------------------------------------------------------------------------------+
| PHASE 1: Immediate High-Impact Core Logic (6 Settings)                                      |
| - Dashboard Rails Visibility (4 settings: Hero, Favorites, Recent, Sources)                |
| - HLS Forward Buffer Length (5-120s)                                                        |
| - EPG Timezone Correction Offset (-720m to +720m)                                           |
+---------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------+
| PHASE 2: Content Parsing & Navigation Behavior (4 Settings)                                 |
| - Startup View Initializer (First / Dashboard / Channels / Sources)                         |
| - Strip Country Prefixes during Channel Ingestion                                           |
| - Show Titles Under Poster Covers Toggle                                                    |
| - Fullscreen Channel Panel Toggle                                                           |
+---------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------+
| PHASE 3: Visual Theme & Display System (4 Settings)                                         |
| - Visual Theme Switching (Light, Dark, System)                                              |
| - Cover Sizing Engine (Small, Medium, Large)                                                |
| - EPG List View Mode (Horizontal Broadcast Matrix vs Vertical List)                         |
| - Prefer Uploaded XMLTV over Xtream EPG Merger                                              |
+---------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------+
| PHASE 4: TMDB Movie & Series Enrichment (3 Settings)                                        |
| - TMDB Client (`src/services/metadata/TmdbClient.ts`)                                       |
| - TMDB API Key v3 Integration & Cache Layer                                                |
| - M3U VOD Poster & Overview Auto-Enrichment in VodDetailModal                               |
+---------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------+
| PHASE 5: Advanced & Native Desktop Capabilities (7 Settings)                                |
| - Desktop Startup Window Mode (Last Size, Maximized, Fullscreen) in Electron                |
| - Hardware Acceleration Dynamic Flagging                                                    |
| - VOD Multi-Playlist Failover Engine                                                        |
| - Web Remote Control Server & Local TCP Socket (HTTP / WebSocket)                           |
| - Remote Control Port Configuration                                                         |
| - Multi-Language i18n Translation Provider (English, Spanish, German, etc.)                  |
+---------------------------------------------------------------------------------------------+
```

---

## 2. Phase 1: Immediate High-Impact Core Logic

### 1.1 Dashboard Rails Visibility (4 Settings)
* **Settings:** `dashboardRails.continueWatching`, `dashboardRails.favorites`, `dashboardRails.recent`, `dashboardRails.sources`
* **Target File:** [`src/components/home/HomeDashboard.tsx`](file:///f:/Projects/IP-TV/src/components/home/HomeDashboard.tsx)
* **Implementation:**
  1. Retrieve `dashboardRails` from `useSettingsStore((s) => s.dashboardRails)`.
  2. Conditionally wrap each section:
     ```tsx
     {/* Spotlight Hero Banner */}
     {dashboardRails?.continueWatching !== false && featuredChannel && (
       <div className="iptvnator-hero-card">...</div>
     )}

     {/* Favorites Rail */}
     {dashboardRails?.favorites !== false && (
       <section className="iptvnator-dashboard-section">...favorites...</section>
     )}

     {/* Recently Watched Rail */}
     {dashboardRails?.recent !== false && (
       <section className="iptvnator-dashboard-section">...history...</section>
     )}

     {/* Recently Used Sources Rail */}
     {dashboardRails?.sources !== false && (
       <section className="iptvnator-dashboard-section">...sources...</section>
     )}
     ```
* **Acceptance Criteria:** Toggling off any rail in Settings -> Dashboard immediately removes that rail from the Home Dashboard.

---

### 1.2 HLS Forward Buffer Length (1 Setting)
* **Setting:** `bufferLength` (5–120 seconds, default: 30s)
* **Target File:** [`src/adapters/player/HlsPlayerAdapter.ts`](file:///f:/Projects/IP-TV/src/adapters/player/HlsPlayerAdapter.ts#L76-L82)
* **Implementation:**
  1. Read `const bufferLength = useSettingsStore.getState().bufferLength || 30;` inside `initialize()`.
  2. Configure HLS.js instance options dynamically:
     ```typescript
     maxBufferLength: bufferLength,
     maxMaxBufferLength: Math.max(bufferLength * 2, 60),
     backBufferLength: Math.min(bufferLength, 30),
     ```
* **Acceptance Criteria:** Setting buffer to 60s loads up to 60s of forward media chunks in devtools Network tab.

---

### 1.3 EPG Timezone Correction Offset (1 Setting)
* **Setting:** `epgOffsetMinutes` (-720 to +720 minutes)
* **Target File:** [`src/services/epg/EpgService.ts`](file:///f:/Projects/IP-TV/src/services/epg/EpgService.ts) and [`src/stores/useEpgStore.ts`](file:///f:/Projects/IP-TV/src/stores/useEpgStore.ts)
* **Implementation:**
  1. Read `const offsetMs = (useSettingsStore.getState().epgOffsetMinutes || 0) * 60 * 1000;`.
  2. When parsing or retrieving programme intervals:
     ```typescript
     const start = new Date(prog.start.getTime() + offsetMs);
     const stop = new Date(prog.stop.getTime() + offsetMs);
     ```
* **Acceptance Criteria:** Changing the timezone offset slider shifts the timeline schedule backwards or forwards by the exact number of minutes selected.

---

## 3. Phase 2: Content Parsing & Navigation Behavior

### 2.1 Startup View Initializer (1 Setting)
* **Setting:** `startupView` (`'first' | 'dashboard' | 'channels' | 'sources'`)
* **Target File:** [`src/App.tsx`](file:///f:/Projects/IP-TV/src/App.tsx)
* **Implementation:**
  1. In `App.tsx` initial state:
     ```typescript
     const [activeTab, setActiveTab] = useState<SidebarTab>(() => {
       const pref = useSettingsStore.getState().startupView;
       if (pref === 'channels') return 'channels';
       if (pref === 'sources') return 'playlists';
       return 'home';
     });
     ```
  2. Ensure on initial hydration from IndexedDB, `App.tsx` applies the restored `startupView`.

---

### 2.2 Strip Country Prefixes during Channel Ingestion (1 Setting)
* **Setting:** `stripCountryPrefix` (boolean)
* **Target File:** [`src/utils/channelSanitizer.ts`](file:///f:/Projects/IP-TV/src/utils/channelSanitizer.ts) & [`src/stores/useChannelStore.ts`](file:///f:/Projects/IP-TV/src/stores/useChannelStore.ts)
* **Implementation:**
  1. When loading playlist channels, check `useSettingsStore.getState().stripCountryPrefix`.
  2. Strip regex prefixes matching ISO country codes, e.g. `^[A-Z]{2,3}\s*[:|\-]\s*` or `^\[[A-Z]{2,3}\]\s*`.
* **Acceptance Criteria:** Channels named `"US | CNN HD"` appear as `"CNN HD"` across Channel Cards, Tables, and Zap Drawer.

---

### 2.3 Show Titles Under Poster Covers Toggle (1 Setting)
* **Setting:** `showCoverTitles` (boolean)
* **Target Files:** [`src/components/vod/VodCatalog.tsx`](file:///f:/Projects/IP-TV/src/components/vod/VodCatalog.tsx) & [`src/styles/components.css`](file:///f:/Projects/IP-TV/src/styles/components.css)
* **Implementation:**
  1. Pass `showCoverTitles` or attach `.hide-cover-titles` class to `.vod-poster-grid`.
  2. When disabled, hide the bottom title bar:
     ```css
     .vod-poster-grid.hide-cover-titles .vod-card-title {
       display: none;
     }
     .vod-poster-grid.hide-cover-titles .vod-card:hover .vod-card-title,
     .vod-poster-grid.hide-cover-titles .vod-card:focus-visible .vod-card-title {
       display: block;
       position: absolute;
       bottom: 0;
       background: rgba(0, 0, 0, 0.85);
     }
     ```
* **Acceptance Criteria:** Movie wall displays clean edge-to-edge artwork with titles revealed on hover/focus only.

---

### 2.4 Fullscreen Channel Panel Toggle (1 Setting)
* **Setting:** `fullscreenChannelPanel` (boolean)
* **Target File:** [`src/components/player/VideoPlayer.tsx`](file:///f:/Projects/IP-TV/src/components/player/VideoPlayer.tsx)
* **Implementation:**
  1. In `VideoPlayer.tsx`, check `fullscreenChannelPanel` when handling the zap button click or hotkey `Z`.
  2. If disabled in settings, suppress opening the side drawer while `document.fullscreenElement` is active.

---

## 4. Phase 3: Visual Theme & Display System

### 3.1 Visual Theme Engine (Light, Dark, System) (1 Setting)
* **Setting:** `visualTheme` (`'light' | 'dark' | 'system'`)
* **Target Files:** [`src/styles/index.css`](file:///f:/Projects/IP-TV/src/styles/index.css) & [`src/App.tsx`](file:///f:/Projects/IP-TV/src/App.tsx)
* **Implementation:**
  1. Define `:root[data-theme="light"]` variables in CSS:
     ```css
     :root[data-theme="light"] {
       --bg-app: #f8fafc;
       --bg-panel: #ffffff;
       --bg-card: #f1f5f9;
       --text-primary: #0f172a;
       --text-muted: #64748b;
       --border-subtle: rgba(0, 0, 0, 0.08);
     }
     ```
  2. In `App.tsx`, listen to `settings.visualTheme` and match Media Query `(prefers-color-scheme: dark)`:
     ```typescript
     useEffect(() => {
       const root = document.documentElement;
       const theme = settings.visualTheme;
       if (theme === 'system') {
         const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
         root.setAttribute('data-theme', dark ? 'dark' : 'light');
       } else {
         root.setAttribute('data-theme', theme || 'dark');
       }
     }, [settings.visualTheme]);
     ```

---

### 3.2 Cover Sizing Engine (Small, Medium, Large) (1 Setting)
* **Setting:** `coverSize` (`'small' | 'medium' | 'large'`)
* **Target Files:** [`src/styles/components.css`](file:///f:/Projects/IP-TV/src/styles/components.css) & [`src/components/vod/VodCatalog.tsx`](file:///f:/Projects/IP-TV/src/components/vod/VodCatalog.tsx)
* **Implementation:**
  1. Apply `.cover-size-small`, `.cover-size-medium`, or `.cover-size-large` to `.vod-poster-grid`.
  2. Grid Column Dimensions:
     - `small`: `grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));` (dense wall for monitors)
     - `medium`: `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));` (balanced default)
     - `large`: `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));` (10-foot TV / leanback viewing)

---

### 3.3 EPG Layout View Mode (Horizontal Timeline vs Vertical List) (1 Setting)
* **Setting:** `epgViewMode` (`'timeline' | 'list'`)
* **Target File:** [`src/components/epg/EpgTimelineModal.tsx`](file:///f:/Projects/IP-TV/src/components/epg/EpgTimelineModal.tsx)
* **Implementation:**
  1. When `epgViewMode === 'list'`, render a vertical 24-hour programme guide schedule grouped by day, similar to newspaper TV guides.
  2. When `timeline`, render the current multi-channel broadcast matrix.

---

### 3.4 Prefer Uploaded XMLTV over Xtream EPG (1 Setting)
* **Setting:** `preferUploadedEpgOverXtream` (boolean)
* **Target File:** [`src/services/epg/EpgService.ts`](file:///f:/Projects/IP-TV/src/services/epg/EpgService.ts)
* **Implementation:**
  1. In the multi-source channel schedule lookup, check `preferUploadedEpgOverXtream`.
  2. If `true`, search custom imported `.xml` / `.xml.gz` EPG data first before falling back to Xtream server EPG endpoints.

---

## 5. Phase 4: TMDB Movie & Series Metadata Enrichment

### 5.1 TMDB Service Client
* **Create File:** `src/services/metadata/TmdbClient.ts`
* **Settings:** `tmdbEnabled`, `tmdbApiKey`, `m3uVodDetails`
* **Implementation:**
  ```typescript
  export class TmdbClient {
    private static BASE_URL = 'https://api.themoviedb.org/3';

    static async searchMovie(title: string, year?: string): Promise<TmdbMovieResult | null> {
      const apiKey = useSettingsStore.getState().tmdbApiKey;
      if (!apiKey) return null;
      
      const cleanName = title.replace(/\.(mp4|mkv|avi)$/i, '').replace(/\(\d{4}\)/, '').trim();
      const url = `${this.BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanName)}${year ? `&year=${year}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.results?.[0] || null;
    }
  }
  ```

### 5.2 Integration in `VodDetailModal.tsx`
* **Target File:** [`src/components/vod/VodDetailModal.tsx`](file:///f:/Projects/IP-TV/src/components/vod/VodDetailModal.tsx)
* **Implementation:**
  1. When opening a movie/series, check `settings.tmdbEnabled`.
  2. If enabled, query `TmdbClient.searchMovie()` to fetch:
     - High-resolution poster (`https://image.tmdb.org/t/p/w500/...`)
     - Backdrop artwork (`https://image.tmdb.org/t/p/original/...`)
     - Official synopsis, genres, and TMDB community rating.

---

## 6. Phase 5: Advanced Subsystems & Native Desktop Capabilities

### 6.1 Desktop Startup Window Mode
* **Setting:** `startupWindowMode` (`'normal' | 'maximized' | 'fullscreen'`)
* **Target File:** [`electron/main.cjs`](file:///f:/Projects/IP-TV/electron/main.cjs)
* **Implementation:**
  1. Persist the user's `startupWindowMode` to a local config JSON in `app.getPath('userData')/window-settings.json`.
  2. In `createWindow()`, read this config before `mainWindow.show()`:
     ```javascript
     if (savedMode === 'maximized') mainWindow.maximize();
     else if (savedMode === 'fullscreen') mainWindow.setFullScreen(true);
     ```

---

### 6.2 VOD Auto-Failover
* **Setting:** `vodAutoFailover` (boolean)
* **Target File:** [`src/services/vod/VodService.ts`](file:///f:/Projects/IP-TV/src/services/vod/VodService.ts)
* **Implementation:**
  1. When a stream error occurs in VOD mode, scan other imported playlists in `useMultiPlaylistStore` for items with matching titles.
  2. If a match is found in another playlist, automatically switch playback to that source and display a toast: *"Failover: Streaming from Backup Source"*.

---

### 6.3 Web Remote Control Server (Phone Remote)
* **Settings:** `remoteControl`, `remoteControlPort` (default: 3000)
* **Target File:** [`electron/main.cjs`](file:///f:/Projects/IP-TV/electron/main.cjs)
* **Implementation:**
  1. When `remoteControl: true`, instantiate an embedded Node.js `http` and `ws` (WebSocket) server on the specified port.
  2. Serve a minimal mobile web remote UI (`/remote.html`) with D-Pad, Volume, Play/Pause, and Channel Up/Down buttons.
  3. Relay incoming socket actions to `mainWindow.webContents.send('remote-command', action)`.

---

### 6.4 Multi-Language i18n Translation Provider
* **Setting:** `language` (English, Spanish, German, French, Italian, Russian, Tamil, Hindi, Chinese)
* **Target Files:** `src/i18n/` dictionary files
* **Implementation:**
  1. Define lightweight translation maps for core UI navigation keys:
     ```typescript
     export const translations: Record<string, Record<string, string>> = {
       English: { home: 'Home', channels: 'Channels', settings: 'Settings', ... },
       Spanish: { home: 'Inicio', channels: 'Canales', settings: 'Ajustes', ... },
       Tamil: { home: 'முகப்பு', channels: 'சேனல்கள்', settings: 'அமைப்புகள்', ... },
     };
     ```
  2. Create a reactive hook `useTranslation()` that updates when `settings.language` changes.

---

### 6.5 Hardware Video Acceleration Dynamic Flagging (1 Setting)
* **Setting:** `hardwareAcceleration` (boolean, default: `true`)
* **Target Files:** [`electron/main.cjs`](file:///f:/Projects/IP-TV/electron/main.cjs) & [`src/components/settings/SettingsPage.tsx`](file:///f:/Projects/IP-TV/src/components/settings/SettingsPage.tsx)
* **Implementation:**
  1. In Electron, hardware acceleration is controlled prior to `app.whenReady()` via `app.disableHardwareAcceleration()`.
  2. Persist the toggle state into `userData/hardware-acceleration.json` via IPC `electronAPI.setHardwareAcceleration(enabled)`.
  3. In `electron/main.cjs`, read `hardware-acceleration.json` synchronously before `app.whenReady()`:
     ```javascript
     const hwConfigFile = path.join(app.getPath('userData'), 'hardware-acceleration.json');
     try {
       if (fs.existsSync(hwConfigFile)) {
         const hwConfig = JSON.parse(fs.readFileSync(hwConfigFile, 'utf-8'));
         if (hwConfig.hardwareAcceleration === false) {
           app.disableHardwareAcceleration();
         }
       }
     } catch (e) {
       console.warn('Failed to read hardware acceleration config:', e);
     }
     ```
  4. In `SettingsPage.tsx`, when the user toggles this setting, show a prompt/toast informing: *"Hardware acceleration preference saved. Restart the application for this change to take effect."*

---

## 7. Master 24-Setting Traceability Matrix

Direct mapping of every UI-only setting from [`SETTINGS_STATUS_AUDIT.md`](file:///f:/Projects/IP-TV/SETTINGS_STATUS_AUDIT.md) to this implementation plan:

| # | Audit Category | Setting Name | Settings Key | Implementation Phase | Target Files |
| :-: | :--- | :--- | :--- | :-: | :--- |
| 1 | **1. General** | Language | `settings.language` | **Phase 5** (§6.4) | `src/i18n/`, `src/hooks/useTranslation.ts` |
| 2 | **1. General** | Visual Theme | `settings.visualTheme` | **Phase 3** (§3.1) | `src/styles/index.css`, `src/App.tsx` |
| 3 | **1. General** | Cover Size | `settings.coverSize` | **Phase 3** (§3.2) | `src/styles/components.css`, `src/components/vod/VodCatalog.tsx` |
| 4 | **1. General** | Show Titles Under Covers | `settings.showCoverTitles` | **Phase 2** (§2.3) | `src/components/vod/VodCatalog.tsx`, `src/styles/components.css` |
| 5 | **1. General** | Startup View | `settings.startupView` | **Phase 2** (§2.1) | `src/App.tsx` |
| 6 | **1. General** | Window on Startup | `settings.startupWindowMode` | **Phase 5** (§6.1) | `electron/main.cjs` |
| 7 | **2. Playback** | Forward Buffer (5–120s) | `settings.bufferLength` | **Phase 1** (§1.2) | `src/adapters/player/HlsPlayerAdapter.ts` |
| 8 | **2. Playback** | Hardware Video Acceleration | `settings.hardwareAcceleration` | **Phase 5** (§6.5) | `electron/main.cjs`, `src/components/settings/SettingsPage.tsx` |
| 9 | **2. Playback** | Fullscreen Channel Panel | `settings.fullscreenChannelPanel` | **Phase 2** (§2.4) | `src/components/player/VideoPlayer.tsx` |
| 10 | **2. Playback** | VOD Auto-Failover | `settings.vodAutoFailover` | **Phase 5** (§6.2) | `src/services/vod/VodService.ts` |
| 11 | **2. Playback** | Strip Country Prefixes | `settings.stripCountryPrefix` | **Phase 2** (§2.2) | `src/utils/channelSanitizer.ts`, `src/stores/useChannelStore.ts` |
| 12 | **3. EPG** | EPG Layout View Mode | `settings.epgViewMode` | **Phase 3** (§3.3) | `src/components/epg/EpgTimelineModal.tsx` |
| 13 | **3. EPG** | Timezone Correction Offset | `settings.epgOffsetMinutes` | **Phase 1** (§1.3) | `src/services/epg/EpgService.ts`, `src/stores/useEpgStore.ts` |
| 14 | **3. EPG** | Prefer Uploaded XMLTV over Xtream | `settings.preferUploadedEpgOverXtream` | **Phase 3** (§3.4) | `src/services/epg/EpgService.ts` |
| 15 | **4. Dashboard** | Spotlight Continue Watching Hero | `settings.dashboardRails.continueWatching` | **Phase 1** (§1.1) | `src/components/home/HomeDashboard.tsx` |
| 16 | **4. Dashboard** | Live Now on Your Favorites Rail | `settings.dashboardRails.favorites` | **Phase 1** (§1.1) | `src/components/home/HomeDashboard.tsx` |
| 17 | **4. Dashboard** | Recently Watched Live TV Rail | `settings.dashboardRails.recent` | **Phase 1** (§1.1) | `src/components/home/HomeDashboard.tsx` |
| 18 | **4. Dashboard** | Recently Used Sources Rail | `settings.dashboardRails.sources` | **Phase 1** (§1.1) | `src/components/home/HomeDashboard.tsx` |
| 19 | **5. Remote & TV** | Web Remote Control Server | `settings.remoteControl` | **Phase 5** (§6.3) | `electron/main.cjs` |
| 20 | **5. Remote & TV** | Remote Control Port | `settings.remoteControlPort` | **Phase 5** (§6.3) | `electron/main.cjs` |
| 21 | **6. TMDB** | TMDB Metadata Enrichment | `settings.tmdbEnabled` | **Phase 4** (§5.1, §5.2) | `src/services/metadata/TmdbClient.ts`, `VodDetailModal.tsx` |
| 22 | **6. TMDB** | TMDB API Key (v3 auth) | `settings.tmdbApiKey` | **Phase 4** (§5.1, §5.2) | `src/services/metadata/TmdbClient.ts` |
| 23 | **6. TMDB** | Present M3U VOD details with TMDB | `settings.m3uVodDetails` | **Phase 4** (§5.1, §5.2) | `src/services/metadata/TmdbClient.ts`, `VodDetailModal.tsx` |
| 24 | **Global Alignment** | Multi-Source Playlist Failover | `settings.vodAutoFailover` / Source Fallback | **Phase 5** (§6.2) | `src/stores/useMultiPlaylistStore.ts`, `VodService.ts` |

---

## 8. Verification & Testing Matrix

| Feature | Automated / Unit Test | Manual Validation Criteria |
| :--- | :--- | :--- |
| **Dashboard Rails** | Component render snapshot | Toggle all 4 rails off -> Home Dashboard renders blank empty state without errors. |
| **HLS Buffer** | Chrome DevTools Network | Inspect chunk buffer length to verify it loads up to user-selected duration. |
| **Timezone Offset** | Date arithmetic test | Offset +120m shifts an 8:00 PM show to display at 10:00 PM. |
| **Visual Theme** | CSS token inspection | Selecting Light mode turns background to `#f8fafc` and text to `#0f172a`. |
| **Cover Sizing** | Grid computed style | Verify grid column min-width updates between 140px, 180px, and 240px. |
| **TMDB Client** | Mock API response | Enter test TMDB key -> Search returns accurate movie poster and rating. |
| **Hardware Acceleration** | Electron launch test | Disabling flag persists to config and starts Electron without GPU acceleration. |
| **Build Integrity** | `npx tsc --noEmit && npm run build` | Exits with code 0 with zero lint or TypeScript compilation errors. |

