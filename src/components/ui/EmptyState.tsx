'use client';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

/** Consistent empty state with icon, description, and optional CTA buttons. */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div style={styles.container}>
      <div style={styles.iconWrapper}>
        <span style={styles.icon}>{icon}</span>
        <div style={styles.iconGlow} />
      </div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
      {(actionLabel || secondaryActionLabel) && (
        <div style={styles.actions}>
          {actionLabel && onAction && (
            <button onClick={onAction} style={styles.primaryBtn}>
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button onClick={onSecondaryAction} style={styles.secondaryBtn}>
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    textAlign: 'center',
    padding: '48px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    animation: 'fadeIn 0.3s ease',
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  icon: {
    fontSize: 48,
    display: 'block',
    lineHeight: 1,
    position: 'relative',
    zIndex: 1,
  },
  iconGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(102, 126, 234, 0.12), transparent 70%)',
    zIndex: 0,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  description: {
    margin: 0,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    lineHeight: 1.5,
    maxWidth: 280,
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
  primaryBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  secondaryBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
};
