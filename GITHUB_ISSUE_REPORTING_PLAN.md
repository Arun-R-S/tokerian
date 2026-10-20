# Implementation Plan: In-App GitHub Issue & Bug Reporting System

> **Target Repository:** [`https://github.com/Arun-R-S/tokerian`](https://github.com/Arun-R-S/tokerian)  
> **App Version:** `v1.0.0-alpha` (Centralized in `src/config/appInfo.ts`)  
> **Status:** Ready for Implementation  
> **Target Delivery Date:** October 2026  

---

## 1. Executive Summary & Objectives

The goal of this feature is to allow users to easily report bugs, glitches, playback crashes, and feature requests directly from within the Tokerian application to GitHub.

### Key Objectives
1. **Zero-Friction Reporting:** Allow users to generate a comprehensive, pre-filled GitHub issue in one click without manually typing their OS version, screen resolution, app version, or player engine.
2. **Auto-Diagnostics Capture:** Automatically collect relevant, privacy-safe environment diagnostics (app version, build number, stage, platform, electron vs web, video codec engine, screen dimensions).
3. **Multiple Contextual Entry Points:**
   - **Settings Page ("About" section):** Permanent "Report Bug / File Issue" action button.
   - **Video Player Error Screen:** "Report Stream Error" button when a live stream fails or throws an HLS decode error.
   - **Command Palette (`Ctrl+K`):** Quick command: `Report Bug / Open GitHub Issues`.
   - **In-App Modal / Dialog:** An interactive issue builder allowing users to choose the issue type, review their diagnostics, and submit.
4. **Submission Modes:**
   - **GitHub Web Pre-fill (Primary & Recommended):** Formats markdown and opens `https://github.com/Arun-R-S/tokerian/issues/new` with pre-filled title, labels, and markdown body via URL parameters. Requires no API keys.
   - **Copy to Clipboard:** Copies formatted markdown report with system diagnostics ready to paste anywhere.
   - **Direct GitHub API Submission (Optional Power-User Mode):** Submits directly via personal access token if user enters one in Settings.

---

## 2. Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                               USER ENTRY POINTS                                   |
|  - Settings -> About Card -> [Report an Issue]                                    |
|  - Video Player Error Overlay -> [Report Stream Glitch]                           |
|  - Command Palette (Ctrl+K) -> "Report a Bug"                                     |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        BugReportModal (In-App Dialog)                             |
|  1. Select Category: Bug | Feature Request | Stream Failure | UI Glitch           |
|  2. Title & Description input                                                     |
|  3. Privacy-Safe System Diagnostics Collector (Collapsible Preview)              |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                         DiagnosticsCollector Utility                              |
|  - App Version & Stage (v1.0.0-alpha, Build #105)                                 |
|  - Environment: Electron Desktop vs Web Browser vs Android Capacitor              |
|  - OS / User-Agent: Windows 10/11 x64, Chromium version                           |
|  - Playback Engine: HLS.js / External VLC / External MPV                          |
|  - Display: Window dimensions, DPI ratio, TV mode active (true/false)             |
|  - Anonymization: Strips M3U passwords, Xtream credentials, and personal tokens   |
+-----------------------------------------------------------------------------------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
+----------------------------------------+   +--------------------------------------+
|       Option A: Pre-Filled URL         |   |    Option B: Clipboard & Direct      |
|  Constructs GitHub issue URL:          |   |  Copies formatted markdown with      |
|  https://github.com/Arun-R-S/tokerian/ |   |  codeblocks and collapsible tags;    |
|  issues/new?title=...&body=...         |   |  Optional direct REST API dispatch   |
|  Opens in default system browser       |   |                                      |
+----------------------------------------+   +--------------------------------------+
```

---

## 3. Privacy-Safe System Diagnostics Payload

When generating an issue, the diagnostics collector will compile the following telemetry snippet:

```markdown
### Environment & Diagnostics
| Metric | Value |
| :--- | :--- |
| **App Version** | `v1.0.0-alpha` (Build #105) |
| **Release Stage** | `Alpha` |
| **Environment** | `Electron Desktop (Frameless Windows)` |
| **Platform** | `Windows 10/11 x64` |
| **Display Resolution** | `1920x1080` (DPI: 1.0) |
| **Active Player Engine** | `Internal HLS.js (Buffer: 30s)` |
| **CORS Proxy Mode** | `Direct / Off` |
| **TV D-Pad Mode** | `Disabled` |
| **Timestamp** | `2026-10-20T17:30:00Z` |
```

> [!IMPORTANT]
> **Privacy Guarantee:** The diagnostics collector MUST NEVER include private IPTV stream passwords, Xtream account keys, personal file paths, or private IP addresses. Stream URLs are stripped to domain-only or protocol type (e.g. `https://domain.com/... [REDACTED]`).

---

## 4. Proposed File Additions & Modifications

| Action | File Path | Purpose |
| :--- | :--- | :--- |
| **Create** | `src/utils/githubIssueReporter.ts` | Core engine to collect diagnostics, sanitize URLs, and generate pre-filled GitHub issue URLs. |
| **Create** | `src/components/modals/BugReportModal.tsx` | Elegant in-app modal with issue type selector, input fields, diagnostics preview, and action buttons. |
| **Modify** | `src/config/appInfo.ts` | Add `githubRepoUrl: 'https://github.com/Arun-R-S/tokerian'` to centralized app configuration. |
| **Modify** | `src/components/settings/SettingsPage.tsx` | Add "Report an Issue / Bug" button with GitHub icon in Section 10 (About). |
| **Modify** | `src/components/player/VideoPlayer.tsx` | Add a "Report Stream Error" action button inside the player error banner. |
| **Modify** | `src/components/command/CommandPalette.tsx` | Register the `action-report-bug` command shortcut. |
| **Modify** | `src/styles/components.css` | Styling for `BugReportModal`, diagnostics preview box, and report buttons. |

---

## 5. Detailed Component Specifications

### 5.1. `src/utils/githubIssueReporter.ts`
```typescript
export interface IssueData {
  type: 'bug' | 'feature' | 'playback' | 'ui';
  title: string;
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  errorSnippet?: string;
}

export function buildGitHubIssueUrl(issue: IssueData): string;
export function collectSystemDiagnostics(): Record<string, string>;
export function copyIssueToClipboard(issue: IssueData): Promise<boolean>;
```

### 5.2. `src/components/modals/BugReportModal.tsx`
- **Issue Category Tabs:**
  - `Bug Report`: Unexpected behavior, UI freeze, or app crash.
  - `Playback / Stream Issue`: Stream won't play, audio out of sync, black screen.
  - `Feature Request`: New feature proposal or enhancement.
  - `UI Glitch`: Alignment, styling, or responsive layout issues.
- **Form Inputs:**
  - Issue Title (e.g. *"Window control buttons misaligned in fullscreen"*)
  - Description & What happened
  - Steps to reproduce
- **Live Diagnostics Accordion:**
  - Collapsible preview showing exactly what data will be attached.
- **Action Buttons:**
  - `Submit on GitHub` (opens `https://github.com/Arun-R-S/tokerian/issues/new?...` in default browser)
  - `Copy Details` (copies markdown report to clipboard)
  - `Cancel`

### 5.3. Settings Page Integration (`SettingsPage.tsx`)
In Section 10 (About), add a dedicated action bar:
```tsx
<div className="about-actions-row">
  <button
    type="button"
    onClick={() => setIsBugModalOpen(true)}
    className="tokerian-btn tokerian-btn-primary"
  >
    <MatIcon name="bug_report" size={18} />
    <span>Report Bug or Request Feature</span>
  </button>
  <a
    href="https://github.com/Arun-R-S/tokerian/issues"
    target="_blank"
    rel="noreferrer"
    className="tokerian-btn"
  >
    <MatIcon name="open_in_new" size={18} />
    <span>Browse Existing Issues</span>
  </a>
</div>
```

### 5.4. Video Player Error Integration (`VideoPlayer.tsx`)
When playback fails (`error !== null`), add a secondary button next to "Retry Stream":
- Button: `Report Playback Issue`
- Clicking opens `BugReportModal` with `type: 'playback'` and the specific HLS.js error code (e.g., `bufferStalledError`, `manifestLoadError`) pre-filled.

---

## 6. Implementation Stages & Verification Checklist

- [ ] **Stage 1: Core Utility**
  - Create `src/utils/githubIssueReporter.ts`.
  - Add `githubRepoUrl` to `src/config/appInfo.ts`.
  - Test URL encoding for GitHub issue query parameters (`title`, `body`, `labels`).

- [ ] **Stage 2: Modal Component**
  - Implement `src/components/modals/BugReportModal.tsx`.
  - Style dialog with dark glassmorphism aesthetic in `src/styles/components.css`.
  - Wire tabs, inputs, and collapsible diagnostics view.

- [ ] **Stage 3: Entry Points Integration**
  - Connect to `SettingsPage.tsx` About section.
  - Connect to `CommandPalette.tsx` (`Ctrl+K` -> "Report an Issue").
  - Connect to `VideoPlayer.tsx` error state.

- [ ] **Stage 4: Verification & Validation**
  - Verify one-click submission opens GitHub with all markdown tables properly formatted.
  - Test clipboard copy fallback.
  - Verify zero sensitive data is included in the diagnostics snippet.
  - Run `npx tsc --noEmit` and `npm run build` to ensure zero compilation or build errors.
