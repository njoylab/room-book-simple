/**
 * @fileoverview Input validation schemas and utilities for the room booking application
 * @description Provides Zod schemas for validating API inputs, rate limiting functionality,
 * and utility functions for data sanitization and validation across the application.
 */

import { z } from 'zod';
import { BOOKING_STATUS } from './types';
import { getMaxMeetingHours } from './airtable';
import { MeetingRoom } from './types';

/**
 * Validates that a booking duration doesn't exceed the maximum allowed hours
 * @param startTime - ISO 8601 datetime string for booking start
 * @param endTime - ISO 8601 datetime string for booking end
 * @param room - The meeting room object
 * @returns {boolean} True if duration is valid, false otherwise
 * @description Checks if the booking duration exceeds the room-specific or global maximum meeting hours
 */
export function validateMeetingDuration(startTime: string, endTime: string, room: MeetingRoom): boolean {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  const maxHours = getMaxMeetingHours(room);
  
  return durationHours <= maxHours;
}

/**
 * Validation schema for creating new room bookings
 * @description Validates all required fields for booking creation including room ID,
 * time range validation, note length limits, and business logic constraints like
 * preventing bookings for slots that have already ended and ensuring end time is after start time.
 * Allows booking ongoing slots (started but not yet ended).
 * @type {z.ZodObject}
 */
export const createBookingSchema = z.object({
  /** Room identifier (Airtable record ID or custom format) */
  roomId: z.string()
    .min(1, 'Room ID is required')
    .regex(/^rec[a-zA-Z0-9]{14}$|^[a-zA-Z0-9_-]{1,50}$/, 'Invalid room ID format'),
  /** ISO 8601 datetime string for booking start */
  startTime: z.string()
    .datetime('Invalid start time format'),
  /** ISO 8601 datetime string for booking end */
  endTime: z.string()
    .datetime('Invalid end time format'),
  /** Optional booking note (max 500 characters) */
  note: z.string()
    .max(500, 'Note must be less than 500 characters')
    .optional()
    .default('')
}).refine(data => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return start < end;
}, {
  message: "End time must be after start time",
  path: ["endTime"]
}).refine(data => {
  const end = new Date(data.endTime);
  return end > new Date();
}, {
  message: "Cannot book slots that have already ended",
  path: ["endTime"]
});

/**
 * Validation schema for updating booking status
 * @description Ensures only valid booking status values can be set when updating bookings.
 * @type {z.ZodObject}
 */
export const updateBookingSchema = z.object({
  /** New booking status (must be one of the predefined BOOKING_STATUS values) */
  status: z.enum([BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CANCELLED])
});

/**
 * Validation schema for date strings
 * @description Validates date strings in YYYY-MM-DD format and ensures they represent
 * valid calendar dates (prevents invalid dates like 2024-02-30).
 * @type {z.ZodString}
 */
export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(date => {
    const parsed = new Date(date + 'T00:00:00.000Z');
    if (isNaN(parsed.getTime())) return false;
    
    // Check that the date string matches the parsed date
    // This catches invalid dates like 2024-02-30 which get normalized
    const [year, month, day] = date.split('-').map(Number);
    return parsed.getUTCFullYear() === year && 
           parsed.getUTCMonth() === month - 1 && 
           parsed.getUTCDate() === day;
  }, 'Invalid date');

/**
 * Validation schema for room identifiers
 * @description Validates room IDs to ensure they match expected formats (Airtable or custom).
 * @type {z.ZodString}
 */
export const roomIdSchema = z.string()
  .min(1, 'Room ID is required')
  .regex(/^rec[a-zA-Z0-9]{14}$|^[a-zA-Z0-9_-]{1,50}$/, 'Invalid room ID format');

/**
 * Validation schema for booking identifiers
 * @description Validates booking IDs to ensure they match Airtable record format.
 * @type {z.ZodString}
 */
export const bookingIdSchema = z.string()
  .min(1, 'Booking ID is required')
  .regex(/^rec[a-zA-Z0-9]{14}$/, 'Invalid booking ID format');

/**
 * Validates and sanitizes input data using a Zod schema
 * @template T - The expected output type after validation
 * @param {z.ZodSchema<T>} schema - Zod schema to validate against
 * @param {unknown} data - Raw input data to validate
 * @returns {T} Validated and type-safe data
 * @throws {z.ZodError} When validation fails
 * @description Provides a centralized way to validate and sanitize input data,
 * ensuring type safety and throwing structured validation errors when data is invalid.
 * @example
 * ```typescript
 * const validatedBooking = validateAndSanitize(createBookingSchema, requestBody);
 * ```
 */
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * In-memory storage for tracking request counts per identifier
 * @description Simple Map-based storage for rate limiting. In production, consider
 * using Redis or another persistent store for rate limiting across multiple instances.
 * @type {Map<string, {count: number, resetTime: number}>}
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Checks if a request should be rate limited
 * @param {string} identifier - Unique identifier for the client (IP, user ID, etc.)
 * @param {number} [maxRequests=100] - Maximum allowed requests in the time window
 * @param {number} [windowMs=900000] - Time window in milliseconds (default: 15 minutes)
 * @returns {boolean} True if request should be allowed, false if rate limited
 * @description Implements a simple sliding window rate limiter to prevent abuse.
 * Tracks request counts per identifier and resets counters after the time window expires.
 * @example
 * ```typescript
 * const clientIP = request.ip;
 * if (!checkRateLimit(clientIP, 50, 60000)) {
 *   throw createError.rateLimit('Too many requests');
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minuti
): boolean {
  const now = Date.now();
  const userRequests = requestCounts.get(identifier);

  if (!userRequests || now > userRequests.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userRequests.count >= maxRequests) {
    return false;
  }

  userRequests.count++;
  return true;
}