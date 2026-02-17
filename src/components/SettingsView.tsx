'use client';

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSounds } from '../hooks/useSounds';
import { useVoiceSettings, PUSH_TO_TALK_KEYS, PushToTalkKey, getPushToTalkKeyLabel } from '../hooks/useVoiceSettings';

export interface SettingsViewProps {
  isMobile: boolean;
  isTablet: boolean;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
  onShowShortcuts: () => void;
}

/**
 * Settings panel with various configuration options
 */
export function SettingsView({
  isMobile,
  isTablet,
  sidebarExpanded,
  onToggleSidebar,
  onShowShortcuts,
}: SettingsViewProps): React.ReactElement {
  const { themeName, toggleTheme } = useTheme();
  const { soundsEnabled, toggleSounds } = useSounds();
  const { pushToTalkEnabled, togglePushToTalk, pushToTalkKey, setPushToTalkKey } = useVoiceSettings();

  return (
    <div style={{
      ...styles.settingsGrid,
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
      gap: isMobile ? '16px' : '20px',
    }}>
      {/* Appearance */}
      <div style={styles.settingsCard}>
        <h4 style={styles.settingsCardTitle}>🎨 Appearance</h4>
        <div style={styles.settingItem}>
          <span>Theme</span>
          <button 
            onClick={toggleTheme}
            style={{
              ...styles.settingToggle,
              background: themeName === 'dark' 
                ? 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)'
                : 'linear-gradient(135deg, #f8f9fc 0%, #e8eaed 100%)',
              color: themeName === 'dark' ? '#fff' : '#1a1a2e',
            }}
          >
            {themeName === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <div style={styles.settingItem}>
          <span>Sidebar</span>
          <button 
            onClick={onToggleSidebar}
            style={styles.settingToggle}
          >
            {sidebarExpanded ? '◀ Collapse' : '▶ Expand'}
          </button>
        </div>
      </div>

      {/* Sound & Voice */}
      <div style={styles.settingsCard}>
        <h4 style={styles.settingsCardTitle}>🔊 Sound & Voice</h4>
        <div style={styles.settingItem}>
          <span>Notification Sounds</span>
          <button 
            onClick={toggleSounds}
            style={{
              ...styles.settingToggle,
              background: soundsEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
              color: soundsEnabled ? '#22c55e' : '#ef4444',
            }}
          >
            {soundsEnabled ? '🔔 On' : '🔕 Muted'}
          </button>
        </div>
        <div style={styles.settingItem}>
          <span>Push-to-Talk Mode</span>
          <button 
            onClick={togglePushToTalk}
            style={{
              ...styles.settingToggle,
              background: pushToTalkEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)',
              color: pushToTalkEnabled ? '#22c55e' : 'rgba(255,255,255,0.8)',
            }}
          >
            {pushToTalkEnabled ? '🎙️ On' : '⏺️ Off'}
          </button>
        </div>
        {pushToTalkEnabled && (
          <div style={styles.settingItem}>
            <span>Push-to-Talk Key</span>
            <select
              value={pushToTalkKey}
              onChange={(e) => setPushToTalkKey(e.target.value as PushToTalkKey)}
              style={styles.settingSelect}
            >
              {PUSH_TO_TALK_KEYS.map((key) => (
                <option key={key.value} value={key.value}>
                  {key.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div style={styles.settingItem}>
          <span>TTS Voice</span>
          <span style={styles.settingValue}>Default</span>
        </div>
        <div style={styles.settingItem}>
          <span>Speech Speed</span>
          <span style={styles.settingValue}>1.0x</span>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div style={styles.settingsCard}>
        <h4 style={styles.settingsCardTitle}>⌨️ Keyboard Shortcuts</h4>
        <div style={styles.settingItem}>
          <span>Command Palette</span>
          <kbd style={styles.kbdKey}>⌘K</kbd>
        </div>
        <div style={styles.settingItem}>
          <span>New Message</span>
          <kbd style={styles.kbdKey}>⌘N</kbd>
        </div>
        <div style={styles.settingItem}>
          <span>Show All Shortcuts</span>
          <button 
            onClick={onShowShortcuts}
            style={styles.settingToggle}
          >
            View All ➔
          </button>
        </div>
      </div>

      {/* Agent Settings */}
      <div style={styles.settingsCard}>
        <h4 style={styles.settingsCardTitle}>🤖 Agent Settings</h4>
        <div style={styles.settingItem}>
          <span>Auto-deploy</span>
          <span style={styles.settingValue}>Off</span>
        </div>
        <div style={styles.settingItem}>
          <span>Max concurrent</span>
          <span style={styles.settingValue}>5</span>
        </div>
      </div>

      {/* API Keys */}
      <div style={styles.settingsCard}>
        <h4 style={styles.settingsCardTitle}>🔑 API Keys</h4>
        <div style={styles.settingItem}>
          <span>OpenAI</span>
          <span style={{ ...styles.settingValue, color: '#22c55e' }}>Connected</span>
        </div>
        <div style={styles.settingItem}>
          <span>ElevenLabs</span>
          <span style={{ ...styles.settingValue, color: '#22c55e' }}>Connected</span>
        </div>
      </div>

      {/* PWA */}
      <div style={styles.settingsCard}>
        <h4 style={styles.settingsCardTitle}>📱 PWA</h4>
        <div style={styles.settingItem}>
          <span>Install Status</span>
          <span style={styles.settingValue}>Available</span>
        </div>
        <div style={styles.settingItem}>
          <span>Offline Support</span>
          <span style={{ ...styles.settingValue, color: '#22c55e' }}>Enabled</span>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
  },
  settingSelect: {
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
    minWidth: '120px',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(255,255,255,0.5)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    backgroundSize: '16px',
    paddingRight: '40px',
  },
  settingsCard: {
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
  },
  settingsCardTitle: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
    margin: '0 0 24px 0',
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  settingValue: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: 500,
  },
  settingToggle: {
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
  },
  kbdKey: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '8px',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.55)',
    fontFamily: '"JetBrains Mono", "SF Mono", monospace',
    fontWeight: 500,
    border: '1px solid rgba(255,255,255,0.08)',
  },
};

export default SettingsView;
