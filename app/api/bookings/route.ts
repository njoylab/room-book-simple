/**
 * @fileoverview API route for booking operations
 * @description Provides RESTful endpoints for retrieving and creating room bookings
 * with authentication, validation, rate limiting, and conflict checking.
 */

import { checkBookingConflict, createBooking, getBookings, getRoomById } from '@/lib/airtable';
import { getServerUser } from '@/lib/auth_server';
import { checkRateLimit, createBookingSchema, validateAndSanitize, validateMeetingDuration } from '@/lib/validation';
import { withErrorHandler, createError } from '@/lib/error-handler';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles GET requests to retrieve all bookings
 * @returns {Promise<NextResponse>} JSON response containing array of all bookings
 * @throws {AppError} When database operation fails
 * @description Fetches all booking records from the Airtable database and returns
 * them as a JSON response. Used for administrative purposes and data analysis.
 * @example
 * ```typescript
 * // GET /api/bookings
 * // Response: Booking[]
 * ```
 */
async function handleGetBookings() {
  const bookings = await getBookings();
  if (!bookings) {
    throw createError.internal('Failed to fetch bookings from database');
  }
  return NextResponse.json(bookings);
}

/**
 * Handles POST requests to create new bookings
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} JSON response with created booking or error
 * @throws {AppError} For authentication, validation, rate limiting, or conflict errors
 * @description Creates a new room booking with comprehensive validation and security checks:
 * 
 * Security & Authentication:
 * - Requires user authentication via session cookies
 * - Rate limiting: max 10 bookings per user per minute
 * - Input validation using Zod schemas
 * 
 * Business Logic:
 * - Conflict checking to prevent double bookings
 * - Date/time validation to prevent past bookings
 * - Room availability verification
 * 
 * @example
 * ```typescript
 * // POST /api/bookings
 * // Body: { roomId: string, startTime: string, endTime: string, note?: string }
 * // Response: Booking (201) or error response
 * ```
 */
async function handleCreateBooking(request: NextRequest) {
  const user = await getServerUser(request.cookies);

  if (!user) {
    throw createError.authentication();
  }

  // Rate limiting
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(`booking_${user.id}_${clientIP}`, 10, 60 * 1000)) {
    throw createError.rateLimit();
  }

  const body = await request.json();

  // Validazione input con Zod
  const validatedData = validateAndSanitize(createBookingSchema, body);

  // Get room information for duration validation
  const room = await getRoomById(validatedData.roomId);
  if (!room) {
    throw createError.notFound('Room not found');
  }

  // Validate meeting duration
  if (!validateMeetingDuration(validatedData.startTime, validatedData.endTime, room)) {
    const maxHours = room.maxMeetingHours ?? 8; // Default fallback
    throw createError.validation(`Meeting duration exceeds the maximum allowed time of ${maxHours} hours for this room`);
  }

  const hasConflict = await checkBookingConflict(
    validatedData.roomId,
    validatedData.startTime,
    validatedData.endTime
  );

  if (hasConflict) {
    throw createError.conflict('Room is already booked for this time slot');
  }

  try {
    const booking = await createBooking({
      roomId: validatedData.roomId,
      userId: user.id,
      userLabel: user.name,
      startTime: validatedData.startTime,
      endTime: validatedData.endTime,
      note: validatedData.note,
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Room is unavailable for booking') {
        throw createError.validation('Room is unavailable for booking');
      }
      if (error.message === 'Room not found') {
        throw createError.notFound('Room not found');
      }
    }
    throw error;
  }
}

/**
 * GET endpoint for retrieving all bookings
 * @description Wrapped with error handler for consistent error responses
 * @route GET /api/bookings
 * @returns {Promise<NextResponse>} Array of all bookings or error response
 */
export const GET = withErrorHandler(handleGetBookings);

/**
 * POST endpoint for creating new bookings
 * @description Wrapped with error handler for consistent error responses
 * @route POST /api/bookings
 * @returns {Promise<NextResponse>} Created booking (201) or error response
 */
export const POST = withErrorHandler(handleCreateBooking);