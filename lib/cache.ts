import { CACHE_TAGS } from "@/app/constants/cache";
import { revalidateTag } from "next/cache";
import { Booking } from "./types";

/**
 * Revalidates all cache entries related to a specific booking.
 * 
 * This function invalidates cache tags for:
 * - Upcoming bookings list
 * - Specific booking by ID
 * - User's bookings
 * - Room's bookings
 * - Bookings for the specific date and room
 * 
 * @param booking - The booking object containing id, user, room, and startTime properties
 * 
 * @example
 * ```typescript
 * const booking = {
 *   id: 'booking-123',
 *   user: 'user-456',
 *   room: 'room-789',
 *   startTime: '2024-01-15T10:00:00Z'
 * };
 * revalidateCacheForBooking(booking);
 * ```
 */
export function revalidateCacheForBooking(booking: Booking) {
    revalidateTag(CACHE_TAGS.BOOKINGS_UPCOMING);
    revalidateTag(CACHE_TAGS.BOOKING_BY_ID.replace('{id}', booking.id));
    if (booking.user) {
        revalidateTag(CACHE_TAGS.BOOKING_BY_USER.replace('{userId}', booking.user));
    }
    if (booking.room) {
        revalidateTag(CACHE_TAGS.BOOKINGS_BY_ROOM.replace('{roomId}', booking.room));
        if (booking.startTime) {
            revalidateCacheForBookingDateRoom(booking.startTime, booking.room);

        }
    }
}

/**
 * Revalidates cache entries for bookings on a specific date and room.
 * 
 * This function invalidates the cache tag for bookings filtered by:
 * - Specific room ID
 * - Specific date (normalized to start of day)
 * 
 * @param date - The date string in ISO format (e.g., '2024-01-15T10:00:00Z')
 * @param roomId - The unique identifier of the room
 * 
 * @example
 * ```typescript
 * // Revalidate cache for room 'room-123' on January 15, 2024
 * revalidateCacheForBookingDateRoom('2024-01-15T10:00:00Z', 'room-123');
 * ```
 */
export function revalidateCacheForBookingDateRoom(date: string, roomId: string) {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    revalidateTag(CACHE_TAGS.BOOKINGS_FOR_DATE.replace('{roomId}', roomId).replace('{date}', dateObj.toISOString()));
}