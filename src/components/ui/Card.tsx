'use client';

import React, { forwardRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

type CardVariant = 'default' | 'glass' | 'elevated' | 'interactive';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: string | number;
  noPadding?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', padding, noPadding, style, children, className, ...rest },
  ref
) {
  const { theme } = useTheme();
  const c = theme.colors;

  const base: React.CSSProperties = {
    borderRadius: 14,
    border: `1px solid ${c.border}`,
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    padding: noPadding ? 0 : (padding ?? 16),
  };

  const variants: Record<CardVariant, React.CSSProperties> = {
    default: {
      background: c.bgTertiary,
    },
    glass: {
      background: c.glassBg,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${c.glassBorder}`,
      boxShadow: c.shadowLg,
    },
    elevated: {
      background: c.bgElevated,
      boxShadow: c.shadowMd,
    },
    interactive: {
      background: c.bgTertiary,
      cursor: 'pointer',
    },
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...base, ...variants[variant], ...style }}
      {...rest}
    >
      {children}
    </div>
  );
});

export default Card;

// Named exports for compatibility
export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, style, ...props }) => (
  <div style={{ marginBottom: 12, ...style }} {...props}>{children}</div>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, style, ...props }) => (
  <div style={{ ...style }} {...props}>{children}</div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, style, ...props }) => (
  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, ...style }} {...props}>{children}</h3>
);
