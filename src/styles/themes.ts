export interface Theme {
  name: 'dark' | 'light';
  colors: {
    // Backgrounds
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgHover: string;
    bgActive: string;
    
    // Text
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    
    // Borders
    border: string;
    borderLight: string;
    
    // Accents
    accent: string;
    accentHover: string;
    accentMuted: string;
    
    // Status
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Chat bubbles
    bubbleUser: string;
    bubbleAssistant: string;
    
    // Overlays
    overlay: string;
    shadow: string;
  };
}

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    bgPrimary: '#0f0f1a',
    bgSecondary: '#0d0d15',
    bgTertiary: '#1a1a2e',
    bgHover: 'rgba(255,255,255,0.05)',
    bgActive: 'rgba(102,126,234,0.15)',
    
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.8)',
    textMuted: 'rgba(255,255,255,0.5)',
    
    border: 'rgba(255,255,255,0.08)',
    borderLight: 'rgba(255,255,255,0.05)',
    
    accent: '#667eea',
    accentHover: '#764ba2',
    accentMuted: 'rgba(102,126,234,0.3)',
    
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    bubbleUser: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    bubbleAssistant: 'rgba(255,255,255,0.08)',
    
    overlay: 'rgba(0,0,0,0.6)',
    shadow: 'rgba(0,0,0,0.5)',
  },
};

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    bgPrimary: '#f8f9fc',
    bgSecondary: '#ffffff',
    bgTertiary: '#f0f2f5',
    bgHover: 'rgba(0,0,0,0.04)',
    bgActive: 'rgba(102,126,234,0.1)',
    
    textPrimary: '#1a1a2e',
    textSecondary: '#4a4a5c',
    textMuted: '#8a8a9c',
    
    border: 'rgba(0,0,0,0.1)',
    borderLight: 'rgba(0,0,0,0.05)',
    
    accent: '#5e6ad2',
    accentHover: '#4c58b8',
    accentMuted: 'rgba(94,106,210,0.2)',
    
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
    
    bubbleUser: 'linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)',
    bubbleAssistant: '#e8eaed',
    
    overlay: 'rgba(0,0,0,0.3)',
    shadow: 'rgba(0,0,0,0.15)',
  },
};

export const themes = { dark: darkTheme, light: lightTheme };

export function getCSSVariables(theme: Theme): string {
  return `
    --bg-primary: ${theme.colors.bgPrimary};
    --bg-secondary: ${theme.colors.bgSecondary};
    --bg-tertiary: ${theme.colors.bgTertiary};
    --bg-hover: ${theme.colors.bgHover};
    --bg-active: ${theme.colors.bgActive};
    
    --text-primary: ${theme.colors.textPrimary};
    --text-secondary: ${theme.colors.textSecondary};
    --text-muted: ${theme.colors.textMuted};
    
    --border: ${theme.colors.border};
    --border-light: ${theme.colors.borderLight};
    
    --accent: ${theme.colors.accent};
    --accent-hover: ${theme.colors.accentHover};
    --accent-muted: ${theme.colors.accentMuted};
    
    --success: ${theme.colors.success};
    --warning: ${theme.colors.warning};
    --error: ${theme.colors.error};
    --info: ${theme.colors.info};
    
    --bubble-user: ${theme.colors.bubbleUser};
    --bubble-assistant: ${theme.colors.bubbleAssistant};
    
    --overlay: ${theme.colors.overlay};
    --shadow: ${theme.colors.shadow};
  `;
}
