/**
 * @fileoverview Advanced calendar integration endpoint
 * @description Provides webhooks and calendar subscription endpoints for external calendar integration
 */

import { getBookings, getMeetingRooms } from '@/lib/airtable';
import { authenticateRequest } from '@/lib/auth_server';
import { env, isDevelopment } from '@/lib/env';
import { createError, withErrorHandler } from '@/lib/error-handler';
import { generateICSForBooking } from '@/lib/ics';
import { BOOKING_STATUS } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles GET requests to generate calendar feeds
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} Calendar feed or error response
 */
async function handleCalendarFeed(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user');
  const roomId = searchParams.get('room');
  const token = searchParams.get('token');

  // For calendar feeds, we use a simple token-based authentication
  // In production, you'd want to implement proper API tokens
  if (!token) {
    throw createError.authentication('Authentication token required');
  }

  // Basic token validation (in production, use proper JWT or API keys)
  if (token !== env.CALENDAR_FEED_TOKEN) {
    throw createError.authorization('Invalid authentication token');
  }

  let bookings;
  let calendarName = 'Room Book Simple';

  if (userId) {
    // Get user's bookings
    const allBookings = await getBookings();
    bookings = allBookings.filter(booking =>
      booking.user === userId &&
      booking.status !== BOOKING_STATUS.CANCELLED
    );
    calendarName = `${calendarName} - My Bookings`;
  } else if (roomId) {
    // Get room-specific bookings
    const allBookings = await getBookings();
    bookings = allBookings.filter(booking =>
      booking.room === roomId &&
      booking.status !== BOOKING_STATUS.CANCELLED
    );

    // Get room name for calendar title
    const rooms = await getMeetingRooms();
    const room = rooms.find(r => r.id === roomId);
    calendarName = `${calendarName} - ${room?.name || 'Room'}`;
  } else {
    // Get all confirmed bookings
    const allBookings = await getBookings();
    bookings = allBookings.filter(booking =>
      booking.status !== BOOKING_STATUS.CANCELLED
    );
  }

  if (!bookings || bookings.length === 0) {
    // Return empty calendar
    const emptyCalendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Room Book Simple//Meeting Room Booking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calendarName}`,
      'X-WR-CALDESC:Meeting room bookings calendar feed',
      'END:VCALENDAR'
    ].join('\r\n');

    return new NextResponse(emptyCalendar, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="calendar.ics"',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  }


  // Generate calendar header
  const calendarEvents = bookings.map(booking => {

    const icsContent = generateICSForBooking(booking, booking.roomName, booking.roomLocation);
    // Extract just the VEVENT part
    const eventStart = icsContent.indexOf('BEGIN:VEVENT');
    const eventEnd = icsContent.indexOf('END:VEVENT') + 'END:VEVENT'.length;
    return icsContent.slice(eventStart, eventEnd);
  }).filter(event => event);

  const fullCalendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${env.APP_TITLE}//Meeting Room Booking//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-CALDESC:Meeting room bookings calendar feed',
    'X-WR-TIMEZONE:UTC',
    ...calendarEvents,
    'END:VCALENDAR'
  ].join('\r\n');

  return new NextResponse(fullCalendar, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="calendar.ics"',
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  });

}

/**
 * GET endpoint for calendar feeds
 * @description Wrapped with error handler for consistent error responses
 * @route GET /api/calendar/integration
 * @returns {Promise<NextResponse>} Calendar feed or error response
 */
export const GET = withErrorHandler(handleCalendarFeed);

/**
 * Handles POST requests for calendar webhooks
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} Webhook response or error
 */
async function handleCalendarWebhook(request: NextRequest): Promise<NextResponse> {
  // This would be used by external calendar systems to get notified of changes
  const user = await authenticateRequest(request);
  if (!user) {
    throw createError.authentication();
  }

  const body = await request.json();
  const { action, bookingId, userId } = body;

  // Log the webhook event (in production, you'd process this)
  if (isDevelopment) {
    console.log('Calendar webhook received:', { action, bookingId, userId });
  }

  // Return subscription info for calendar apps
  return NextResponse.json({
    success: true,
    subscriptions: {
      userBookings: `/api/calendar/integration?user=${userId}&token=${env.CALENDAR_FEED_TOKEN}`,
      allBookings: `/api/calendar/integration?token=${env.CALENDAR_FEED_TOKEN}`
    }
  });
}

/**
 * POST endpoint for calendar webhooks
 * @description Wrapped with error handler for consistent error responses
 * @route POST /api/calendar/integration/webhook
 * @returns {Promise<NextResponse>} Webhook response or error response
 */
export const POST = withErrorHandler(handleCalendarWebhook);