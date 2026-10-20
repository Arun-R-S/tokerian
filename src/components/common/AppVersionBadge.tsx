import React from 'react';
import {
  APP_CONFIG,
  getStageMeta,
  getAppVersion,
  getFullVersionString,
  getBuildEnvironment,
} from '../../config/appInfo';

interface AppVersionBadgeProps {
  variant?: 'pill' | 'chip' | 'compact' | 'detailed';
  showStage?: boolean;
  showBuild?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const AppVersionBadge: React.FC<AppVersionBadgeProps> = ({
  variant = 'pill',
  showStage = true,
  showBuild = false,
  onClick,
  className = '',
  style,
}) => {
  const stage = getStageMeta();
  const version = getAppVersion();
  const env = getBuildEnvironment();
  const tooltip = `${APP_CONFIG.appName} ${getFullVersionString()} (Build #${APP_CONFIG.buildNumber}) • ${env}`;

  if (variant === 'compact') {
    return (
      <div
        className={`app-version-compact ${className}`}
        title={tooltip}
        onClick={onClick}
        style={style}
      >
        <span className="version-text">{version}</span>
        {showStage && (
          <span
            className="stage-dot"
            style={{ backgroundColor: stage.color, boxShadow: `0 0 6px ${stage.glowColor}` }}
          />
        )}
      </div>
    );
  }

  if (variant === 'chip') {
    return (
      <div
        className={`app-stage-chip ${className}`}
        title={tooltip}
        onClick={onClick}
        style={{
          color: stage.color,
          backgroundColor: stage.bgColor,
          borderColor: stage.borderColor,
          ...style,
        }}
      >
        <span
          className="chip-pulse-dot"
          style={{ backgroundColor: stage.color }}
        />
        <span className="chip-label">{stage.label.toUpperCase()}</span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={`app-version-detailed ${className}`}
        title={tooltip}
        onClick={onClick}
        style={style}
      >
        <div className="detailed-version-row">
          <span className="detailed-app-name">{APP_CONFIG.appName}</span>
          <span className="detailed-version-num">{version}</span>
          <span
            className="stage-tag"
            style={{
              color: stage.color,
              backgroundColor: stage.bgColor,
              borderColor: stage.borderColor,
            }}
          >
            {stage.label}
          </span>
        </div>
        <div className="detailed-meta-row">
          <span className="detailed-env-text">{env}</span>
          <span className="detailed-build-text">Build #{APP_CONFIG.buildNumber}</span>
        </div>
      </div>
    );
  }

  // Default: 'pill' variant
  return (
    <div
      className={`app-version-pill ${onClick ? 'is-clickable' : ''} ${className}`}
      title={tooltip}
      onClick={onClick}
      style={style}
    >
      <span className="version-number">{version}</span>
      {showStage && (
        <span
          className="stage-badge-pill"
          style={{
            color: stage.color,
            backgroundColor: stage.bgColor,
            borderColor: stage.borderColor,
          }}
        >
          {stage.label.toUpperCase()}
        </span>
      )}
      {showBuild && (
        <span className="build-number">#{APP_CONFIG.buildNumber}</span>
      )}
    </div>
  );
};
