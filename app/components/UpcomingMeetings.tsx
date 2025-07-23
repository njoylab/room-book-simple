/**
 * @fileoverview Upcoming meetings component for displaying next 24 hours of bookings
 * @description Shows current and upcoming meetings with room information,
 * time details, and visual status indicators for better meeting visibility.
 */

import { getMeetingRooms, getUpcomingBookings } from '@/lib/airtable';
import { env } from '@/lib/env';
import { Booking, MeetingRoom } from '@/lib/types';
import { formatSlotTime } from '@/utils/slots';
import { cache } from 'react';

// Cache the getMeetingRooms function to avoid duplicate requests
const getCachedMeetingRooms = cache(getMeetingRooms);
const getCachedUpcomingBookings = cache(getUpcomingBookings);

/**
 * Upcoming meetings display component
 * @returns {Promise<JSX.Element>} Rendered upcoming meetings section
 * @description Displays the next 24 hours of meetings with:
 * - Current ongoing meetings highlighted
 * - Upcoming meetings sorted by time
 * - Room information and user details
 * - Visual status indicators (ongoing/upcoming)
 * - Empty state when no meetings are scheduled
 * @example
 * ```tsx
 * // Used in home page
 * <UpcomingMeetings />
 * ```
 */
export async function UpcomingMeetings() {
  const [bookings, rooms] = await Promise.all([
    getCachedUpcomingBookings(),
    getCachedMeetingRooms()
  ]);

  // Create a map for quick room lookup
  const roomsMap = new Map<string, MeetingRoom>(
    rooms.map(room => [room.id, room])
  );

  const now = new Date();

  // Separate current and upcoming bookings
  const currentBookings = bookings.filter(booking => {
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    return startTime <= now && now <= endTime;
  });

  const upcomingBookings = bookings.filter(booking => {
    const startTime = new Date(booking.startTime);
    return startTime > now;
  });

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Meetings</h2>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming meetings</h3>
          <p className="mt-1 text-sm text-gray-500">
            {env.UPCOMING_MEETINGS_HOURS
              ? `No meetings scheduled for the next ${env.UPCOMING_MEETINGS_HOURS} hours.`
              : 'No meetings scheduled for today.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Upcoming Meetings</h2>

      <div className="space-y-4">
        {/* Current Meetings */}
        {currentBookings.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              Currently Ongoing
            </h3>
            <div className="space-y-3">
              {currentBookings.map((booking) => (
                <MeetingItem
                  key={booking.id}
                  booking={booking}
                  room={roomsMap.get(booking.room)}
                  isCurrent={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Meetings */}
        {upcomingBookings.length > 0 && (
          <div className={currentBookings.length > 0 ? 'mt-6' : ''}>
            {currentBookings.length > 0 && (
              <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                Coming Up
              </h3>
            )}
            <div className="space-y-3">
              {upcomingBookings.slice(0, 8).map((booking) => (
                <MeetingItem
                  key={booking.id}
                  booking={booking}
                  room={roomsMap.get(booking.room)}
                  isCurrent={false}
                />
              ))}
            </div>
          </div>
        )}

        {upcomingBookings.length > 8 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              And {upcomingBookings.length - 8} more meetings...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual meeting item component
 * @interface MeetingItemProps
 */
interface MeetingItemProps {
  /** The booking to display */
  booking: Booking;
  /** The room information (optional) */
  room?: MeetingRoom;
  /** Whether this meeting is currently ongoing */
  isCurrent: boolean;
}

/**
 * Individual meeting item display component
 * @param {MeetingItemProps} props - Component props
 * @returns {JSX.Element} Rendered meeting item
 * @description Displays a single meeting item with room, time, and user information
 */
function MeetingItem({ booking, room, isCurrent }: MeetingItemProps) {
  return (
    <div className={`
      p-4 rounded-lg border-2 transition-all duration-200
      ${isCurrent
        ? 'bg-green-50 border-green-200'
        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
      }
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <h4 className="font-semibold text-gray-900 mr-3">
              {room?.name || 'Unknown Room'}
            </h4>
            {isCurrent && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Live
              </span>
            )}
          </div>

          <div className="flex items-center text-sm text-gray-600 mb-1">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatSlotTime(booking.startTime)} - {formatSlotTime(booking.endTime)}</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{booking.userLabel}</span>
          </div>

          {booking.note && (
            <div className="mt-2 text-sm text-gray-500 italic">
              &quot;{booking.note}&quot;
            </div>
          )}
        </div>

        {room?.capacity && (
          <div className="flex items-center text-xs text-gray-500 ml-4">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {room.capacity}
          </div>
        )}
      </div>
    </div>
  );
}