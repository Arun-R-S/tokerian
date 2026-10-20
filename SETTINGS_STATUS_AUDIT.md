# Tokerian Settings Functionality Audit

> **Audit Date:** October 20, 2026  
> **Application Version:** v1.0.0 (Alpha)  
> **Source Code Scope:** `src/components/settings/SettingsPage.tsx`, `src/stores/useSettingsStore.ts`, and core subsystem consumers (Player, VOD, EPG, Parental, External Players, Storage).

---

## Executive Summary

| Category | Total Settings | Fully Working | UI & State Persistence Only |
| :--- | :---: | :---: | :---: |
| **1. General** | 7 | 1 | 6 |
| **2. Playback** | 11 | 5 | 6 |
| **3. Electronic Program Guide (EPG)** | 3 | 0 | 3 |
| **4. Dashboard** | 4 | 0 | 4 |
| **5. Remote & Android TV** | 3 | 1 | 2 |
| **6. Metadata & TMDB** | 3 | 0 | 3 |
| **7. Parental Lock** | 4 | 4 | 0 |
| **8. Backup & Restore** | 2 | 2 | 0 |
| **9. Reset & Wipe** | 2 | 2 | 0 |
| **10. About & System Information** | 1 | 1 | 0 |
| **TOTAL** | **40** | **16 (40%)** | **24 (60%)** |

> [!NOTE]
> All **40 settings** persist correctly to browser storage (`IndexedDB` & `localStorage`) via `useSettingsStore` and survive application reloads. The distinction below indicates whether the setting is actively hooked into backend/consumer business logic (e.g. streaming engine, DOM classes, parser, external processes) or currently exists as UI/state persistence awaiting subsystem integration.

---

## Category-by-Category Breakdown

### 1. General Settings

| Setting | Type | Status | Detailed Analysis |
| :--- | :--- | :---: | :--- |
| **Playlist URL & Curated Presets** | Input & Buttons | **WORKING** | Entering an M3U URL or clicking presets immediately triggers `loadPlaylist()`, fetches M3U/Xtream channels, and switches the active source. |
| **Language** | Dropdown | **UI ONLY** | Stored in settings (`settings.language`), but the app does not currently have an i18n translation provider (e.g. `i18next`) to translate UI strings. |
| **Visual Theme** | Segmented (Light/Dark/System) | **UI ONLY** | Stored in settings (`settings.visualTheme`), but the CSS theme variables are currently hardcoded to Dark mode (`#07090e`) on `:root`. Light theme styles are not defined. |
| **Cover Size** | Segmented (Small/Medium/Large) | **UI ONLY** | Stored in settings (`settings.coverSize`), but VOD and channel card grid widths currently use fixed CSS sizes instead of dynamic card classes. |
| **Show Titles Under Covers** | Toggle Switch | **UI ONLY** | Stored in settings (`settings.showCoverTitles`), but movie/series poster cards currently render titles unconditionally. |
| **Startup View** | Dropdown (First/Dashboard/Channels/Sources) | **UI ONLY** | Stored in settings (`settings.startupView`), but `App.tsx` initializes to the hardcoded default view (`home`) on mount. |
| **Window on Startup** | Dropdown (Normal/Maximized/Fullscreen) | **UI ONLY** | Stored in settings (`settings.startupWindowMode`), but `electron/main.cjs` does not query IndexedDB on launch to adjust window bounds. |

---

### 2. Playback Settings

| Setting | Type | Status | Detailed Analysis |
| :--- | :--- | :---: | :--- |
| **Auto-Skip Next Channel on Error** | Toggle Switch | **WORKING** | Connected directly to `VideoPlayer.tsx`. When a stream fails or 404s, it automatically calls `zapNext()` to jump to the next playable channel. |
| **CORS Reverse Proxy Relay** | Toggle Switch | **WORKING** | Connected to `usePlayerStore.ts` and `resolveStreamUrl()`. Routes streams through the Vite `/api/proxy?url=` proxy when enabled, or connects direct when disabled. |
| **Default External Player (VLC / MPV)** | Segmented | **WORKING** | Dictates which desktop media player is invoked when clicking "Open in External Player" on Live TV and VOD modals. |
| **Custom VLC Executable Path** | Text Input | **WORKING** | Electron IPC passes this path to `spawn()` to launch custom VLC installations outside default system directories. |
| **Custom MPV Executable Path** | Text Input | **WORKING** | Electron IPC passes this path to `spawn()` to launch custom MPV binaries. |
| **Save & Verify Player Paths** | Button | **WORKING** | Triggers `ExternalPlayerService.checkInstalled()` via Electron IPC to check if binaries exist on the local filesystem. |
| **Forward Buffer (5–120s)** | Range Slider | **UI ONLY** | Stored in settings (`settings.bufferLength`), but `HlsPlayerAdapter.ts` currently hardcodes `maxBufferLength: 30`. |
| **Hardware Video Acceleration** | Toggle Switch | **UI ONLY** | Hardware acceleration flags are passed globally in `electron/main.cjs` on launch; this renderer toggle does not dynamically alter WebGL/MSE flags. |
| **Fullscreen Channel Panel** | Toggle Switch | **UI ONLY** | Stored in settings (`settings.fullscreenChannelPanel`), but the zap drawer component opens regardless of this toggle. |
| **VOD Auto-Failover** | Toggle Switch | **UI ONLY** | Stored in settings (`settings.vodAutoFailover`), but automated multi-source failover matching across playlists is not yet implemented in `VodService`. |
| **Strip Country Prefixes** | Toggle Switch | **UI ONLY** | Stored in settings (`settings.stripCountryPrefix`). The sanitization function `cleanTitle()` exists, but the playlist parser does not check this toggle during channel ingestion. |

---

### 3. Electronic Program Guide (EPG)

| Setting | Type | Status | Detailed Analysis |
| :--- | :--- | :---: | :--- |
| **EPG Layout View Mode** | Segmented (Timeline/List) | **UI ONLY** | Stored in settings (`settings.epgViewMode`), but `EpgTimelineModal.tsx` currently only renders the horizontal broadcast matrix layout. |
| **Timezone Correction Offset** | Range Slider (-720 to +720m) | **UI ONLY** | Stored in settings (`settings.epgOffsetMinutes`), but `EpgService.ts` currently computes programme intervals using standard local time without adding this offset. |
| **Prefer Uploaded XMLTV over Xtream** | Toggle Switch | **UI ONLY** | Stored in settings (`settings.preferUploadedEpgOverXtream`), but the EPG multi-source merger currently prioritizes Xtream live EPG directly. |

---

### 4. Dashboard Settings

| Setting | Type | Status | Detailed Analysis |
| :--- | :--- | :---: | :--- |
| **Spotlight Continue Watching Hero** | Toggle Switch | **UI ONLY** | Stored in settings (`settings.dashboardRails.continueWatching`), but `HomeDashboard.tsx` renders the hero banner without checking this flag. |
| **Live Now on Your Favorites Rail** | Toggle Switch | **UI ONLY** | Stored in settings (`settings.dashboardRails.favorites`), but the rail renders without checking this flag. |
| **Recently Watched Live TV Rail** | Toggle Switch | **UI ONLY** | Stored in settings (`settings.dashboardRails.recent`), but the history rail renders without checking this flag. |
| **Recently Used Sources Rail** | Toggle Switch | **UI ONLY** | Stored in settings (`settings.dashboardRails.sources`), but the sources rail renders without checking this flag. |

---

### 5. Remote & Android TV Settings

| Setting | Type | Status | Detailed Analysis |
| :--- | :--- | :---: | :--- |
| **10-Foot TV Remote Navigation Mode** | Toggle Switch | **WORKING** | Connected to `App.tsx` and applies `.tv-mode-active` to the main shell. Displays high-contrast cyan focus rings and enables keyboard/D-pad navigation. Also togglable via Header icon and Command Palette. |
| **Web Remote Control Server** | Toggle Switch | **UI ONLY** | Stored in settings (`settings.remoteControl`), but an embedded HTTP/WebSocket server is not yet implemented to accept phone remote inputs. |
| **Remote Control Port** | Number Input | **UI ONLY** | Stored in settings (`settings.remoteControlPort`), awaiting backend server integration. |

---

### 6. Metadata & TMDB Settings

| Setting | Type | Status | Detailed Analysis |
| :--- | :--- | :---: | :--- |
| **TMDB Metadata Enrichment** | Toggle Switch | **UI ONLY** | Stored in settings (`settings.tmdbEnabled`), but `VodService.ts` currently populates movie/series metadata directly from Xtream API and M3U tags without making external TMDB API calls. |
| **TMDB API Key (v3 auth)** | Text Input | **UI ONLY** | Stored securely in IndexedDB (`settings.tmdbApiKey`), ready to be used once TMDB fetch routines are wired. |
| **Present M3U VOD details with TMDB** | Toggle Switch | **UI ONLY** | Stored in settings (`settings.m3uVodDetails`), but M3U VOD parsing does not yet trigger TMDB queries. |

---

### 7. Parental Lock Settings

| Setting | Type | Status | Detailed Analysis |
| :--- | :--- | :---: | :--- |
| **Parental Lock Gate** | Toggle Switch | **WORKING** | Actively enforced across `ChannelExplorer`, `ChannelGrid`, `CategoryPills`, `HomeDashboard`, and `CommandPalette` to hide adult/restricted content. |
| **Create / Change PIN** | Password Input | **WORKING** | Generates PBKDF2/SHA-256 salted hash and persists securely to IndexedDB. |
| **Unlock Session with PIN** | Form & Verification | **WORKING** | Verifies input PIN against stored hash and temporarily unlocks session state until locked. |
| **Lock Now** | Button | **WORKING** | Immediately clears session authorization and re-censors all protected channels and categories. |

---

### 8. Backup & Restore Settings

| Setting | Type | Status | Detailed Analysis |
| :--- | :--- | :---: | :--- |
| **Export JSON Backup** | Button | **WORKING** | Serializes all playlists, active source selection, favorites set, custom ordering, watch history, and user settings into a formatted `.json` file and downloads it to the browser/desktop. |
| **Restore from JSON Backup** | File Picker (`.json`) | **WORKING** | Reads, validates, and imports previously exported JSON files, hydrating `useMultiPlaylistStore`, `useUserStore`, and `useSettingsStore` immediately. |

---

### 9. Reset & Wipe Settings

| Setting | Type | Status | Detailed Analysis |
| :--- | :--- | :---: | :--- |
| **Clear Channel & EPG Caches** | Button | **WORKING** | Calls `storageAdapter.clearChannels()`, emptying IndexedDB channel tables while keeping playlists, favorites, and settings intact. |
| **Factory Reset (Full Data Wipe)** | Button | **WORKING** | Prompts confirmation, executes `storageAdapter.clearAll()`, purges `localStorage`, and restarts the application to factory defaults. |

---

### 10. About & System Information

| Setting | Type | Status | Detailed Analysis |
| :--- | :--- | :---: | :--- |
| **Centralized Version & Stage Tracker** | Display Card | **WORKING** | Dynamically reflects `APP_CONFIG` from `src/config/appInfo.ts`, displaying active Version, Stage Badge (Alpha/Beta/Production), Build Number, Codename, and Runtime Environment (Development vs Production Build). |

---

## Recommended Next Steps to Reach 100%

To make the remaining 24 settings functional:
1. **Dashboard Rails:** In `HomeDashboard.tsx`, wrap the Hero banner, Favorites rail, History rail, and Sources rail with `settings.dashboardRails.<key>` conditions (5 minutes).
2. **Forward Buffer:** In `HlsPlayerAdapter.ts`, pass `settings.bufferLength` into `maxBufferLength` and `maxMaxBufferLength` (2 minutes).
3. **EPG Timezone Offset:** In `EpgService.ts`, add `epgOffsetMinutes * 60 * 1000` to programme start/stop timestamps (5 minutes).
4. **Cover Size & Titles:** In `MovieCard.tsx` / `SeriesCard.tsx`, apply conditional CSS classes based on `settings.coverSize` and `settings.showCoverTitles` (10 minutes).
5. **Startup View:** In `App.tsx`, read `settings.startupView` on initial mount to set the starting tab (5 minutes).
