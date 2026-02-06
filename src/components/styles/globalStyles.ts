// src/components/styles/globalStyles.ts
// Global CSS animations and utility classes extracted from OpieKanban

export const globalStyles = `
  /* Premium Animation Keyframes */
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.3); }
    50% { box-shadow: 0 0 40px rgba(102, 126, 234, 0.5); }
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
  @keyframes pulseRing {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(2); opacity: 0; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  /* Premium Hover Effects */
  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
  }

  /* Skeleton Loading */
  .skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease infinite;
    border-radius: 8px;
  }

  /* Status Dot with Glow */
  .status-dot-online {
    background: #22c55e;
    box-shadow: 0 0 10px rgba(34, 197, 94, 0.6);
    position: relative;
  }
  .status-dot-online::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: inherit;
    background: #22c55e;
    animation: pulseRing 2s ease-out infinite;
  }

  /* Premium Card Hover */
  .premium-card-hover {
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .premium-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    border-color: rgba(255,255,255,0.1);
  }

  /* Kanban Task Hover Effects */
  .kanban-task-hover:hover {
    background: rgba(255,255,255,0.06) !important;
    border-color: rgba(99,102,241,0.3) !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
  }

  /* Enhanced Kanban Scrollbar */
  .kanban-scrollable::-webkit-scrollbar { width: 4px; }
  .kanban-scrollable::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 2px; }
  .kanban-scrollable::-webkit-scrollbar-thumb { background: rgba(34,197,94,0.3); border-radius: 2px; }
  .kanban-scrollable::-webkit-scrollbar-thumb:hover { background: rgba(34,197,94,0.5); }

  /* Show More / Collapse Hover */
  .show-more-hover:hover { color: rgba(255,255,255,0.8) !important; background: rgba(255,255,255,0.04) !important; }
  .collapse-hover:hover { background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.7) !important; border-color: rgba(255,255,255,0.12) !important; }

  /* Animated Gradient Border */
  .gradient-border { position: relative; }
  .gradient-border::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, rgba(102,126,234,0.4), rgba(168,85,247,0.4), rgba(6,182,212,0.4), rgba(102,126,234,0.4));
    background-size: 300% 300%;
    animation: gradientFlow 8s ease infinite;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .gradient-border:hover::before { opacity: 1; }

  /* Custom scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 999px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }

  /* Text gradient utility */
  .text-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Focus ring */
  *:focus-visible {
    outline: 2px solid rgba(102, 126, 234, 0.8);
    outline-offset: 2px;
  }
`;
