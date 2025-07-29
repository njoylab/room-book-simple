/**
 * @fileoverview Airtable integration for meeting room and booking data management
 * @description Provides functions for interacting with Airtable databases to manage
 * meeting rooms and bookings, including CRUD operations, data parsing, and validation.
 */

import { CACHE_TAGS } from '@/app/constants/cache';
import { createRecord, fetchAllRecords, fetchRecord, updateRecord } from './airtable_client';
import { revalidateCacheForBooking } from './cache';
import { env } from './env';
import { BOOKING_STATUS, Booking, MeetingRoom } from './types';

/**
 * Checks if we're in build mode with mock environment variables
 * @returns {boolean} True if we're in build mode
 */
function isBuildMode(): boolean {
  return process.env.NODE_ENV === 'production' &&
    env.AIRTABLE_API_KEY === 'valid_airtable_api_key_123456789';
}

/**
 * Gets the maximum meeting duration in hours for a specific room
 * @param room - The meeting room object
 * @returns {number} Maximum meeting duration in hours (room-specific or global default)
 * @description Returns the room-specific maxMeetingHours if set, otherwise falls back to the global MAX_MEETING_HOURS setting
 */
export function getMaxMeetingHours(room: MeetingRoom): number {
  return room.maxMeetingHours ?? env.MAX_MEETING_HOURS;
}

/** Airtable table names */
const MEETING_ROOMS_TABLE = env.AIRTABLE_MEETING_ROOMS_TABLE;
const BOOKINGS_TABLE = env.AIRTABLE_BOOKINGS_TABLE;

/** Array of public fields to retrieve for meeting rooms (excludes sensitive data) */
const publicFieldsRooms = ['name', 'capacity', 'notes', 'location', 'status', 'startTime', 'endTime', 'image', 'maxMeetingHours', 'tags'];

/**
 * Retrieves all meeting rooms from Airtable
 * @returns {Promise<MeetingRoom[]>} Array of meeting rooms sorted by name
 * @description Fetches all meeting rooms from the Airtable database with only
 * public fields, sorted alphabetically by name. Used for displaying room listings
 * and providing room selection options.
 * @example
 * ```typescript
 * const rooms = await getMeetingRooms();
 * console.log(`Found ${rooms.length} meeting rooms`);
 * ```
 */
export async function getMeetingRooms(): Promise<MeetingRoom[]> {
  if (isBuildMode()) {
    return [];
  }

  const records = await fetchAllRecords(MEETING_ROOMS_TABLE, {
    fields: publicFieldsRooms,
    sort: [{ field: 'name', direction: 'asc' }],
    cache: {
      cacheOptions: {
        tags: [CACHE_TAGS.MEETING_ROOMS],
        revalidate: env.ROOM_CACHE_TIME
      },
      cache: 'force-cache'
    }
  });

  return parseRoom(records);
}

/**
 * Retrieves all bookings from Airtable
 * @returns {Promise<Booking[]>} Array of all bookings
 * @description Fetches all booking records from the Airtable database.
 * Primarily used for Calendar export. So cache is 24 hours.
 * @example
 * ```typescript
 * const allBookings = await getBookings();
 * console.log(`Total bookings: ${allBookings.length}`);
 * ```
 */
export async function getBookings(): Promise<Booking[]> {
  const records = await fetchAllRecords(BOOKINGS_TABLE, {
    cache: {
      cacheOptions: {
        tags: [CACHE_TAGS.BOOKINGS_ALL],
      },
      cache: 'force-cache'
    }
  });
  return records.map(parseBooking);
}

/**
 * Retrieves all future bookings for a specific room
 * @param {string} roomId - The ID of the room to get bookings for
 * @returns {Promise<Booking[]>} Array of future bookings for the room (excluding cancelled bookings)
 * @description Fetches upcoming bookings for a specific room, filtering out
 * past bookings and cancelled bookings. Used for displaying room availability
 * and upcoming reservations.
 * @example
 * ```typescript
 * const roomBookings = await getRoomBookings('rec123456789');
 * console.log(`${roomBookings.length} upcoming bookings for this room`);
 * ```
 */
export async function getRoomBookings(roomId: string): Promise<Booking[]> {
  const validRoomId = validateRoomId(roomId);
  const startOfDay = new Date();

  const records = await fetchAllRecords(BOOKINGS_TABLE, {
    filterByFormula: `AND(
      {startTime} >= '${startOfDay.toISOString()}',
      {room} = '${sanitizeForFormula(validRoomId)}',
      NOT({status} = '${BOOKING_STATUS.CANCELLED}')
    )`,
    cache: {
      cacheOptions: {
        tags: [CACHE_TAGS.BOOKINGS_BY_ROOM.replace('{roomId}', validRoomId)],
      },
      cache: 'force-cache'
    }
  });

  return records.map(parseBooking);
}

/**
 * Retrieves all future bookings for a specific user
 * @param {string} userId - The ID of the user to get bookings for
 * @returns {Promise<Booking[]>} Array of future bookings for the user (excluding cancelled bookings)
 * @description Fetches upcoming bookings for a specific user, filtering out
 * past bookings and cancelled bookings. Used for generating iCal exports
 * and displaying user's upcoming reservations.
 * @example
 * ```typescript
 * const userBookings = await getUserFutureBookings('U123456789');
 * console.log(`${userBookings.length} upcoming bookings for this user`);
 * ```
 */
export async function getUserFutureBookings(userId: string): Promise<Booking[]> {
  if (isBuildMode()) {
    return [];
  }

  const validUserId = validateUserId(userId);
  const now = new Date();

  const records = await fetchAllRecords(BOOKINGS_TABLE, {
    filterByFormula: `AND(
      {endTime} >= '${now.toISOString()}',
      {user} = '${sanitizeForFormula(validUserId)}',
      NOT({status} = '${BOOKING_STATUS.CANCELLED}')
    )`,
    sort: [{ field: 'startTime', direction: 'asc' }],
    cache: {
      cacheOptions: {
        tags: [
          CACHE_TAGS.BOOKING_BY_USER.replace('{userId}', validUserId),
        ],
        revalidate: 24 * 60 * 60 * 1000 // 24 hours, we need to invalidate timebased in case of room deletion
      },
      cache: 'force-cache'
    }
  });

  return records.map(parseBooking);
}

/**
 * Retrieves all bookings for a specific room on a specific date
 * @param {string} roomId - The ID of the room to get bookings for
 * @param {Date} selectedDate - The date to get bookings for
 * @returns {Promise<Booking[]>} Array of bookings for the room on the specified date (excluding cancelled bookings)
 * @description Fetches all bookings for a room on a specific date, used for
 * generating time slot availability and checking for conflicts when creating new bookings.
 * @example
 * ```typescript
 * const date = new Date('2024-03-15');
 * const dayBookings = await getBookingsForDate('rec123456789', date);
 * console.log(`${dayBookings.length} bookings on ${date.toDateString()}`);
 * ```
 */
export async function getBookingsForDate(roomId: string, selectedDate: Date): Promise<Booking[]> {
  const validRoomId = validateRoomId(roomId);
  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  const records = await fetchAllRecords(BOOKINGS_TABLE, {
    filterByFormula: `AND(
      {room} = '${sanitizeForFormula(validRoomId)}',
      {startTime} >= '${startOfDay.toISOString()}',
      {startTime} <= '${endOfDay.toISOString()}',
      NOT({status} = '${BOOKING_STATUS.CANCELLED}')
    )`,
    cache: {
      cacheOptions: {
        tags: [CACHE_TAGS.BOOKINGS_FOR_DATE.replace('{roomId}', validRoomId).replace('{date}', startOfDay.toISOString())],
        revalidate: 24 * 60 * 60 * 1000 // 24 hours, we need to invalidate timebased in case of room deletion
      },
      cache: 'force-cache'
    }
  });

  return records.map(parseBooking);
}

/**
 * Retrieves a specific meeting room by its ID
 * @param {string} id - The ID of the room to retrieve
 * @returns {Promise<MeetingRoom | null>} The meeting room if found, null otherwise
 * @description Fetches a single meeting room by its unique identifier.
 * Returns null if the room is not found or if an error occurs.
 * Used for displaying room details and booking pages.
 * @example
 * ```typescript
 * const room = await getRoomById('rec123456789');
 * if (room) {
 *   console.log(`Room: ${room.name}, Capacity: ${room.capacity}`);
 * } else {
 *   console.log('Room not found');
 * }
 * ```
 */
export async function getRoomById(id: string): Promise<MeetingRoom | null> {
  if (isBuildMode()) {
    return null;
  }

  try {
    const validId = validateRoomId(id);
    const record = await fetchRecord(MEETING_ROOMS_TABLE, validId,
      {
        cacheOptions: {
          tags: [CACHE_TAGS.MEETING_ROOM_BY_ID.replace('{id}', validId)],
          revalidate: env.ROOM_CACHE_TIME
        },
        cache: 'force-cache'
      }
    );
    return parseRoom([record])[0];
  } catch (error) {
    console.error('Error fetching room by ID:', error);
    return null;
  }
}

/**
 * Retrieves a specific booking by its ID
 * @param {string} id - The ID of the booking to retrieve
 * @param {boolean} cache - Whether to cache the booking data
 * @returns {Promise<Booking | null>} The booking if found, null otherwise
 * @description Fetches a single booking by its unique identifier.
 * Returns null if the booking is not found or if an error occurs.
 * Used for displaying booking details and calendar export.
 */
export async function getBookingById(id: string, cache: boolean = true): Promise<Booking | null> {
  try {
    const validId = validateBookingId(id);
    const record = await fetchRecord(BOOKINGS_TABLE, validId, {
      cacheOptions: {
        tags: [CACHE_TAGS.BOOKING_BY_ID.replace('{id}', validId)]
      },
      cache: cache ? 'force-cache' : 'no-store'
    });
    return parseBooking(record);
  } catch (error) {
    console.error('Error fetching booking by ID:', error);
    return null;
  }
}

/**
 * Creates a new booking in Airtable
 * @param bookingData - The booking data to create
 * @param bookingData.roomId - The ID of the room to book
 * @param bookingData.userId - The ID of the user making the booking
 * @param bookingData.userLabel - The display name of the user
 * @param bookingData.userEmail - The email address of the user
 * @param bookingData.startTime - The start time of the booking (ISO string)
 * @param bookingData.endTime - The end time of the booking (ISO string)
 * @param bookingData.note - Optional note for the booking
 * @returns Promise<Booking> The created booking
 */
export async function createBooking(bookingData: {
  roomId: string;
  userId: string;
  userLabel: string;
  userEmail: string;
  startTime: string;
  endTime: string;
  note?: string;
}): Promise<Booking> {
  const validRoomId = validateRoomId(bookingData.roomId);
  const validUserId = validateUserId(bookingData.userId);
  const sanitizedUserLabel = sanitizeText(bookingData.userLabel);
  const sanitizedUserEmail = sanitizeText(bookingData.userEmail);
  const sanitizedNote = sanitizeText(bookingData.note || '');

  validateDateTime(bookingData.startTime);
  validateDateTime(bookingData.endTime);

  // Check if room is available for booking
  const room = await getRoomById(validRoomId);
  if (!room) {
    throw new Error('Room not found');
  }

  if (room.status === 'Unavailable') {
    throw new Error('Room is unavailable for booking');
  }

  const record = await createRecord(BOOKINGS_TABLE, {
    user: validUserId,
    userLabel: sanitizedUserLabel,
    userEmail: sanitizedUserEmail,
    startTime: bookingData.startTime,
    endTime: bookingData.endTime,
    note: sanitizedNote,
    room: [validRoomId],
  });

  const booking = parseBooking(record);
  revalidateCacheForBooking(booking);
  return booking;
}

/**
 * Checks if there are any booking conflicts for a given room and time period
 * @param roomId - The ID of the room to check
 * @param startTime - The start time to check (ISO string)
 * @param endTime - The end time to check (ISO string)
 * @returns Promise<boolean> True if there's a conflict, false otherwise
 */
export async function checkBookingConflict(
  roomId: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const validRoomId = validateRoomId(roomId);
  validateDateTime(startTime);
  validateDateTime(endTime);

  const records = await fetchAllRecords(BOOKINGS_TABLE, {
    fields: ['room'],
    filterByFormula: `
      AND(
        {room} = '${sanitizeForFormula(validRoomId)}',
        NOT({status} = '${BOOKING_STATUS.CANCELLED}'),
        OR(
          AND({startTime} <= '${startTime}', {endTime} > '${startTime}'),
          AND({startTime} < '${endTime}', {endTime} >= '${endTime}'),
          AND({startTime} >= '${startTime}', {endTime} <= '${endTime}')
        )
      )
    `
  });

  return records.length > 0;
}

/**
 * Retrieves upcoming bookings for the configured time window
 * @returns {Promise<Booking[]>} Array of upcoming bookings sorted by start time
 * @description Fetches all non-cancelled bookings that are currently active
 * or will start within the configured time window. If UPCOMING_MEETINGS_HOURS
 * is not set, defaults to showing meetings until the end of the current day.
 * Used for displaying upcoming meetings on the home page.
 * @example
 * ```typescript
 * const upcomingMeetings = await getUpcomingBookings();
 * console.log(`${upcomingMeetings.length} upcoming meetings`);
 * ```
 */
export async function getUpcomingBookings(): Promise<Booking[]> {
  if (isBuildMode()) {
    return [];
  }

  const now = new Date();

  let futureTime: Date;

  if (env.UPCOMING_MEETINGS_HOURS) {
    // Use configured hours from now
    futureTime = new Date(now.getTime() + env.UPCOMING_MEETINGS_HOURS * 60 * 60 * 1000);
  } else {
    // Default: until end of current day (23:59:59)
    futureTime = new Date(now);
    futureTime.setHours(23, 59, 59, 999);
  }

  const records = await fetchAllRecords(BOOKINGS_TABLE, {
    filterByFormula: `
      AND(
        NOT({status} = '${BOOKING_STATUS.CANCELLED}'),
        {endTime} >= '${now.toISOString()}',
        {startTime} <= '${futureTime.toISOString()}'
      )
    `,
    sort: [{ field: 'startTime', direction: 'asc' }],
    cache: {
      cacheOptions: {
        tags: [CACHE_TAGS.BOOKINGS_UPCOMING],
      },
      cache: 'force-cache'
    }
  });

  return records.map(parseBooking);
}

/**
 * Updates an existing booking's status
 * @param bookingId - The ID of the booking to update
 * @param updates - The updates to apply to the booking
 * @param updates.status - The new status for the booking
 * @param userId - The ID of the user requesting the update (for authorization)
 * @returns Promise<Booking> The updated booking
 * @throws Error if the booking doesn't exist or doesn't belong to the user
 */
export async function updateBooking(
  bookingId: string,
  updates: { status: string },
  userId: string
): Promise<Booking> {
  const validBookingId = validateBookingId(bookingId);
  const validUserId = validateUserId(userId);
  const validStatus = validateBookingStatus(updates.status);

  // First verify the booking exists and belongs to the user
  const existingRecord = await fetchRecord(BOOKINGS_TABLE, validBookingId);
  if (!existingRecord || existingRecord.fields.user !== validUserId) {
    throw new Error('Unauthorized');
  }

  const record = await updateRecord(BOOKINGS_TABLE, validBookingId, { status: validStatus });
  const booking = parseBooking(record);
  revalidateCacheForBooking(booking);
  return booking;
}

/**
 * Parses an Airtable record into a Booking object
 * @param record - The Airtable record to parse
 * @returns Booking The parsed booking object
 */
function parseBooking(record: { id: string; fields: Record<string, unknown> }): Booking {
  return {
    id: record.id,
    user: record.fields.user as string,
    userLabel: record.fields.userLabel as string,
    userEmail: record.fields.userEmail as string,
    startTime: record.fields.startTime as string,
    endTime: record.fields.endTime as string,
    note: record.fields.note as string,
    room: Array.isArray(record.fields.room) ? record.fields.room[0] : record.fields.room,
    roomName: Array.isArray(record.fields.roomName) ? record.fields.roomName[0] : record.fields.roomName,
    roomLocation: Array.isArray(record.fields.roomLocation) ? record.fields.roomLocation[0] : record.fields.roomLocation,
    status: record.fields.status as string,
  };
}

/**
 * Parses Airtable records into MeetingRoom objects
 * @param records - Array of Airtable records to parse
 * @returns MeetingRoom[] Array of parsed meeting room objects
 */
function parseRoom(records: { id: string; fields: Record<string, unknown> }[]): MeetingRoom[] {
  return records.map(record => ({
    id: record.id,
    name: record.fields.name as string,
    capacity: record.fields.capacity as number,
    notes: record.fields.notes as string,
    location: record.fields.location as string,
    status: record.fields.status as string,
    startTime: Number(record.fields.startTime || 28800), // 8:00 AM
    endTime: Number(record.fields.endTime || 64800), // 6:00 PM
    image: Array.isArray(record.fields.image) ? record.fields.image[0] : record.fields.image,
    maxMeetingHours: record.fields.maxMeetingHours ? Number(record.fields.maxMeetingHours) : undefined,
    tags: Array.isArray(record.fields.tags) ? record.fields.tags as string[] : undefined,
  }));
}

function sanitizeForFormula(value: string): string {
  // Escape single quotes e rimuovi caratteri pericolosi
  return value
    .replace(/'/g, "\\'")
    .replace(/[{}]/g, '') // Rimuovi brackets che potrebbero alterare la formula
    .replace(/[\r\n]/g, '') // Rimuovi newlines
    .slice(0, 255); // Limita lunghezza
}

function validateRoomId(roomId: string): string {
  if (!roomId || typeof roomId !== 'string') {
    throw new Error('Room ID is required and must be a string');
  }
  // Airtable record IDs format: rec + 14 alphanumeric characters
  if (!/^rec[a-zA-Z0-9]{14}$/.test(roomId) && !/^[a-zA-Z0-9_-]{1,50}$/.test(roomId)) {
    throw new Error('Invalid room ID format');
  }
  return roomId;
}

function validateUserId(userId: string): string {
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required and must be a string');
  }
  // Slack user IDs format: U + alphanumeric characters
  if (!/^[UW][A-Z0-9]{8,}$/.test(userId)) {
    throw new Error('Invalid user ID format');
  }
  return userId;
}

function validateBookingId(bookingId: string): string {
  if (!bookingId || typeof bookingId !== 'string') {
    throw new Error('Booking ID is required and must be a string');
  }
  // Airtable record IDs format: rec + 14 alphanumeric characters
  if (!/^rec[a-zA-Z0-9]{14}$/.test(bookingId)) {
    throw new Error('Invalid booking ID format');
  }
  return bookingId;
}

function validateDateTime(dateTime: string): void {
  if (!dateTime || typeof dateTime !== 'string') {
    throw new Error('DateTime is required and must be a string');
  }
  const date = new Date(dateTime);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid datetime format');
  }
}

function validateBookingStatus(status: string): string {
  const validStatuses = Object.values(BOOKING_STATUS);
  if (!validStatuses.includes(status as typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS])) {
    throw new Error('Invalid booking status');
  }
  return status;
}

function sanitizeText(text: string): string {
  if (!text) return '';
  // Rimuovi caratteri di controllo e limita lunghezza
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Rimuovi caratteri di controllo
    .slice(0, 500); // Limita lunghezza
}
