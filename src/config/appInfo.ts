/**
 * Tokerian Application Version & Release Tracking Configuration
 * 
 * Centralized area to declare and track application version, stage, and build metadata.
 * Update values here; they will automatically reflect across the running app, desktop title,
 * header badge, sidebar rail, and the settings/about section after build.
 */

export type AppStage =
  | 'alpha'
  | 'beta'
  | 'preview'
  | 'pre-release'
  | 'rc'
  | 'production';

export interface AppConfig {
  /** Name of the application */
  appName: string;
  /** Semantic version string (e.g. '1.0.0') */
  version: string;
  /** Current release stage */
  stage: AppStage;
  /** Incremental build number */
  buildNumber: number;
  /** Project release codename */
  codename: string;
  /** ISO date string or release date */
  releaseDate: string;
  /**
   * Git commit hash.
   * Options:
   * - 'auto': Automatically injected from git HEAD at build/dev time via Vite define
   * - A specific commit string (e.g. '8be8681') to manually override
   */
  commitHash: string;
}

/**
 * ============================================================================
 * CENTRALIZED APPLICATION CONFIGURATION
 * 
 * Edit the version, stage, buildNumber, and commitHash below to update
 * across the entire application (Header, Titlebar, Settings Info page, Sidebar).
 * ============================================================================
 */
export const APP_CONFIG: AppConfig = {
  appName: 'Tokerian',
  version: '1.0.0',
  stage: 'alpha', // Options: 'alpha' | 'beta' | 'preview' | 'pre-release' | 'rc' | 'production'
  buildNumber: 105,
  codename: 'Aero Stream',
  releaseDate: '2026-10-20',
  commitHash: 'auto', // 'auto' pulls latest Git commit automatically; or replace with e.g. '8be8681'
};

/**
 * Visual styling and metadata for each release stage
 */
export interface StageMeta {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}

export const STAGE_CONFIG: Record<AppStage, StageMeta> = {
  alpha: {
    label: 'Alpha',
    color: '#fbbf24', // Amber/Yellow
    bgColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.35)',
    glowColor: 'rgba(251, 191, 36, 0.4)',
  },
  beta: {
    label: 'Beta',
    color: '#c084fc', // Purple
    bgColor: 'rgba(192, 132, 252, 0.12)',
    borderColor: 'rgba(192, 132, 252, 0.35)',
    glowColor: 'rgba(192, 132, 252, 0.4)',
  },
  preview: {
    label: 'Preview',
    color: '#38bdf8', // Sky Blue
    bgColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    glowColor: 'rgba(56, 189, 248, 0.4)',
  },
  'pre-release': {
    label: 'Pre-Release',
    color: '#f97316', // Orange
    bgColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.35)',
    glowColor: 'rgba(249, 115, 22, 0.4)',
  },
  rc: {
    label: 'Release Candidate',
    color: '#818cf8', // Indigo
    bgColor: 'rgba(129, 140, 248, 0.12)',
    borderColor: 'rgba(129, 140, 248, 0.35)',
    glowColor: 'rgba(129, 140, 248, 0.4)',
  },
  production: {
    label: 'Production',
    color: '#34d399', // Emerald Green
    bgColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.35)',
    glowColor: 'rgba(52, 211, 153, 0.4)',
  },
};

/**
 * Returns formatted version string, e.g. "v1.0.0"
 */
export function getAppVersion(): string {
  return `v${APP_CONFIG.version}`;
}

/**
 * Returns full release string, e.g. "v1.0.0-alpha" or "v1.0.0" (for production)
 */
export function getFullVersionString(): string {
  if (APP_CONFIG.stage === 'production') {
    return `v${APP_CONFIG.version}`;
  }
  return `v${APP_CONFIG.version}-${APP_CONFIG.stage}`;
}

/**
 * Returns the human-readable display title, e.g. "Tokerian v1.0.0 (Alpha)"
 */
export function getAppDisplayTitle(): string {
  const stage = STAGE_CONFIG[APP_CONFIG.stage] || STAGE_CONFIG.alpha;
  return `${APP_CONFIG.appName} v${APP_CONFIG.version} (${stage.label})`;
}

/**
 * Returns stage metadata
 */
export function getStageMeta(): StageMeta {
  return STAGE_CONFIG[APP_CONFIG.stage] || STAGE_CONFIG.alpha;
}

/**
 * Returns whether running in Vite development mode or a compiled production build
 */
export function getBuildEnvironment(): 'Development' | 'Production Build' {
  return import.meta.env.DEV ? 'Development' : 'Production Build';
}

declare const __APP_GIT_COMMIT__: string | undefined;

/**
 * Returns the short git commit hash (either manually configured or injected by Vite at build/dev time)
 */
export function getCommitHash(): string {
  if (APP_CONFIG.commitHash && APP_CONFIG.commitHash !== 'auto') {
    return APP_CONFIG.commitHash;
  }
  if (typeof __APP_GIT_COMMIT__ !== 'undefined' && __APP_GIT_COMMIT__) {
    return __APP_GIT_COMMIT__;
  }
  return '8be8681';
}
