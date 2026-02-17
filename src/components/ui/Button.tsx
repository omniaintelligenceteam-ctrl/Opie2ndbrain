'use client';

import React, { forwardRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'default';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading, children, style, disabled, ...rest },
  ref
) {
  const { theme } = useTheme();
  const c = theme.colors;

  const sizes: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '0.8rem', borderRadius: 8, minHeight: 32, minWidth: 32 },
    md: { padding: '10px 20px', fontSize: '0.875rem', borderRadius: 10, minHeight: 40, minWidth: 40 },
    lg: { padding: '14px 28px', fontSize: '0.95rem', borderRadius: 12, minHeight: 48, minWidth: 48 },
  };

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: c.gradientPrimary,
      color: c.textWhite,
      border: 'none',
      boxShadow: '0 2px 12px rgba(102, 126, 234, 0.3)',
    },
    secondary: {
      background: c.bgHover,
      color: c.textSecondary,
      border: `1px solid ${c.border}`,
    },
    ghost: {
      background: 'transparent',
      color: c.textTertiary,
      border: 'none',
    },
    danger: {
      background: c.errorBg,
      color: c.error,
      border: `1px solid ${c.error}33`,
    },
    outline: {
      background: 'transparent',
      color: c.textSecondary,
      border: `1px solid ${c.border}`,
    },
    default: {
      background: c.gradientPrimary,
      color: c.textWhite,
      border: 'none',
      boxShadow: '0 2px 12px rgba(102, 126, 234, 0.3)',
    },
  };

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontWeight: 500,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    ...sizes[size],
    ...variants[variant],
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{ ...base, ...style }}
      {...rest}
    >
      {loading ? (
        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>&#9696;</span>
      ) : icon ? (
        <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
      ) : null}
      {children}
    </button>
  );
});

export default Button;
