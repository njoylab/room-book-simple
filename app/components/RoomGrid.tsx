/**
 * @fileoverview Room grid component for displaying filtered meeting rooms
 * @description Provides a grid layout of meeting room cards with client-side filtering
 * based on URL query parameters.
 */

'use client';

import { Booking, MeetingRoom } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { RoomCard } from './RoomCard';

/**
 * Props for the RoomGrid component
 * @interface RoomGridProps
 */
interface RoomGridProps {
  /** All meeting rooms to display */
  rooms: MeetingRoom[];
  /** All bookings for all rooms */
  bookings: Booking[];
}

/**
 * Room grid component that displays filtered meeting rooms
 * @param {RoomGridProps} props - Component props
 * @returns {JSX.Element} Rendered room grid component
 * @description Displays:
 * - Filtered rooms based on ?tag= URL parameter
 * - All rooms when no tag is selected
 * - Empty state when no rooms match the filter
 * @example
 * ```tsx
 * <RoomGrid rooms={meetingRooms} bookings={allBookings} />
 * ```
 */
export function RoomGrid({ rooms, bookings }: RoomGridProps) {
  const searchParams = useSearchParams();

  /** Get currently selected tag from URL */
  const selectedTag = searchParams.get('tag');

  /** Filter rooms based on selected tag */
  const filteredRooms = useMemo(() => {
    if (!selectedTag) {
      return rooms;
    }

    return rooms.filter(room =>
      room.tags && room.tags.includes(selectedTag)
    );
  }, [rooms, selectedTag]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            bookings={bookings.filter(booking => booking.room === room.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredRooms.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8s-16-3.582-16-8" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {selectedTag ? 'No matching rooms' : 'No meeting rooms'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedTag
              ? `No meeting rooms found with the tag "${selectedTag}".`
              : 'No meeting rooms are currently configured.'
            }
          </p>
        </div>
      )}
    </>
  );
}
