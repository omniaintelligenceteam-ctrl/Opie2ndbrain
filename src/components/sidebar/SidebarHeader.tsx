// src/components/sidebar/SidebarHeader.tsx
'use client';
import React, { memo } from 'react';
import OpieStatusWidget from '../OpieStatusWidget';
import SidebarWidgets from '../SidebarWidgets';

interface SidebarHeaderProps {
  sidebarExpanded: boolean;
  isMobile: boolean;
  onSettingsClick: () => void;
  onToggleSidebar: () => void;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = memo(function SidebarHeader({
  sidebarExpanded,
  isMobile,
  onSettingsClick,
  onToggleSidebar,
}) {
  return (
    <>
      {/* Opie Status Widget */}
      <div
        style={{
          padding: sidebarExpanded ? '16px' : '12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <OpieStatusWidget
          size={sidebarExpanded ? 'medium' : 'small'}
          showDetails={sidebarExpanded}
          onClick={onSettingsClick}
        />
      </div>

      {/* Sidebar Widgets — only on desktop */}
      {!isMobile && <SidebarWidgets isExpanded={sidebarExpanded} />}

      {/* Collapse/Expand Toggle */}
      {!isMobile && (
        <div
          style={{
            padding: '8px 14px',
            display: 'flex',
            justifyContent: sidebarExpanded ? 'flex-end' : 'center',
          }}
        >
          <button
            onClick={onToggleSidebar}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            {sidebarExpanded ? '◀' : '▶'}
          </button>
        </div>
      )}
    </>
  );
});

export default SidebarHeader;
