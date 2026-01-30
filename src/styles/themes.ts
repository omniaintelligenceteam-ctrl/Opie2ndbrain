export interface Theme {
  name: 'dark' | 'light';
  colors: {
    // Backgrounds - Premium depth
    bgDeep: string;
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgElevated: string;
    bgCard: string;
    bgHover: string;
    bgActive: string;
    
    // Glass morphism
    glassBg: string;
    glassBorder: string;
    glassHighlight: string;
    
    // Text with proper hierarchy
    textWhite: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textMuted: string;
    
    // Borders
    border: string;
    borderLight: string;
    borderMedium: string;
    borderGlow: string;
    
    // Accents - Premium palette
    accent: string;
    accentHover: string;
    accentMuted: string;
    accentSecondary: string;
    accentCyan: string;
    accentPurple: string;
    accentPink: string;
    
    // Status - Vibrant
    success: string;
    successBg: string;
    successGlow: string;
    warning: string;
    warningBg: string;
    warningGlow: string;
    error: string;
    errorBg: string;
    errorGlow: string;
    info: string;
    infoBg: string;
    infoGlow: string;
    
    // Gradients
    gradientPrimary: string;
    gradientSecondary: string;
    gradientAccent: string;
    gradientSuccess: string;
    gradientWarning: string;
    gradientDanger: string;
    gradientMesh: string;
    
    // Chat bubbles
    bubbleUser: string;
    bubbleAssistant: string;
    
    // Shadows
    shadowSm: string;
    shadowMd: string;
    shadowLg: string;
    shadowXl: string;
    shadowGlow: string;
    
    // Overlays
    overlay: string;
  };
}

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    // Backgrounds - Deep, rich darks
    bgDeep: '#07070f',
    bgPrimary: '#0a0a14',
    bgSecondary: '#0d0d15',
    bgTertiary: '#131320',
    bgElevated: '#1a1a2e',
    bgCard: 'rgba(20, 20, 35, 0.8)',
    bgHover: 'rgba(255,255,255,0.05)',
    bgActive: 'rgba(102,126,234,0.15)',
    
    // Glass morphism
    glassBg: 'rgba(15, 15, 26, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassHighlight: 'rgba(255, 255, 255, 0.03)',
    
    // Text hierarchy
    textWhite: '#ffffff',
    textPrimary: 'rgba(255, 255, 255, 0.95)',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textTertiary: 'rgba(255, 255, 255, 0.5)',
    textMuted: 'rgba(255, 255, 255, 0.35)',
    
    // Borders
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.05)',
    borderMedium: 'rgba(255, 255, 255, 0.12)',
    borderGlow: 'rgba(102, 126, 234, 0.4)',
    
    // Accents - Premium palette
    accent: '#667eea',
    accentHover: '#7c8ff2',
    accentMuted: 'rgba(102,126,234,0.2)',
    accentSecondary: '#764ba2',
    accentCyan: '#06b6d4',
    accentPurple: '#a855f7',
    accentPink: '#ec4899',
    
    // Status - Vibrant with glows
    success: '#22c55e',
    successBg: 'rgba(34, 197, 94, 0.12)',
    successGlow: 'rgba(34, 197, 94, 0.5)',
    warning: '#f59e0b',
    warningBg: 'rgba(245, 158, 11, 0.12)',
    warningGlow: 'rgba(245, 158, 11, 0.5)',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.12)',
    errorGlow: 'rgba(239, 68, 68, 0.5)',
    info: '#3b82f6',
    infoBg: 'rgba(59, 130, 246, 0.12)',
    infoGlow: 'rgba(59, 130, 246, 0.5)',
    
    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gradientSecondary: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    gradientAccent: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    gradientWarning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    gradientDanger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    gradientMesh: `
      radial-gradient(at 40% 20%, rgba(102, 126, 234, 0.15) 0px, transparent 50%),
      radial-gradient(at 80% 0%, rgba(118, 75, 162, 0.1) 0px, transparent 50%),
      radial-gradient(at 0% 50%, rgba(6, 182, 212, 0.08) 0px, transparent 50%)
    `,
    
    // Chat
    bubbleUser: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    bubbleAssistant: 'rgba(255,255,255,0.06)',
    
    // Shadows
    shadowSm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    shadowMd: '0 4px 12px rgba(0, 0, 0, 0.4)',
    shadowLg: '0 8px 30px rgba(0, 0, 0, 0.5)',
    shadowXl: '0 20px 60px rgba(0, 0, 0, 0.6)',
    shadowGlow: '0 0 40px rgba(102, 126, 234, 0.3)',
    
    overlay: 'rgba(0,0,0,0.6)',
  },
};

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    // Backgrounds - Clean whites and grays
    bgDeep: '#f8f9fc',
    bgPrimary: '#ffffff',
    bgSecondary: '#f8f9fc',
    bgTertiary: '#f0f2f5',
    bgElevated: '#ffffff',
    bgCard: 'rgba(255, 255, 255, 0.9)',
    bgHover: 'rgba(0,0,0,0.04)',
    bgActive: 'rgba(102,126,234,0.1)',
    
    // Glass morphism
    glassBg: 'rgba(255, 255, 255, 0.8)',
    glassBorder: 'rgba(0, 0, 0, 0.08)',
    glassHighlight: 'rgba(255, 255, 255, 0.5)',
    
    // Text hierarchy
    textWhite: '#ffffff',
    textPrimary: '#1a1a2e',
    textSecondary: '#4a4a5c',
    textTertiary: '#6a6a7c',
    textMuted: '#8a8a9c',
    
    // Borders
    border: 'rgba(0, 0, 0, 0.1)',
    borderLight: 'rgba(0, 0, 0, 0.05)',
    borderMedium: 'rgba(0, 0, 0, 0.12)',
    borderGlow: 'rgba(94, 106, 210, 0.4)',
    
    // Accents
    accent: '#5e6ad2',
    accentHover: '#4c58b8',
    accentMuted: 'rgba(94,106,210,0.15)',
    accentSecondary: '#7c3aed',
    accentCyan: '#0891b2',
    accentPurple: '#9333ea',
    accentPink: '#db2777',
    
    // Status
    success: '#16a34a',
    successBg: 'rgba(22, 163, 74, 0.1)',
    successGlow: 'rgba(22, 163, 74, 0.3)',
    warning: '#d97706',
    warningBg: 'rgba(217, 119, 6, 0.1)',
    warningGlow: 'rgba(217, 119, 6, 0.3)',
    error: '#dc2626',
    errorBg: 'rgba(220, 38, 38, 0.1)',
    errorGlow: 'rgba(220, 38, 38, 0.3)',
    info: '#2563eb',
    infoBg: 'rgba(37, 99, 235, 0.1)',
    infoGlow: 'rgba(37, 99, 235, 0.3)',
    
    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)',
    gradientSecondary: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    gradientAccent: 'linear-gradient(135deg, #0891b2 0%, #2563eb 100%)',
    gradientSuccess: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
    gradientWarning: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    gradientDanger: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    gradientMesh: `
      radial-gradient(at 40% 20%, rgba(94, 106, 210, 0.08) 0px, transparent 50%),
      radial-gradient(at 80% 0%, rgba(124, 58, 237, 0.06) 0px, transparent 50%),
      radial-gradient(at 0% 50%, rgba(8, 145, 178, 0.05) 0px, transparent 50%)
    `,
    
    // Chat
    bubbleUser: 'linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)',
    bubbleAssistant: '#f0f2f5',
    
    // Shadows
    shadowSm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    shadowMd: '0 4px 12px rgba(0, 0, 0, 0.1)',
    shadowLg: '0 8px 30px rgba(0, 0, 0, 0.12)',
    shadowXl: '0 20px 60px rgba(0, 0, 0, 0.15)',
    shadowGlow: '0 0 40px rgba(94, 106, 210, 0.2)',
    
    overlay: 'rgba(0,0,0,0.3)',
  },
};

export const themes = { dark: darkTheme, light: lightTheme };

export function getCSSVariables(theme: Theme): string {
  return `
    --bg-deep: ${theme.colors.bgDeep};
    --bg-primary: ${theme.colors.bgPrimary};
    --bg-secondary: ${theme.colors.bgSecondary};
    --bg-tertiary: ${theme.colors.bgTertiary};
    --bg-elevated: ${theme.colors.bgElevated};
    --bg-card: ${theme.colors.bgCard};
    --bg-hover: ${theme.colors.bgHover};
    --bg-active: ${theme.colors.bgActive};
    
    --glass-bg: ${theme.colors.glassBg};
    --glass-border: ${theme.colors.glassBorder};
    --glass-highlight: ${theme.colors.glassHighlight};
    
    --text-white: ${theme.colors.textWhite};
    --text-primary: ${theme.colors.textPrimary};
    --text-secondary: ${theme.colors.textSecondary};
    --text-tertiary: ${theme.colors.textTertiary};
    --text-muted: ${theme.colors.textMuted};
    
    --border: ${theme.colors.border};
    --border-light: ${theme.colors.borderLight};
    --border-medium: ${theme.colors.borderMedium};
    --border-glow: ${theme.colors.borderGlow};
    
    --accent: ${theme.colors.accent};
    --accent-hover: ${theme.colors.accentHover};
    --accent-muted: ${theme.colors.accentMuted};
    --accent-secondary: ${theme.colors.accentSecondary};
    --accent-cyan: ${theme.colors.accentCyan};
    --accent-purple: ${theme.colors.accentPurple};
    --accent-pink: ${theme.colors.accentPink};
    
    --success: ${theme.colors.success};
    --success-bg: ${theme.colors.successBg};
    --success-glow: ${theme.colors.successGlow};
    --warning: ${theme.colors.warning};
    --warning-bg: ${theme.colors.warningBg};
    --warning-glow: ${theme.colors.warningGlow};
    --error: ${theme.colors.error};
    --error-bg: ${theme.colors.errorBg};
    --error-glow: ${theme.colors.errorGlow};
    --info: ${theme.colors.info};
    --info-bg: ${theme.colors.infoBg};
    --info-glow: ${theme.colors.infoGlow};
    
    --gradient-primary: ${theme.colors.gradientPrimary};
    --gradient-secondary: ${theme.colors.gradientSecondary};
    --gradient-accent: ${theme.colors.gradientAccent};
    --gradient-success: ${theme.colors.gradientSuccess};
    --gradient-warning: ${theme.colors.gradientWarning};
    --gradient-danger: ${theme.colors.gradientDanger};
    
    --bubble-user: ${theme.colors.bubbleUser};
    --bubble-assistant: ${theme.colors.bubbleAssistant};
    
    --shadow-sm: ${theme.colors.shadowSm};
    --shadow-md: ${theme.colors.shadowMd};
    --shadow-lg: ${theme.colors.shadowLg};
    --shadow-xl: ${theme.colors.shadowXl};
    --shadow-glow: ${theme.colors.shadowGlow};
    
    --overlay: ${theme.colors.overlay};
  `;
}
