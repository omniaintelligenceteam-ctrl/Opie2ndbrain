'use client';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

/** Base skeleton shimmer block. Uses the .skeleton class from premium.css. */
export function Skeleton({ width = '100%', height = 16, borderRadius, style, className }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className ?? ''}`}
      style={{
        width,
        height,
        borderRadius: borderRadius ?? 8,
        ...style,
      }}
    />
  );
}

/** Multiple lines of skeleton text with varying widths. */
export function SkeletonText({ lines = 3, lineHeight = 14, gap = 8 }: { lines?: number; lineHeight?: number; gap?: number }) {
  const widths = ['100%', '92%', '78%', '85%', '65%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={lineHeight} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

/** Card-shaped skeleton with header area and body lines. */
export function SkeletonCard({ headerHeight = 20, bodyLines = 2, padding = 16 }: { headerHeight?: number; bodyLines?: number; padding?: number }) {
  return (
    <div
      style={{
        padding,
        borderRadius: 12,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <Skeleton height={headerHeight} width="60%" style={{ marginBottom: 12 }} />
      <SkeletonText lines={bodyLines} lineHeight={12} gap={6} />
    </div>
  );
}

/** Repeated row skeletons for lists. */
export function SkeletonList({ count = 4, rowHeight = 48, gap = 8 }: { count?: number; rowHeight?: number; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton width={rowHeight * 0.7} height={rowHeight * 0.7} borderRadius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton height={14} width={`${65 + (i % 3) * 10}%`} style={{ marginBottom: 6 }} />
            <Skeleton height={10} width={`${40 + (i % 2) * 15}%`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Metric card skeleton matching SmartDashboardHome's MetricCard layout. */
export function SkeletonMetricCard() {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 14,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        minHeight: 100,
      }}
    >
      <Skeleton height={12} width="50%" style={{ marginBottom: 12 }} />
      <Skeleton height={28} width="40%" style={{ marginBottom: 8 }} />
      <Skeleton height={10} width="70%" />
    </div>
  );
}
