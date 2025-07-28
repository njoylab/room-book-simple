/**
 * @fileoverview API route for booking operations
 * @description Provides RESTful endpoints for retrieving and creating room bookings
 * with authentication, validation, rate limiting, and conflict checking.
 * 
 * Endpoints:
 * - GET /api/bookings - Retrieve all bookings (admin use)
 * - POST /api/bookings - Create new booking (authenticated users)
 * 
 * Security Features:
 * - Session-based authentication required for POST
 * - Rate limiting: 10 requests per minute per user
 * - Input validation with Zod schemas
 * - SQL injection prevention via parameterized queries
 * - XSS protection via input sanitization
 */

import { checkBookingConflict, createBooking, getBookings, getRoomById } from '@/lib/airtable';
import { getServerUser } from '@/lib/auth_server';
import { checkRateLimit, createBookingSchema, validateAndSanitize, validateMeetingDuration, validateOperatingHours } from '@/lib/validation';
import { withErrorHandler, createError } from '@/lib/error-handler';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles GET requests to retrieve all bookings
 * @returns {Promise<NextResponse>} JSON response containing array of all bookings
 * @throws {AppError} When database operation fails
 * @description Fetches all booking records from the Airtable database and returns
 * them as a JSON response. Used for administrative purposes and data analysis.
 * 
 * Response Format:
 * ```json
 * [
 *   {
 *     "id": "rec1234567890123",
 *     "userLabel": "John Doe",
 *     "user": "U1234567890",
 *     "startTime": "2024-03-15T14:00:00.000Z",
 *     "endTime": "2024-03-15T15:00:00.000Z",
 *     "note": "Team meeting",
 *     "room": "rec9876543210987",
 *     "roomName": "Conference Room A",
 *     "roomLocation": "Floor 2",
 *     "status": "Confirmed"
 *   }
 * ]
 * ```
 * 
 * Error Responses:
 * - 500: Database connection error
 * - 503: Service unavailable
 * 
 * @example
 * ```typescript
 * // GET /api/bookings
 * const response = await fetch('/api/bookings');
 * const bookings = await response.json();
 * console.log(`Found ${bookings.length} bookings`);
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
 * - Conflict checking to prevent double bookings
 * 
 * Business Logic:
 * - Date/time validation to prevent past bookings
 * - Room availability verification
 * - Operating hours validation
 * - Meeting duration limits (room-specific or global)
 * 
 * Request Body Schema:
 * ```typescript
 * {
 *   roomId: string;        // Airtable record ID (e.g., "rec1234567890123")
 *   startTime: string;     // ISO 8601 datetime (e.g., "2024-03-15T14:00:00.000Z")
 *   endTime: string;       // ISO 8601 datetime (e.g., "2024-03-15T15:00:00.000Z")
 *   note?: string;         // Optional booking description (max 500 chars)
 * }
 * ```
 * 
 * Success Response (201):
 * ```json
 * {
 *   "id": "rec1234567890123",
 *   "userLabel": "John Doe",
 *   "user": "U1234567890",
 *   "startTime": "2024-03-15T14:00:00.000Z",
 *   "endTime": "2024-03-15T15:00:00.000Z",
 *   "note": "Team meeting",
 *   "room": "rec9876543210987",
 *   "roomName": "Conference Room A",
 *   "roomLocation": "Floor 2",
 *   "status": "Confirmed"
 * }
 * ```
 * 
 * Error Responses:
 * - 401: Authentication required
 * - 400: Validation error (invalid input)
 * - 404: Room not found
 * - 409: Booking conflict (time slot already booked)
 * - 429: Rate limit exceeded
 * - 500: Server error
 * 
 * @example
 * ```typescript
 * // POST /api/bookings
 * const bookingData = {
 *   roomId: "rec9876543210987",
 *   startTime: "2024-03-15T14:00:00.000Z",
 *   endTime: "2024-03-15T15:00:00.000Z",
 *   note: "Weekly team sync"
 * };
 * 
 * const response = await fetch('/api/bookings', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(bookingData)
 * });
 * 
 * if (response.ok) {
 *   const booking = await response.json();
 *   console.log('Booking created:', booking.id);
 * } else {
 *   const error = await response.json();
 *   console.error('Booking failed:', error.message);
 * }
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

  // Validate operating hours
  if (!validateOperatingHours(validatedData.startTime, validatedData.endTime, room)) {
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };
    
    const openTime = formatTime(room.startTime);
    const closeTime = formatTime(room.endTime);
    throw createError.validation(`Booking must be within the room's operating hours (${openTime} - ${closeTime})`);
  }

  const hasConflict = await checkBookingConflict(
    validatedData.roomId,
    validatedData.startTime,
    validatedData.endTime
  );

  if (hasConflict) {
    throw createError.conflict('This time slot is already booked');
  }

  const booking = await createBooking({
    roomId: validatedData.roomId,
    userId: user.id,
    userLabel: user.name,
    startTime: validatedData.startTime,
    endTime: validatedData.endTime,
    note: validatedData.note
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