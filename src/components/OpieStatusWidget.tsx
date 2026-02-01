'use client';

interface OpieStatusWidgetProps {
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  onClick?: () => void;
}

export default function OpieStatusWidget({ 
  size = 'medium',
  onClick 
}: OpieStatusWidgetProps) {
  const logoSize = size === 'small' ? 120 : size === 'medium' ? 180 : 240;

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: size === 'small' ? '10px' : '14px',
        padding: size === 'small' ? '8px' : '12px',
        borderRadius: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        background: 'transparent',
      }}
      onClick={onClick}
    >
      {/* Opie Neon Logo */}
      <img 
        src="/opie-logo-neon.png" 
        alt="Opie"
        style={{
          width: logoSize,
          height: logoSize,
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
    </div>
  );
}
