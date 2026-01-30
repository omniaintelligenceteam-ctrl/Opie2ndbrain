import { NextRequest, NextResponse } from 'next/server';

/**
 * Calendar API - Placeholder
 * 
 * This endpoint will eventually connect to:
 * - Google Calendar API
 * - Outlook Calendar API
 * - Or gateway calendar commands
 * 
 * Current behavior: Returns mock data for UI development
 */

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date string
  end: string;
  location?: string;
  description?: string;
  color?: string;
  isAllDay?: boolean;
  source?: 'google' | 'outlook' | 'local';
}

// Mock events for development
const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: 'Team Standup',
    start: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(9, 30, 0, 0)).toISOString(),
    location: 'Zoom',
    color: '#667eea',
    source: 'google',
  },
  {
    id: '2',
    title: 'Client Call - OmniLightscape',
    start: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(),
    location: 'Google Meet',
    color: '#22c55e',
    source: 'google',
  },
  {
    id: '3',
    title: 'Lunch with Alex',
    start: new Date(new Date().setHours(12, 30, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(13, 30, 0, 0)).toISOString(),
    location: 'Blue Bottle Coffee',
    color: '#f59e0b',
    source: 'google',
  },
  {
    id: '4',
    title: 'Review Q4 Projections',
    start: new Date(new Date().setHours(15, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    description: 'Prepare slides for board meeting',
    color: '#764ba2',
    source: 'google',
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const source = searchParams.get('source'); // 'google', 'outlook', 'all'

  // TODO: Implement actual calendar API integration
  // For now, return mock data

  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 200));

    // In the future, this will:
    // 1. Check if user has connected their calendar
    // 2. Fetch events from the appropriate API (Google/Outlook)
    // 3. Apply date filters
    // 4. Return normalized events

    return NextResponse.json({
      success: true,
      connected: true, // Will be dynamic based on auth status
      events: MOCK_EVENTS,
      source: source || 'google',
    });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Create a new calendar event
  const body = await request.json();

  try {
    // TODO: Implement event creation via Google/Outlook API
    // For now, just acknowledge the request

    return NextResponse.json({
      success: true,
      message: 'Event creation not yet implemented',
      event: body,
    });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
