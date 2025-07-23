/**
 * @fileoverview API route for meeting rooms operations
 * @description Provides RESTful endpoints for retrieving meeting room information
 * from the Airtable database with proper error handling and validation.
 */

import { NextResponse } from 'next/server';
import { getMeetingRooms } from '@/lib/airtable';
import { withErrorHandler, createError } from '@/lib/error-handler';

/**
 * Handles GET requests to retrieve all meeting rooms
 * @returns {Promise<NextResponse>} JSON response containing array of meeting rooms
 * @throws {AppError} When database operation fails
 * @description Fetches all meeting rooms from the Airtable database and returns
 * them as a JSON response. Throws an internal server error if the database
 * operation fails.
 * @example
 * ```typescript
 * // GET /api/rooms
 * // Response: MeetingRoom[]
 * ```
 */
async function handleGetRooms() {
  const rooms = await getMeetingRooms();
  if (!rooms) {
    throw createError.internal('Failed to fetch rooms from database');
  }
  return NextResponse.json(rooms);
}

/**
 * GET endpoint for retrieving all meeting rooms
 * @description Wrapped with error handler for consistent error responses
 * @route GET /api/rooms
 * @returns {Promise<NextResponse>} Array of meeting rooms or error response
 */
export const GET = withErrorHandler(handleGetRooms);