/**
 * @fileoverview API endpoint for booking calendar export
 * @description Handles calendar export for individual bookings in various formats
 */

import { getBookingById } from '@/lib/airtable';
import { authenticateRequest } from '@/lib/auth_server';
import { createError, withErrorHandler } from '@/lib/error-handler';
import { generateGoogleCalendarUrl, generateICSForBooking, generateOutlookCalendarUrl } from '@/lib/ics';
import { BOOKING_STATUS } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles GET requests to export booking calendar data
 * @param {NextRequest} request - The incoming HTTP request
 * @param {Object} context - The context containing route parameters
 * @returns {Promise<NextResponse>} Calendar export response or error
 */
async function handleCalendarExport(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'ics';
  const params = await context.params;
  const bookingId = params.id;

  if (!bookingId) {
    throw createError.validation('Booking ID is required');
  }

  // Authenticate user
  const user = await authenticateRequest(request);
  if (!user) {
    throw createError.authentication();
  }

  // Get the booking
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw createError.notFound('Booking not found');
  }

  // Check if user owns the booking or has access
  if (booking.user !== user.id) {
    throw createError.authorization('Access denied');
  }

  // Don't export cancelled bookings
  if (booking.status === BOOKING_STATUS.CANCELLED) {
    throw createError.validation('Cannot export cancelled booking');
  }

  const roomName = booking.roomName;
  const roomLocation = booking.roomLocation;

  // Handle different export formats
  switch (format.toLowerCase()) {
    case 'ics':
    case 'ical':
      const icsContent = generateICSForBooking(booking, roomName, roomLocation);
      const filename = `booking-${bookingId}-${roomName.replace(/[^a-zA-Z0-9]/g, '-')}.ics`;

      return new NextResponse(icsContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

    case 'google':
      const googleUrl = generateGoogleCalendarUrl(booking, roomName, roomLocation);
      return NextResponse.redirect(googleUrl, 302);

    case 'outlook':
      const outlookUrl = generateOutlookCalendarUrl(booking, roomName, roomLocation);
      return NextResponse.redirect(outlookUrl, 302);

    default:
      throw createError.validation('Invalid format. Supported formats: ics, google, outlook');
  }
}

/**
 * GET endpoint for exporting booking calendar data
 * @description Wrapped with error handler for consistent error responses
 * @route GET /api/bookings/[id]/calendar
 * @param {string} id - Booking ID from route parameters
 * @param {string} format - Calendar format (ics|google|outlook) from query parameters
 * @returns {Promise<NextResponse>} Calendar export or error response
 */
export const GET = withErrorHandler(handleCalendarExport);