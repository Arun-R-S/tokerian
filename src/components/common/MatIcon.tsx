import React, { memo } from 'react';

interface MatIconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Universal Material Design Icons component.
 * Renders filled Google Material Icons offline via bundled font ligatures.
 */
export const MatIcon: React.FC<MatIconProps> = memo(({ name, size = 20, className = '', style }) => {
  return (
    <span
      className={`material-icons ${className}`}
      style={{
        fontSize: `${size}px`,
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle',
        userSelect: 'none',
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
});

MatIcon.displayName = 'MatIcon';
