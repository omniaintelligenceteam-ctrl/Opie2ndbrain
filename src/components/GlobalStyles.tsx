'use client'

export default function GlobalStyles(): React.ReactElement {
  return (
    <style dangerouslySetInnerHTML={{__html: `
      /* ==========================================================================
         OPIE 2ND BRAIN - GLOBAL STYLES
         Premium Enterprise-Grade Design System
         ========================================================================== */

      /* Reset & Base */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      html {
        color-scheme: dark light;
        -webkit-tap-highlight-color: transparent;
        scroll-behavior: smooth;
      }
      
      body {
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: var(--bg-primary, #0a0a14);
        color: var(--text-primary, #f5f5f5);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        overflow-x: hidden;
        line-height: 1.6;
        letter-spacing: -0.01em;
      }
      
      /* Premium Mesh Background */
      body::before {
        content: '';
        position: fixed;
        inset: 0;
        background: 
          radial-gradient(at 40% 20%, rgba(102, 126, 234, 0.12) 0px, transparent 50%),
          radial-gradient(at 80% 0%, rgba(118, 75, 162, 0.08) 0px, transparent 50%),
          radial-gradient(at 0% 50%, rgba(6, 182, 212, 0.06) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.06) 0px, transparent 50%);
        pointer-events: none;
        z-index: -1;
      }
      
      /* Premium Typography */
      h1, h2, h3, h4, h5, h6 {
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.3;
      }
      
      /* Touch-friendly interactive elements */
      button, a, [role="button"] {
        min-height: 44px;
        min-width: 44px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        font-family: inherit;
      }
      
      /* Small buttons exception */
      button.small, .btn-small {
        min-height: 32px;
        min-width: 32px;
      }
      
      /* Focus styles for accessibility - Premium ring */
      :focus-visible {
        outline: 2px solid rgba(102, 126, 234, 0.8);
        outline-offset: 2px;
        border-radius: 4px;
      }
      
      /* Premium Scrollbar */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      
      ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 999px;
        transition: background 0.2s ease;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      /* Firefox scrollbar */
      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
      }
      
      /* Selection */
      ::selection {
        background: rgba(102, 126, 234, 0.35);
        color: #fff;
      }
      
      /* Inputs */
      input, textarea, select {
        font-family: inherit;
        font-size: inherit;
        color: inherit;
        letter-spacing: inherit;
      }
      
      input::placeholder, textarea::placeholder {
        color: rgba(255, 255, 255, 0.35);
      }
      
      /* ==========================================================================
         PREMIUM ANIMATIONS
         ========================================================================== */
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideInLeft {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      @keyframes pulse-ring {
        0% {
          transform: scale(1);
          opacity: 0.6;
        }
        100% {
          transform: scale(2);
          opacity: 0;
        }
      }
      
      @keyframes glowPulse {
        0%, 100% {
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
        }
        50% {
          box-shadow: 0 0 40px rgba(102, 126, 234, 0.5);
        }
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      
      @keyframes gradientFlow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      
      @keyframes success-check {
        0% { stroke-dashoffset: 100; }
        100% { stroke-dashoffset: 0; }
      }
      
      /* ==========================================================================
         DOCUMENT VIEWER STYLES
         ========================================================================== */
      
      .app-container {
        display: flex;
        height: 100vh;
        overflow: hidden;
      }
      
      .sidebar {
        width: 256px;
        height: 100vh;
        background: rgba(13, 13, 21, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-right: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
      }
      
      .sidebar-header {
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .sidebar-header svg { color: #667eea; }
      .sidebar-header span { 
        font-size: 18px; 
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      
      .sidebar-search { padding: 16px; }
      
      .search-input {
        width: 100%;
        padding: 10px 14px 10px 40px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        color: #fff;
        font-size: 14px;
        transition: all 0.2s ease;
      }
      
      .search-input:focus {
        outline: none;
        border-color: rgba(102, 126, 234, 0.5);
        background: rgba(255, 255, 255, 0.06);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
      
      .search-wrapper {
        position: relative;
      }
      
      .search-wrapper svg {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(255, 255, 255, 0.4);
        width: 16px;
        height: 16px;
      }
      
      .sidebar-section { padding: 8px 12px; }
      
      .sidebar-section-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(255, 255, 255, 0.4);
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
        gap: 10px;
        padding: 10px 14px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
        min-height: 40px;
        transition: all 0.15s ease;
      }
      
      .sidebar-item:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #fff;
      }
      
      .sidebar-item.active {
        background: rgba(102, 126, 234, 0.15);
        color: #fff;
      }
      
      .sidebar-footer {
        padding: 16px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 12px;
        color: rgba(255, 255, 255, 0.35);
      }
      
      .main-content {
        flex: 1;
        overflow-y: auto;
        background: var(--bg-primary, #0a0a14);
      }
      
      .welcome-screen {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
      }
      
      .welcome-emoji { 
        font-size: 64px; 
        margin-bottom: 20px;
        animation: float 3s ease-in-out infinite;
      }
      
      .welcome-title { 
        font-size: 24px; 
        font-weight: 600; 
        margin-bottom: 8px;
        letter-spacing: -0.02em;
      }
      
      .welcome-subtitle { 
        color: rgba(255, 255, 255, 0.5);
        font-size: 15px;
      }
      
      .document-view {
        max-width: 768px;
        margin: 0 auto;
        padding: 48px 32px;
        animation: fadeInUp 0.4s ease-out;
      }
      
      .document-header { margin-bottom: 32px; }
      
      .document-title { 
        font-size: 32px; 
        font-weight: 700; 
        margin-bottom: 16px;
        letter-spacing: -0.03em;
        background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .document-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
      }
      
      .document-meta-item { 
        display: flex; 
        align-items: center; 
        gap: 6px;
      }
      
      .document-tags { 
        display: flex; 
        flex-wrap: wrap; 
        gap: 8px; 
        margin-top: 16px;
      }
      
      .tag {
        padding: 4px 12px;
        font-size: 12px;
        font-weight: 500;
        border-radius: 999px;
        background: rgba(102, 126, 234, 0.15);
        color: #667eea;
        border: 1px solid rgba(102, 126, 234, 0.2);
        transition: all 0.2s ease;
      }
      
      .tag:hover {
        background: rgba(102, 126, 234, 0.25);
      }
      
      .document-divider {
        border: none;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        margin-bottom: 32px;
      }
      
      .markdown-content { 
        font-size: 16px; 
        line-height: 1.75;
        color: rgba(255, 255, 255, 0.85);
      }
      
      .markdown-content h1 { 
        font-size: 26px; 
        font-weight: 700; 
        margin: 40px 0 16px;
        letter-spacing: -0.02em;
      }
      
      .markdown-content h2 { 
        font-size: 22px; 
        font-weight: 600; 
        margin: 36px 0 14px;
        letter-spacing: -0.015em;
      }
      
      .markdown-content h3 {
        font-size: 18px;
        font-weight: 600;
        margin: 32px 0 12px;
      }
      
      .markdown-content p { 
        margin-bottom: 16px;
      }
      
      .markdown-content a { 
        color: #667eea;
        text-decoration: none;
        border-bottom: 1px solid rgba(102, 126, 234, 0.3);
        transition: all 0.2s ease;
      }
      
      .markdown-content a:hover {
        color: #8b9cf2;
        border-bottom-color: #667eea;
      }
      
      .markdown-content code {
        background: rgba(255, 255, 255, 0.06);
        padding: 3px 8px;
        border-radius: 6px;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.9em;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      
      .markdown-content pre {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 20px;
        overflow-x: auto;
        margin: 20px 0;
      }
      
      .markdown-content pre code {
        background: none;
        padding: 0;
        border: none;
      }
      
      .markdown-content blockquote {
        border-left: 3px solid #667eea;
        padding-left: 20px;
        margin: 20px 0;
        color: rgba(255, 255, 255, 0.7);
        font-style: italic;
      }
      
      .markdown-content ul, .markdown-content ol {
        margin: 16px 0;
        padding-left: 24px;
      }
      
      .markdown-content li {
        margin: 8px 0;
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
        color: rgba(255, 255, 255, 0.4);
        font-weight: 500;
      }
      
      .category-children {
        margin-left: 16px;
        padding-left: 12px;
        border-left: 1px solid rgba(255, 255, 255, 0.08);
      }
      
      .empty-state {
        padding: 20px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.4);
        text-align: center;
      }
      
      /* ==========================================================================
         MOBILE RESPONSIVE
         ========================================================================== */
      
      @media (max-width: 768px) {
        .sidebar {
          position: fixed;
          left: -100%;
          z-index: 100;
          transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .sidebar.open {
          left: 0;
        }
        
        .document-view {
          padding: 24px 16px;
        }
        
        .document-title {
          font-size: 26px;
        }
      }
      
      /* ==========================================================================
         LOADING STATES
         ========================================================================== */
      
      .loading-skeleton {
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.03) 0%,
          rgba(255, 255, 255, 0.08) 50%,
          rgba(255, 255, 255, 0.03) 100%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s ease infinite;
        border-radius: 8px;
      }
      
      /* Pull to refresh indicator */
      .ptr-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.9rem;
      }
      
      .ptr-indicator.loading {
        animation: spin 1s linear infinite;
      }
      
      /* ==========================================================================
         BOTTOM NAVIGATION
         ========================================================================== */
      
      .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(13, 13, 21, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        justify-content: space-around;
        padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
        z-index: 100;
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.7rem;
        font-weight: 500;
        min-height: 44px;
        transition: all 0.2s ease;
      }
      
      .bottom-nav-item.active {
        color: #667eea;
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
      
      /* ==========================================================================
         THEME TRANSITIONS
         ========================================================================== */
      
      html.theme-transition,
      html.theme-transition *,
      html.theme-transition *::before,
      html.theme-transition *::after {
        transition: background-color 0.3s ease, color 0.15s ease, border-color 0.3s ease !important;
        transition-delay: 0 !important;
      }
      
      /* ==========================================================================
         PWA INSTALL PROMPT
         ========================================================================== */
      
      .pwa-install-prompt {
        position: fixed;
        bottom: 80px;
        left: 16px;
        right: 16px;
        background: rgba(26, 26, 46, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 1000;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        animation: fadeInUp 0.4s ease-out;
      }
      
      .pwa-install-prompt button {
        padding: 12px 24px;
        border-radius: 10px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .pwa-install-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      }
      
      .pwa-install-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
      }
      
      .pwa-dismiss-btn {
        background: transparent;
        color: rgba(255, 255, 255, 0.5);
      }
      
      .pwa-dismiss-btn:hover {
        color: rgba(255, 255, 255, 0.8);
      }
      
      /* ==========================================================================
         PREMIUM CARD ENHANCEMENTS
         ========================================================================== */
      
      .glass-card {
        background: rgba(15, 15, 26, 0.7);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        position: relative;
        overflow: hidden;
      }
      
      .glass-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, 
          transparent 0%, 
          rgba(255, 255, 255, 0.1) 50%,
          transparent 100%
        );
      }
      
      .hover-lift {
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), 
                    box-shadow 0.25s ease;
      }
      
      .hover-lift:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      }
      
      /* ==========================================================================
         STATUS INDICATORS
         ========================================================================== */
      
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        position: relative;
      }
      
      .status-dot.online {
        background: #22c55e;
        box-shadow: 0 0 10px rgba(34, 197, 94, 0.6);
      }
      
      .status-dot.online::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: inherit;
        background: #22c55e;
        animation: pulse-ring 2s ease-out infinite;
      }
      
      .status-dot.busy {
        background: #f59e0b;
        box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
      }
      
      .status-dot.error {
        background: #ef4444;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
      }
      
      /* ==========================================================================
         TOOLTIPS
         ========================================================================== */
      
      [data-tooltip] {
        position: relative;
      }
      
      [data-tooltip]::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%) translateY(5px);
        padding: 8px 12px;
        background: rgba(26, 26, 46, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        color: #fff;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: all 0.2s ease;
        z-index: 1000;
      }
      
      [data-tooltip]:hover::after {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      
      /* ==========================================================================
         REDUCED MOTION
         ========================================================================== */
      
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}} />
  )
}
