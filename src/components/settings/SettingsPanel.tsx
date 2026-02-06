// src/components/settings/SettingsPanel.tsx
// Extracted settings view from OpieKanban
'use client';
import React, { memo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSounds } from '../../hooks/useSounds';
import AgentPersonalityPanel from '../AgentPersonalityPanel';

interface SettingsPanelProps {
  sidebarExpanded: boolean;
  isMobile: boolean;
  isTablet: boolean;
  onToggleSidebar: () => void;
  onShowShortcuts: () => void;
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(20, 20, 35, 0.6)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '20px',
  padding: '28px',
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
};

const cardTitleStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: '1.1rem',
  fontWeight: 600,
  margin: '0 0 24px 0',
  letterSpacing: '-0.02em',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const settingItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 0',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.7)',
  fontSize: '0.9rem',
  fontWeight: 500,
};

const toggleStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.8)',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  minHeight: '40px',
};

const kbdStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: 'rgba(255,255,255,0.06)',
  borderRadius: '8px',
  fontSize: '0.8rem',
  color: 'rgba(255,255,255,0.55)',
  fontFamily: '"JetBrains Mono", "SF Mono", monospace',
  fontWeight: 500,
  border: '1px solid rgba(255,255,255,0.08)',
};

const valueStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.45)',
  fontWeight: 500,
};

const SettingsPanel: React.FC<SettingsPanelProps> = memo(function SettingsPanel({
  sidebarExpanded,
  isMobile,
  isTablet,
  onToggleSidebar,
  onShowShortcuts,
}) {
  const { themeName, toggleTheme } = useTheme();
  const { soundsEnabled, toggleSounds } = useSounds();

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
          gap: isMobile ? '16px' : '20px',
        }}
      >
        {/* Appearance */}
        <div style={cardStyle}>
          <h4 style={cardTitleStyle}>🎨 Appearance</h4>
          <div style={settingItemStyle}>
            <span>Theme</span>
            <button
              onClick={toggleTheme}
              style={{
                ...toggleStyle,
                background:
                  themeName === 'dark'
                    ? 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)'
                    : 'linear-gradient(135deg, #f8f9fc 0%, #e8eaed 100%)',
                color: themeName === 'dark' ? '#fff' : '#1a1a2e',
              }}
            >
              {themeName === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>
          <div style={settingItemStyle}>
            <span>Sidebar</span>
            <button onClick={onToggleSidebar} style={toggleStyle}>
              {sidebarExpanded ? '◀ Collapse' : '▶ Expand'}
            </button>
          </div>
        </div>

        {/* Sound & Voice */}
        <div style={cardStyle}>
          <h4 style={cardTitleStyle}>🔊 Sound & Voice</h4>
          <div style={settingItemStyle}>
            <span>Notification Sounds</span>
            <button
              onClick={toggleSounds}
              style={{
                ...toggleStyle,
                background: soundsEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                color: soundsEnabled ? '#22c55e' : '#ef4444',
              }}
            >
              {soundsEnabled ? '🔔 On' : '🔕 Muted'}
            </button>
          </div>
          <div style={settingItemStyle}>
            <span>TTS Voice</span>
            <span style={valueStyle}>Default</span>
          </div>
          <div style={settingItemStyle}>
            <span>Speech Speed</span>
            <span style={valueStyle}>1.0x</span>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div style={cardStyle}>
          <h4 style={cardTitleStyle}>⌨️ Keyboard Shortcuts</h4>
          <div style={settingItemStyle}>
            <span>Command Palette</span>
            <kbd style={kbdStyle}>⌘K</kbd>
          </div>
          <div style={settingItemStyle}>
            <span>New Message</span>
            <kbd style={kbdStyle}>⌘N</kbd>
          </div>
          <div style={settingItemStyle}>
            <span>Show All Shortcuts</span>
            <button onClick={onShowShortcuts} style={toggleStyle}>
              View All ➔
            </button>
          </div>
        </div>

        {/* Agent Settings */}
        <div style={cardStyle}>
          <h4 style={cardTitleStyle}>🤖 Agent Settings</h4>
          <div style={settingItemStyle}>
            <span>Auto-deploy</span>
            <span style={valueStyle}>Off</span>
          </div>
          <div style={settingItemStyle}>
            <span>Max concurrent</span>
            <span style={valueStyle}>5</span>
          </div>
        </div>

        {/* API Keys */}
        <div style={cardStyle}>
          <h4 style={cardTitleStyle}>🔑 API Keys</h4>
          <div style={settingItemStyle}>
            <span>OpenAI</span>
            <span style={{ ...valueStyle, color: '#22c55e' }}>Connected</span>
          </div>
          <div style={settingItemStyle}>
            <span>ElevenLabs</span>
            <span style={{ ...valueStyle, color: '#22c55e' }}>Connected</span>
          </div>
        </div>

        {/* PWA */}
        <div style={cardStyle}>
          <h4 style={cardTitleStyle}>📱 PWA</h4>
          <div style={settingItemStyle}>
            <span>Install Status</span>
            <span style={valueStyle}>Available</span>
          </div>
          <div style={settingItemStyle}>
            <span>Offline Support</span>
            <span style={{ ...valueStyle, color: '#22c55e' }}>Enabled</span>
          </div>
        </div>
      </div>

      {/* Agent Personality */}
      <div style={{ marginTop: isMobile ? '24px' : '32px', maxWidth: 600 }}>
        <AgentPersonalityPanel />
      </div>
    </>
  );
});

export default SettingsPanel;
