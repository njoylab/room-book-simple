/**
 * @fileoverview Time slot generation and management utilities for room booking
 * @description Provides functionality for generating available time slots for rooms,
 * checking conflicts with existing bookings, and formatting time slot display.
 */

import { Booking, MeetingRoom } from '@/lib/types';

/**
 * Represents a time slot for room booking
 * @interface TimeSlot
 * @description Defines the structure of a time slot with booking status information
 * and optional reference to conflicting bookings.
 */
export interface TimeSlot {
  /** ISO 8601 timestamp when the time slot starts */
  startTime: string;
  /** ISO 8601 timestamp when the time slot ends */
  endTime: string;
  /** Whether this time slot conflicts with an existing booking */
  isBooked: boolean;
  /** Whether this time slot is in the past relative to current time */
  isPast: boolean;
  /** Reference to the conflicting booking, if any */
  booking?: Booking;
}

/**
 * Generates available time slots for a room on a specific date
 * @param {MeetingRoom} room - The meeting room to generate slots for
 * @param {Date} date - The date to generate slots for
 * @param {Booking[]} bookings - Array of existing bookings for conflict checking
 * @returns {TimeSlot[]} Array of time slots with availability information
 * @description Creates 30-minute time slots within the room's operating hours,
 * checking each slot against existing bookings and marking past slots as unavailable.
 * The function uses the room's startTime and endTime properties (in seconds from midnight)
 * to determine operating hours.
 * @example
 * ```typescript
 * const room = {
 *   id: 'room1',
 *   name: 'Conference Room A',
 *   startTime: 28800, // 8:00 AM
 *   endTime: 64800,   // 6:00 PM
 *   // ... other properties
 * };
 * const date = new Date('2024-03-15');
 * const bookings = []; // Array of existing bookings
 * const slots = generateTimeSlots(room, date, bookings);
 * ```
 */
export function generateTimeSlots(
  room: MeetingRoom,
  date: Date,
  bookings: Booking[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();

  // Default room hours: 8 AM to 6 PM (28800 to 64800 seconds)
  const startSeconds = room.startTime || 28800; // 8:00 AM
  const endSeconds = room.endTime || 64800; // 6:00 PM

  // Generate 30-minute slots
  for (let time = startSeconds; time < endSeconds; time += 1800) { // 1800 = 30 minutes
    const slotStart = new Date(date);
    slotStart.setHours(Math.floor(time / 3600), Math.floor((time % 3600) / 60), 0, 0);

    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + 30);

    // Check if this slot conflicts with any booking
    const conflictingBooking = bookings.find(booking => {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);

      return (
        (slotStart >= bookingStart && slotStart < bookingEnd) ||
        (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
        (slotStart <= bookingStart && slotEnd >= bookingEnd)
      );
    });

    // Check if the slot is in the past
    const isPast = slotEnd <= now;

    slots.push({
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      isBooked: !!conflictingBooking,
      isPast: isPast,
      booking: conflictingBooking
    });
  }

  return slots;
}

/**
 * Formats an ISO 8601 timestamp to display time in HH:MM format
 * @param {string} isoString - ISO 8601 timestamp string
 * @returns {string} Formatted time string in HH:MM format (24-hour)
 * @description Converts an ISO timestamp to a user-friendly time display format.
 * Uses 24-hour format for consistency in business applications.
 * @example
 * ```typescript
 * formatSlotTime('2024-03-15T14:30:00.000Z'); // Returns "14:30"
 * formatSlotTime('2024-03-15T08:00:00.000Z'); // Returns "08:00"
 * ```
 */
export function formatSlotTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}