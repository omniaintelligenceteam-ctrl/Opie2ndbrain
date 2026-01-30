// Design System - Premium Command Center Theme
// Inspired by Linear, Vercel, Raycast

export const colors = {
  // Base
  background: '#0a0a0f',
  backgroundSubtle: '#101016',
  backgroundElevated: '#14141c',
  backgroundHover: '#1a1a24',
  
  // Borders
  border: 'rgba(255, 255, 255, 0.06)',
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  borderFocus: 'rgba(99, 102, 241, 0.5)',
  
  // Text
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  textTertiary: 'rgba(255, 255, 255, 0.4)',
  textMuted: 'rgba(255, 255, 255, 0.25)',
  
  // Primary gradient
  primary: '#6366f1',
  primaryHover: '#818cf8',
  primaryMuted: 'rgba(99, 102, 241, 0.15)',
  
  // Accent colors
  accent: {
    blue: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
    indigo: '#6366f1',
    cyan: '#06b6d4',
    teal: '#14b8a6',
    emerald: '#10b981',
    green: '#22c55e',
    yellow: '#eab308',
    orange: '#f97316',
    red: '#ef4444',
  },
  
  // Status
  success: '#22c55e',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  warning: '#f59e0b',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  error: '#ef4444',
  errorMuted: 'rgba(239, 68, 68, 0.15)',
  info: '#3b82f6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',
  
  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
  gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #22c55e 100%)',
  gradientWarning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  gradientError: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
  gradientGlow: 'radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 60%)',
  gradientCard: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
};

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

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.6)',
  glow: '0 0 40px rgba(99, 102, 241, 0.15)',
  glowStrong: '0 0 60px rgba(99, 102, 241, 0.25)',
};

export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontMono: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, monospace',
  
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

// Animation keyframes (as CSS string)
export const animations = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
    50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.5); }
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  
  @keyframes ripple {
    0% { transform: scale(1); opacity: 0.4; }
    100% { transform: scale(2); opacity: 0; }
  }
  
  @keyframes gradientFlow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

// Common component styles
export const componentStyles = {
  card: {
    background: colors.backgroundElevated,
    borderRadius: radius.lg,
    border: `1px solid ${colors.border}`,
    transition: transitions.smooth,
  },
  
  cardHover: {
    background: colors.backgroundHover,
    borderColor: colors.borderFocus,
    boxShadow: shadows.lg,
    transform: 'translateY(-2px)',
  },
  
  button: {
    borderRadius: radius.md,
    fontWeight: typography.weights.medium,
    fontSize: typography.sizes.sm,
    transition: transitions.fast,
    cursor: 'pointer',
    outline: 'none',
  },
  
  input: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: typography.sizes.base,
    padding: `${spacing.md} ${spacing.lg}`,
    transition: transitions.fast,
    outline: 'none',
  },
  
  badge: {
    borderRadius: radius.full,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    padding: `${spacing.xs} ${spacing.sm}`,
    letterSpacing: '0.02em',
  },
  
  glassCard: {
    background: 'rgba(20, 20, 28, 0.8)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: radius.xl,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.lg,
  },
};

// Export default theme object
export const theme = {
  colors,
  spacing,
  radius,
  shadows,
  typography,
  transitions,
  animations,
  componentStyles,
};

export default theme;
