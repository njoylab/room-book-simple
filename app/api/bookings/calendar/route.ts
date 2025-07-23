/**
 * @fileoverview API endpoint for user's bookings calendar export
 * @description Handles calendar export for all user's future bookings in ICS format
 */

import { getUserFutureBookings } from '@/lib/airtable';
import { authenticateRequest } from '@/lib/auth_server';
import { createError, withErrorHandler } from '@/lib/error-handler';
import { generateICSForBooking } from '@/lib/ics';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles GET requests to export all user's future bookings
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} Calendar feed with all user bookings
 */
async function handleUserBookingsExport(request: NextRequest): Promise<NextResponse> {
  // Authenticate user
  const user = await authenticateRequest(request);
  if (!user) {
    throw createError.authentication();
  }

  // Get all future bookings for the user
  const bookings = await getUserFutureBookings(user.id);

  if (!bookings || bookings.length === 0) {
    // Return empty calendar
    const emptyCalendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Room Book Simple//Meeting Room Booking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:My Room Bookings',
      'X-WR-CALDESC:All my upcoming room bookings',
      'END:VCALENDAR'
    ].join('\r\n');

    return new NextResponse(emptyCalendar, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="my-bookings.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }

  // Generate calendar events for all bookings
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
    'PRODID:-//Room Book Simple//Meeting Room Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:My Room Bookings',
    'X-WR-CALDESC:All my upcoming room bookings',
    'X-WR-TIMEZONE:UTC',
    ...calendarEvents,
    'END:VCALENDAR'
  ].join('\r\n');

  const filename = `my-bookings-${user.name.replace(/[^a-zA-Z0-9]/g, '-')}.ics`;

  return new NextResponse(fullCalendar, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

/**
 * GET endpoint for exporting all user's bookings
 * @description Wrapped with error handler for consistent error responses
 * @route GET /api/bookings/calendar
 * @returns {Promise<NextResponse>} Calendar file with all user bookings
 */
export const GET = withErrorHandler(handleUserBookingsExport);