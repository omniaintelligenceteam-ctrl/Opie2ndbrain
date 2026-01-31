'use client';
import { useState, useEffect } from 'react';

export interface Email {
  id: string;
  from: {
    name: string;
    email: string;
    avatar?: string;
  };
  subject: string;
  preview: string;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  labels?: string[];
  hasAttachment?: boolean;
  threadCount?: number;
  source?: 'gmail' | 'outlook' | 'other';
}

interface EmailWidgetProps {
  emails?: Email[];
  unreadCount?: number;
  onEmailClick?: (email: Email) => void;
  onMarkRead?: (emailId: string) => void;
  onArchive?: (emailId: string) => void;
  onReply?: (emailId: string) => void;
  isConnected?: boolean;
  onConnect?: () => void;
  fullView?: boolean;
}

// Demo emails generator - creates emails relative to current time (client-side only)
function createDemoEmails(): Email[] {
  const now = Date.now();
  return [
    {
      id: '1',
      from: {
        name: 'Sarah Chen',
        email: 'sarah.chen@company.com',
        avatar: undefined,
      },
      subject: 'Q4 Marketing Budget - Needs Approval',
      preview: 'Hey Wes, I\'ve attached the updated Q4 marketing budget proposal. Could you review and approve by EOD tomorrow? The main changes are in the digital advertising section...',
      receivedAt: new Date(now - 1000 * 60 * 15),
      isRead: false,
      isStarred: true,
      isImportant: true,
      hasAttachment: true,
      threadCount: 3,
      source: 'gmail',
    },
    {
      id: '2',
      from: {
        name: 'GitHub',
        email: 'noreply@github.com',
      },
      subject: '[omnia-platform] Pull Request #234 merged',
      preview: 'The pull request "Feature: Add calendar integration" has been merged into main by alex-dev. View the changes on GitHub...',
      receivedAt: new Date(now - 1000 * 60 * 45),
      isRead: false,
      isStarred: false,
      isImportant: false,
      labels: ['notifications'],
      source: 'gmail',
    },
    {
      id: '3',
      from: {
        name: 'David Park',
        email: 'david@omnialightscape.com',
      },
      subject: 'Re: Partnership Opportunity',
      preview: 'Thanks for getting back to me! I think Tuesday at 2pm works great for a call. Looking forward to discussing how we can work together on the commercial lighting project...',
      receivedAt: new Date(now - 1000 * 60 * 60 * 2),
      isRead: true,
      isStarred: false,
      isImportant: true,
      threadCount: 8,
      source: 'gmail',
    },
    {
      id: '4',
      from: {
        name: 'Stripe',
        email: 'receipts@stripe.com',
      },
      subject: 'Your receipt from ACME Corp',
      preview: 'Receipt for $299.00 payment to ACME Corp. Transaction ID: ch_3abc123...',
      receivedAt: new Date(now - 1000 * 60 * 60 * 5),
      isRead: true,
      isStarred: false,
      isImportant: false,
      labels: ['receipts'],
      source: 'gmail',
    },
    {
      id: '5',
      from: {
        name: 'Alex Rivera',
        email: 'alex.rivera@design.co',
      },
      subject: 'Logo designs v2 - Ready for review',
      preview: 'Hey! Here are the revised logo designs based on your feedback. I\'ve made the font bolder and tried a couple different color variations. Let me know which direction you prefer!',
      receivedAt: new Date(now - 1000 * 60 * 60 * 8),
      isRead: false,
      isStarred: false,
      isImportant: false,
      hasAttachment: true,
      source: 'gmail',
    },
  ];
}

export default function EmailWidget({
  emails: propEmails,
  unreadCount: propUnreadCount,
  onEmailClick,
  onMarkRead,
  onArchive,
  onReply,
  isConnected = true,
  onConnect,
  fullView = false,
}: EmailWidgetProps) {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [localEmails, setLocalEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Initialize emails on client only (avoids hydration mismatch)
  useEffect(() => {
    setMounted(true);
    if (propEmails) {
      setLocalEmails(propEmails);
    } else {
      setLocalEmails(createDemoEmails());
    }
  }, [propEmails]);

  const unreadCount = propUnreadCount ?? localEmails.filter(e => !e.isRead).length;

  const formatTime = (date: Date): string => {
    if (!mounted) return '...';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    const colors = ['#667eea', '#764ba2', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    onEmailClick?.(email);
  };

  const handleMarkRead = async (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionInProgress(emailId);
    // Simulate API call
    await new Promise(r => setTimeout(r, 300));
    setLocalEmails(prev => prev.map(em => 
      em.id === emailId ? { ...em, isRead: true } : em
    ));
    onMarkRead?.(emailId);
    setActionInProgress(null);
  };

  const handleArchive = async (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionInProgress(emailId);
    // Simulate API call
    await new Promise(r => setTimeout(r, 300));
    setLocalEmails(prev => prev.filter(em => em.id !== emailId));
    onArchive?.(emailId);
    setActionInProgress(null);
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null);
    }
  };

  const handleReply = (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onReply?.(emailId);
    // TODO: Open compose modal
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>📧</span>
            <div>
              <h2 style={styles.title}>Email</h2>
              <span style={styles.subtitle}>Connect to sync</span>
            </div>
          </div>
        </div>
        <div style={styles.connectPrompt}>
          <span style={styles.connectIcon}>📬</span>
          <h3 style={styles.connectTitle}>Connect Your Email</h3>
          <p style={styles.connectText}>Link your Gmail or Outlook to see important emails here</p>
          <button onClick={onConnect} style={styles.connectButton}>
            Connect Email
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>📧</span>
            <div>
              <h2 style={styles.title}>Email</h2>
              <span style={styles.subtitle}>Loading...</span>
            </div>
          </div>
        </div>
        <div style={styles.loadingContainer}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={styles.skeleton}>
              <div style={styles.skeletonAvatar} />
              <div style={styles.skeletonContent}>
                <div style={styles.skeletonFrom} />
                <div style={styles.skeletonSubject} />
                <div style={styles.skeletonPreview} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Email detail view
  if (selectedEmail) {
    const email = selectedEmail;
    return (
      <div style={styles.container}>
        <button onClick={() => setSelectedEmail(null)} style={styles.backButton}>
          ← Back to Inbox
        </button>
        <div style={styles.emailDetail}>
          <div style={styles.emailDetailHeader}>
            <div style={{ ...styles.avatar, background: getAvatarColor(email.from.name) }}>
              {getInitials(email.from.name)}
            </div>
            <div style={styles.emailDetailFrom}>
              <div style={styles.emailDetailName}>{email.from.name}</div>
              <div style={styles.emailDetailEmail}>{email.from.email}</div>
            </div>
            <div style={styles.emailDetailTime}>{formatTime(email.receivedAt)}</div>
          </div>
          
          <h3 style={styles.emailDetailSubject}>{email.subject}</h3>
          
          <div style={styles.emailDetailBody}>
            <p style={styles.emailBodyText}>{email.preview}</p>
            {email.hasAttachment && (
              <div style={styles.attachmentBox}>
                <span style={styles.attachmentIcon}>📎</span>
                <span style={styles.attachmentText}>1 attachment</span>
              </div>
            )}
          </div>

          <div style={styles.emailDetailActions}>
            <button style={styles.actionButtonPrimary} onClick={(e) => handleReply(email.id, e)}>
              ↩️ Reply
            </button>
            <button style={styles.actionButton} onClick={(e) => handleArchive(email.id, e)}>
              📥 Archive
            </button>
            <button style={styles.actionButton}>
              ⭐ Star
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>📧</span>
          <div>
            <h2 style={styles.title}>
              Email
              {unreadCount > 0 && (
                <span style={styles.unreadBadge}>{unreadCount}</span>
              )}
            </h2>
            <span style={styles.subtitle}>Recent messages</span>
          </div>
        </div>
        <span style={styles.syncIndicator} title="Synced with Gmail">🟢</span>
      </div>

      <div style={{...styles.emailList, ...(fullView ? { maxHeight: 'none' } : {})}}>
        {localEmails.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📭</span>
            <h3 style={styles.emptyTitle}>Inbox Zero!</h3>
            <p style={styles.emptyText}>You're all caught up</p>
          </div>
        ) : (
          (fullView ? localEmails : localEmails.slice(0, 5)).map(email => (
            <div
              key={email.id}
              style={{
                ...styles.emailCard,
                ...(email.isRead ? styles.emailCardRead : {}),
              }}
              onClick={() => handleEmailClick(email)}
            >
              <div style={{ ...styles.avatar, background: getAvatarColor(email.from.name) }}>
                {email.from.avatar ? (
                  <img src={email.from.avatar} alt={email.from.name} style={styles.avatarImg} />
                ) : (
                  getInitials(email.from.name)
                )}
              </div>
              
              <div style={styles.emailContent}>
                <div style={styles.emailHeader}>
                  <span style={{
                    ...styles.emailFrom,
                    fontWeight: email.isRead ? 400 : 600,
                  }}>
                    {email.from.name}
                  </span>
                  <span style={styles.emailTime}>{formatTime(email.receivedAt)}</span>
                </div>
                <div style={{
                  ...styles.emailSubject,
                  fontWeight: email.isRead ? 400 : 500,
                }}>
                  {email.isImportant && <span style={styles.importantTag}>!</span>}
                  {email.subject}
                  {email.threadCount && email.threadCount > 1 && (
                    <span style={styles.threadCount}>({email.threadCount})</span>
                  )}
                </div>
                <div style={styles.emailPreview}>{email.preview}</div>
                
                <div style={styles.emailMeta}>
                  {email.hasAttachment && <span style={styles.metaIcon}>📎</span>}
                  {email.isStarred && <span style={styles.metaIcon}>⭐</span>}
                  {email.labels?.map(label => (
                    <span key={label} style={styles.labelTag}>{label}</span>
                  ))}
                </div>
              </div>

              <div style={styles.emailActions}>
                {!email.isRead && (
                  <button 
                    style={styles.quickAction}
                    onClick={(e) => handleMarkRead(email.id, e)}
                    disabled={actionInProgress === email.id}
                    title="Mark as read"
                  >
                    ✓
                  </button>
                )}
                <button 
                  style={styles.quickAction}
                  onClick={(e) => handleArchive(email.id, e)}
                  disabled={actionInProgress === email.id}
                  title="Archive"
                >
                  📥
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {localEmails.length > 5 && (
        <div style={styles.viewAll}>
          <button style={styles.viewAllButton}>
            View all {localEmails.length} emails →
          </button>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#1a1a2e',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  title: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
  },
  unreadBadge: {
    background: '#ef4444',
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '10px',
    minWidth: '20px',
    textAlign: 'center',
  },
  syncIndicator: {
    fontSize: '10px',
    cursor: 'help',
  },
  emailList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  emailCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    background: 'rgba(255,255,255,0.02)',
  },
  emailCardRead: {
    background: 'transparent',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: 600,
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  emailContent: {
    flex: 1,
    minWidth: 0,
  },
  emailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  emailFrom: {
    color: '#fff',
    fontSize: '0.85rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emailTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
    flexShrink: 0,
    marginLeft: '8px',
  },
  emailSubject: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.8rem',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  importantTag: {
    color: '#ef4444',
    fontWeight: 700,
  },
  threadCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
    fontWeight: 400,
  },
  emailPreview: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emailMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px',
  },
  metaIcon: {
    fontSize: '12px',
  },
  labelTag: {
    padding: '2px 6px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '4px',
    fontSize: '0.65rem',
    color: 'rgba(255,255,255,0.5)',
  },
  emailActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    opacity: 0.4,
    transition: 'opacity 0.2s',
  },
  quickAction: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'rgba(255,255,255,0.4)',
  },
  emptyIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '12px',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    margin: '0 0 4px 0',
  },
  emptyText: {
    fontSize: '0.8rem',
    margin: 0,
  },
  viewAll: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  viewAllButton: {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    border: 'none',
    color: '#667eea',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  loadingContainer: {
    padding: '8px',
  },
  skeleton: {
    display: 'flex',
    gap: '12px',
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  skeletonAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonFrom: {
    height: '14px',
    width: '30%',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  skeletonSubject: {
    height: '12px',
    width: '70%',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    marginBottom: '6px',
  },
  skeletonPreview: {
    height: '10px',
    width: '90%',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '4px',
  },
  connectPrompt: {
    textAlign: 'center',
    padding: '40px 24px',
  },
  connectIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '16px',
  },
  connectTitle: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: '0 0 8px 0',
  },
  connectText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.85rem',
    margin: '0 0 20px 0',
  },
  connectButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  backButton: {
    margin: '12px 12px 0',
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  emailDetail: {
    padding: '20px',
  },
  emailDetailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '20px',
  },
  emailDetailFrom: {
    flex: 1,
  },
  emailDetailName: {
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  emailDetailEmail: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
  },
  emailDetailTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
  },
  emailDetailSubject: {
    color: '#fff',
    fontSize: '1.05rem',
    fontWeight: 600,
    margin: '0 0 16px 0',
    lineHeight: 1.4,
  },
  emailDetailBody: {
    marginBottom: '20px',
  },
  emailBodyText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    margin: 0,
  },
  attachmentBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
  },
  attachmentIcon: {
    fontSize: '16px',
  },
  attachmentText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
  },
  emailDetailActions: {
    display: 'flex',
    gap: '10px',
  },
  actionButton: {
    flex: 1,
    padding: '10px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  actionButtonPrimary: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
