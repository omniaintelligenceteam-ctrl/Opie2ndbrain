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
  const orbSize = size === 'small' ? 48 : size === 'medium' ? 64 : 80;

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
      {/* Opie Avatar - Neural Core with Lightning */}
      <div style={{
        width: orbSize,
        height: orbSize,
        flexShrink: 0,
        position: 'relative',
      }}>
        <svg
          viewBox="0 0 100 100"
          style={{
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="50%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            
            <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="50%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#667eea" />
            </linearGradient>
            
            <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#667eea" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </radialGradient>
            
            {/* Filters */}
            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feFlood floodColor="#667eea" floodOpacity="0.6"/>
              <feComposite in2="blur" operator="in"/>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Outer pulsing ring */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#coreGradient)" strokeWidth="0.5" opacity="0.3">
            <animate attributeName="r" values="44;48;44" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite"/>
          </circle>
          
          {/* Neural network background */}
          <g opacity="0.4">
            {/* Hexagonal neural pattern */}
            <polygon points="50,20 70,35 70,65 50,80 30,65 30,35" fill="none" stroke="#667eea" strokeWidth="0.5">
              <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite"/>
            </polygon>
            <polygon points="50,28 62,38 62,62 50,72 38,62 38,38" fill="none" stroke="#8b5cf6" strokeWidth="0.5">
              <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite"/>
            </polygon>
            
            {/* Neural connection lines */}
            <line x1="50" y1="20" x2="50" y2="35" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5"/>
            <line x1="70" y1="35" x2="58" y2="42" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5"/>
            <line x1="70" y1="65" x2="58" y2="58" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5"/>
            <line x1="50" y1="80" x2="50" y2="65" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5"/>
            <line x1="30" y1="65" x2="42" y2="58" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5"/>
            <line x1="30" y1="35" x2="42" y2="42" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5"/>
          </g>
          
          {/* Central core glow */}
          <circle cx="50" cy="50" r="20" fill="url(#glowGradient)">
            <animate attributeName="r" values="18;22;18" dur="2s" repeatCount="indefinite"/>
          </circle>
          
          {/* Core ring */}
          <circle cx="50" cy="50" r="15" fill="none" stroke="url(#coreGradient)" strokeWidth="2" filter="url(#softGlow)">
            <animate attributeName="r" values="14;16;14" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          
          {/* Inner core */}
          <circle cx="50" cy="50" r="10" fill="#0c1222" stroke="url(#coreGradient)" strokeWidth="1"/>
          
          {/* Lightning bolt - the signature */}
          <g filter="url(#strongGlow)">
            <path 
              d="M52 38 L48 38 L46 48 L42 48 L50 62 L48 52 L52 52 L54 44 L58 44 Z" 
              fill="url(#lightningGradient)"
            >
              <animate attributeName="opacity" values="0.9;1;0.9" dur="0.5s" repeatCount="indefinite"/>
            </path>
          </g>
          
          {/* Orbiting energy particles */}
          <g>
            <circle r="2" fill="#0ea5e9" filter="url(#softGlow)">
              <animateMotion dur="4s" repeatCount="indefinite">
                <mpath href="#orbit1"/>
              </animateMotion>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
            </circle>
            
            <circle r="1.5" fill="#8b5cf6" filter="url(#softGlow)">
              <animateMotion dur="5s" repeatCount="indefinite">
                <mpath href="#orbit2"/>
              </animateMotion>
              <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            
            <circle r="1" fill="#22c55e" filter="url(#softGlow)">
              <animateMotion dur="3s" repeatCount="indefinite">
                <mpath href="#orbit3"/>
              </animateMotion>
              <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite"/>
            </circle>
          </g>
          
          {/* Orbit paths (invisible) */}
          <ellipse id="orbit1" cx="50" cy="50" rx="28" ry="12" transform="rotate(-30 50 50)" fill="none"/>
          <ellipse id="orbit2" cx="50" cy="50" rx="25" ry="10" transform="rotate(30 50 50)" fill="none"/>
          <circle id="orbit3" cx="50" cy="50" r="22" fill="none"/>
          
          {/* Energy pulses radiating out */}
          <circle cx="50" cy="50" r="30" fill="none" stroke="#667eea" strokeWidth="0.5" opacity="0">
            <animate attributeName="r" values="15;35" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="50" cy="50" r="30" fill="none" stroke="#0ea5e9" strokeWidth="0.5" opacity="0">
            <animate attributeName="r" values="15;35" dur="2s" begin="1s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0" dur="2s" begin="1s" repeatCount="indefinite"/>
          </circle>
          
          {/* Sparkle accents */}
          <g filter="url(#softGlow)">
            <circle cx="35" cy="30" r="1" fill="#fff">
              <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/>
              <animate attributeName="r" values="0.5;1.5;0.5" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="68" cy="42" r="0.8" fill="#fff">
              <animate attributeName="opacity" values="0;1;0" dur="2.5s" begin="0.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="62" cy="70" r="0.8" fill="#fff">
              <animate attributeName="opacity" values="0;1;0" dur="4s" begin="1s" repeatCount="indefinite"/>
            </circle>
            <circle cx="32" cy="65" r="1" fill="#fff">
              <animate attributeName="opacity" values="0;1;0" dur="3.5s" begin="1.5s" repeatCount="indefinite"/>
            </circle>
          </g>
        </svg>
      </div>

      {/* Name */}
      <div>
        <div style={{
          color: '#fff',
          fontSize: size === 'small' ? '0.95rem' : size === 'medium' ? '1.1rem' : '1.25rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}>
          Opie
        </div>
      </div>
    </div>
  );
}
