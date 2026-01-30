'use client'

export default function GlobalStyles(): React.ReactElement {
  return (
    <style dangerouslySetInnerHTML={{__html: `
      /* Reset & Base */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      html {
        color-scheme: dark light;
        -webkit-tap-highlight-color: transparent;
      }
      
      body {
        font-family: Inter, system-ui, -apple-system, sans-serif;
        background: var(--bg-primary, #0d0d0d);
        color: var(--text-primary, #f5f5f5);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        overflow-x: hidden;
      }
      
      /* Touch-friendly interactive elements */
      button, a, [role="button"] {
        min-height: 44px;
        min-width: 44px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      
      /* Small buttons exception */
      button.small, .btn-small {
        min-height: 32px;
        min-width: 32px;
      }
      
      /* Focus styles for accessibility */
      :focus-visible {
        outline: 2px solid var(--accent, #5e6ad2);
        outline-offset: 2px;
      }
      
      /* Scrollbar styling */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      
      ::-webkit-scrollbar-thumb {
        background: var(--border, rgba(255,255,255,0.1));
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted, rgba(255,255,255,0.2));
      }
      
      /* Selection */
      ::selection {
        background: var(--accent-muted, rgba(94,106,210,0.3));
        color: var(--text-primary, #fff);
      }
      
      /* Inputs */
      input, textarea, select {
        font-family: inherit;
        font-size: inherit;
        color: inherit;
      }
      
      input::placeholder, textarea::placeholder {
        color: var(--text-muted, rgba(255,255,255,0.4));
      }
      
      /* Document viewer (2nd Brain) */
      .app-container {
        display: flex;
        height: 100vh;
        overflow: hidden;
      }
      
      .sidebar {
        width: 256px;
        height: 100vh;
        background: var(--bg-secondary, #141414);
        border-right: 1px solid var(--border, #262626);
        display: flex;
        flex-direction: column;
      }
      
      .sidebar-header {
        padding: 16px;
        border-bottom: 1px solid var(--border, #262626);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .sidebar-header svg { color: var(--accent, #5e6ad2); }
      .sidebar-header span { font-size: 18px; font-weight: 600; }
      
      .sidebar-search { padding: 12px; }
      
      .search-input {
        width: 100%;
        padding: 8px 12px 8px 36px;
        background: var(--bg-tertiary, #1a1a1a);
        border: 1px solid var(--border, #262626);
        border-radius: 8px;
        color: var(--text-primary, #f5f5f5);
        font-size: 14px;
      }
      
      .search-input:focus {
        outline: none;
        border-color: var(--accent, #5e6ad2);
      }
      
      .search-wrapper {
        position: relative;
      }
      
      .search-wrapper svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted, #737373);
        width: 16px;
        height: 16px;
      }
      
      .sidebar-section { padding: 8px 12px; }
      
      .sidebar-section-title {
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        color: var(--text-muted, #737373);
        padding: 0 12px;
        margin-bottom: 8px;
      }
      
      .sidebar-nav {
        flex: 1;
        overflow-y: auto;
        padding: 8px 12px;
      }
      
      .sidebar-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 14px;
        color: var(--text-secondary, #a3a3a3);
        cursor: pointer;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
        min-height: 36px;
      }
      
      .sidebar-item:hover {
        background: var(--bg-hover, #262626);
        color: var(--text-primary, #f5f5f5);
      }
      
      .sidebar-item.active {
        background: var(--bg-active, #262626);
        color: var(--text-primary, #f5f5f5);
      }
      
      .sidebar-footer {
        padding: 16px;
        border-top: 1px solid var(--border, #262626);
        font-size: 12px;
        color: var(--text-muted, #737373);
      }
      
      .main-content {
        flex: 1;
        overflow-y: auto;
        background: var(--bg-primary, #0d0d0d);
      }
      
      .welcome-screen {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
      }
      
      .welcome-emoji { font-size: 64px; margin-bottom: 16px; }
      .welcome-title { font-size: 20px; font-weight: 500; margin-bottom: 8px; }
      .welcome-subtitle { color: var(--text-secondary, #a3a3a3); }
      
      .document-view {
        max-width: 768px;
        margin: 0 auto;
        padding: 48px 32px;
      }
      
      .document-header { margin-bottom: 32px; }
      .document-title { font-size: 30px; font-weight: 700; margin-bottom: 16px; }
      
      .document-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        font-size: 14px;
        color: var(--text-secondary, #a3a3a3);
      }
      
      .document-meta-item { display: flex; align-items: center; gap: 6px; }
      .document-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
      
      .tag {
        padding: 2px 8px;
        font-size: 12px;
        border-radius: 9999px;
        background: var(--accent-muted, rgba(94,106,210,0.1));
        color: var(--accent, #5e6ad2);
      }
      
      .document-divider {
        border: none;
        border-top: 1px solid var(--border, #262626);
        margin-bottom: 32px;
      }
      
      .markdown-content { font-size: 16px; line-height: 1.7; }
      .markdown-content h1 { font-size: 24px; font-weight: 700; margin: 32px 0 16px; }
      .markdown-content h2 { font-size: 20px; font-weight: 600; margin: 32px 0 12px; }
      .markdown-content p { margin-bottom: 16px; }
      .markdown-content a { color: var(--accent, #5e6ad2); }
      
      .markdown-content code {
        background: var(--bg-tertiary, #1a1a1a);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'JetBrains Mono', monospace;
      }
      
      .search-results { padding: 0 12px 12px; }
      
      .category-header {
        display: flex;
        justify-content: space-between;
        width: 100%;
      }
      
      .category-info, .category-meta {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .category-count {
        font-size: 12px;
        color: var(--text-muted, #737373);
      }
      
      .category-children {
        margin-left: 16px;
        padding-left: 8px;
        border-left: 1px solid var(--border, #262626);
      }
      
      .empty-state {
        padding: 8px 12px;
        font-size: 12px;
        color: var(--text-muted, #737373);
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        .sidebar {
          position: fixed;
          left: -100%;
          z-index: 100;
          transition: left 0.3s ease;
        }
        
        .sidebar.open {
          left: 0;
        }
        
        .document-view {
          padding: 24px 16px;
        }
        
        .document-title {
          font-size: 24px;
        }
      }
      
      /* Pull to refresh indicator */
      .ptr-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        color: var(--text-muted);
        font-size: 0.9rem;
      }
      
      .ptr-indicator.loading {
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      /* Bottom nav for mobile */
      .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--bg-secondary);
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: space-around;
        padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
        z-index: 100;
        transition: transform 0.3s ease;
      }
      
      .bottom-nav.hidden {
        transform: translateY(100%);
      }
      
      .bottom-nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 16px;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 0.7rem;
        min-height: 44px;
      }
      
      .bottom-nav-item.active {
        color: var(--accent);
      }
      
      .bottom-nav-icon {
        font-size: 20px;
      }
      
      /* Safe area padding for notched phones */
      @supports (padding: env(safe-area-inset-bottom)) {
        body {
          padding-bottom: env(safe-area-inset-bottom);
        }
      }
      
      /* Theme transition */
      html.theme-transition,
      html.theme-transition *,
      html.theme-transition *::before,
      html.theme-transition *::after {
        transition: background-color 0.3s ease, color 0.15s ease, border-color 0.3s ease !important;
        transition-delay: 0 !important;
      }
      
      /* PWA install prompt */
      .pwa-install-prompt {
        position: fixed;
        bottom: 80px;
        left: 16px;
        right: 16px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1000;
        box-shadow: 0 4px 20px var(--shadow);
      }
      
      .pwa-install-prompt button {
        padding: 10px 20px;
        border-radius: 8px;
        border: none;
        font-weight: 600;
        cursor: pointer;
      }
      
      .pwa-install-btn {
        background: var(--accent);
        color: white;
      }
      
      .pwa-dismiss-btn {
        background: transparent;
        color: var(--text-muted);
      }
    `}} />
  )
}
