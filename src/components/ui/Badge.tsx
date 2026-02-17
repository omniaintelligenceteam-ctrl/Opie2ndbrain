'use client';

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

type BadgeVariant = 'status' | 'level' | 'count' | 'outline' | 'secondary' | 'default' | 'destructive';
type BadgeColor = 'success' | 'warning' | 'error' | 'info' | 'accent' | 'muted';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  color?: BadgeColor;
  style?: React.CSSProperties;
  className?: string;
}

export default function Badge({
  children,
  variant = 'status',
  color = 'accent',
  style,
  className,
}: BadgeProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const colorMap: Record<BadgeColor, { bg: string; fg: string }> = {
    success: { bg: c.successBg, fg: c.success },
    warning: { bg: c.warningBg, fg: c.warning },
    error: { bg: c.errorBg, fg: c.error },
    info: { bg: c.infoBg, fg: c.info },
    accent: { bg: c.accentMuted, fg: c.accent },
    muted: { bg: c.bgHover, fg: c.textTertiary },
  };

  const { bg, fg } = colorMap[color];

  const variants: Record<BadgeVariant, React.CSSProperties> = {
    status: {
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: '0.7rem',
      fontWeight: 600,
    },
    level: {
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: '0.65rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    },
    count: {
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: '0.7rem',
      fontWeight: 700,
      minWidth: 20,
      textAlign: 'center',
    },
    outline: {
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: '0.7rem',
      fontWeight: 600,
      background: 'transparent',
      border: `1px solid ${c.border}`,
    },
    secondary: {
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: '0.7rem',
      fontWeight: 600,
    },
    default: {
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: '0.7rem',
      fontWeight: 600,
    },
    destructive: {
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: '0.7rem',
      fontWeight: 600,
    },
  };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: bg,
        color: fg,
        lineHeight: 1.4,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
