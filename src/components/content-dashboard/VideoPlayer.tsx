'use client'

import { useRef, useState } from 'react'
import { Download, RefreshCw, AlertTriangle } from 'lucide-react'

interface VideoPlayerProps {
  videoUrl: string | null
  thumbnailUrl?: string | null
  duration?: number | null
  expiresAt?: string | null
  status: string
  onRetry?: () => void
  style?: React.CSSProperties
}

export default function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  duration,
  expiresAt,
  status,
  onRetry,
  style,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState(false)

  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false
  const formattedDuration = duration
    ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`
    : null

  // Pending / processing state
  if (status === 'pending' || status === 'processing') {
    return (
      <div style={{
        borderRadius: '12px',
        background: 'rgba(15, 15, 26, 0.8)',
        border: '1px solid rgba(249, 115, 22, 0.2)',
        padding: '32px',
        textAlign: 'center',
        ...style,
      }}>
        <div className="animate-spin" style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid rgba(249, 115, 22, 0.2)',
          borderTopColor: '#f97316',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: '#f97316', fontSize: '0.9rem', fontWeight: 600 }}>
          {status === 'pending' ? 'Queued for generation...' : 'Generating video...'}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginTop: '6px' }}>
          This typically takes 30 seconds to 5 minutes
        </p>
      </div>
    )
  }

  // Failed state
  if (status === 'failed') {
    return (
      <div style={{
        borderRadius: '12px',
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        padding: '32px',
        textAlign: 'center',
        ...style,
      }}>
        <AlertTriangle size={32} style={{ color: '#ef4444', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 600 }}>
          Video generation failed
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: '12px',
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        )}
      </div>
    )
  }

  // Expired state
  if (isExpired) {
    return (
      <div style={{
        borderRadius: '12px',
        background: 'rgba(234, 179, 8, 0.08)',
        border: '1px solid rgba(234, 179, 8, 0.2)',
        padding: '32px',
        textAlign: 'center',
        ...style,
      }}>
        <AlertTriangle size={32} style={{ color: '#eab308', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: 600 }}>
          Video URL has expired
        </p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginTop: '4px' }}>
          HeyGen video URLs expire after 7 days.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: '12px',
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(234, 179, 8, 0.15)',
              color: '#fbbf24',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} /> Regenerate
          </button>
        )}
      </div>
    )
  }

  // No video URL
  if (!videoUrl) return null

  // Video load error
  if (error) {
    return (
      <div style={{
        borderRadius: '12px',
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        padding: '24px',
        textAlign: 'center',
        ...style,
      }}>
        <p style={{ color: '#f87171', fontSize: '0.85rem' }}>
          Failed to load video. The URL may have expired.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: '10px',
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={12} /> Regenerate
          </button>
        )}
      </div>
    )
  }

  // Completed — video player
  return (
    <div style={{
      borderRadius: '12px',
      overflow: 'hidden',
      background: '#000',
      position: 'relative',
      ...style,
    }}>
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl || undefined}
        style={{ width: '100%', display: 'block' }}
        controls
        onError={() => setError(true)}
      />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'rgba(15, 15, 26, 0.9)',
      }}>
        {formattedDuration && (
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
            Duration: {formattedDuration}
          </span>
        )}
        <a
          href={videoUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'rgba(249, 115, 22, 0.15)',
            color: '#f97316',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <Download size={12} /> Download
        </a>
      </div>
    </div>
  )
}
