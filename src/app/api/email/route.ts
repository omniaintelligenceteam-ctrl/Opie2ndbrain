import { NextRequest, NextResponse } from 'next/server';

/**
 * Email API - Placeholder
 * 
 * This endpoint will eventually connect to:
 * - Gmail API
 * - Outlook/Microsoft Graph API
 * - Or gateway email commands
 * 
 * Current behavior: Returns mock data for UI development
 */

export interface EmailMessage {
  id: string;
  from: {
    name: string;
    email: string;
    avatar?: string;
  };
  subject: string;
  preview: string;
  receivedAt: string; // ISO date string
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  labels?: string[];
  hasAttachment?: boolean;
  threadCount?: number;
  source?: 'gmail' | 'outlook' | 'other';
}

// Mock emails for development
const MOCK_EMAILS: EmailMessage[] = [
  {
    id: '1',
    from: {
      name: 'Sarah Chen',
      email: 'sarah.chen@company.com',
    },
    subject: 'Q4 Marketing Budget - Needs Approval',
    preview: 'Hey Wes, I\'ve attached the updated Q4 marketing budget proposal. Could you review and approve by EOD tomorrow?',
    receivedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
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
    preview: 'The pull request "Feature: Add calendar integration" has been merged into main by alex-dev.',
    receivedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
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
    preview: 'Thanks for getting back to me! I think Tuesday at 2pm works great for a call.',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
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
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
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
    preview: 'Hey! Here are the revised logo designs based on your feedback.',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    isRead: false,
    isStarred: false,
    isImportant: false,
    hasAttachment: true,
    source: 'gmail',
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  const important = searchParams.get('important') === 'true';

  // TODO: Implement actual email API integration
  // For now, return mock data

  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 200));

    let emails = [...MOCK_EMAILS];

    // Apply filters
    if (unreadOnly) {
      emails = emails.filter(e => !e.isRead);
    }
    if (important) {
      emails = emails.filter(e => e.isImportant);
    }

    // Apply pagination
    emails = emails.slice(offset, offset + limit);

    // In the future, this will:
    // 1. Check if user has connected their email
    // 2. Fetch emails from the appropriate API (Gmail/Outlook)
    // 3. Apply filters and pagination
    // 4. Return normalized emails

    const unreadCount = MOCK_EMAILS.filter(e => !e.isRead).length;

    return NextResponse.json({
      success: true,
      connected: true, // Will be dynamic based on auth status
      emails,
      unreadCount,
      total: MOCK_EMAILS.length,
      source: 'gmail',
    });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Actions: mark read, archive, star, reply
  const body = await request.json();
  const { action, emailId, data } = body;

  try {
    switch (action) {
      case 'markRead':
        // TODO: Mark email as read via Gmail/Outlook API
        return NextResponse.json({
          success: true,
          message: 'Email marked as read (mock)',
          emailId,
        });

      case 'archive':
        // TODO: Archive email via Gmail/Outlook API
        return NextResponse.json({
          success: true,
          message: 'Email archived (mock)',
          emailId,
        });

      case 'star':
        // TODO: Star email via Gmail/Outlook API
        return NextResponse.json({
          success: true,
          message: 'Email starred (mock)',
          emailId,
        });

      case 'reply':
        // TODO: Send reply via Gmail/Outlook API or Resend
        return NextResponse.json({
          success: true,
          message: 'Reply not yet implemented',
          emailId,
          data,
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform email action' },
      { status: 500 }
    );
  }
}
