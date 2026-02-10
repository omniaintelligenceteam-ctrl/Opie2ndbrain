// Design System - Token Reference
// Colors are defined in themes.ts (single source of truth for dark/light themes).
// CSS variables are injected by ThemeContext at runtime.
// Animation keyframes are in premium.css.
// This file exports non-color design tokens for use in JS/TS components.

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  xxxl: '48px',
};

export const radius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  full: '9999px',
};

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, monospace",

  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.8125rem',  // 13px
    base: '0.875rem', // 14px
    md: '0.9375rem',  // 15px
    lg: '1rem',       // 16px
    xl: '1.125rem',   // 18px
    xxl: '1.5rem',    // 24px
    xxxl: '2rem',     // 32px
    hero: '2.5rem',   // 40px
  },

  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
};

export const transitions = {
  fast: '0.15s ease',
  normal: '0.2s ease',
  smooth: '0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  bounce: '0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
};

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.6)',
  glow: '0 0 40px rgba(99, 102, 241, 0.15)',
  glowStrong: '0 0 60px rgba(99, 102, 241, 0.25)',
};

// Kept for backward-compat (no-op — keyframes are in premium.css)
export const animations = '';
