/**
 * @fileoverview API route for booking operations
 * @description Provides RESTful endpoints for retrieving and creating room bookings
 * with authentication, validation, rate limiting, and conflict checking.
 */

import { getBookings } from '@/lib/airtable';
import { getServerUser } from '@/lib/auth_server';
import { createValidatedBookingForUser } from '@/lib/booking-service';
import { createError, withErrorHandler } from '@/lib/error-handler';
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

  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const body = await request.json();
  const booking = await createValidatedBookingForUser({
    user,
    body,
    rateLimitKey: `booking_${user.id}_${clientIP}`,
  });

  return NextResponse.json(booking, { status: 201 });
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
