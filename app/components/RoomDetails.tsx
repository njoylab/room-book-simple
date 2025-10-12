/**
 * Client component for displaying room details with timezone-aware times
 */
'use client';

import { MeetingRoom } from '@/lib/types';
import { formatBlockedDays, formatTime } from '@/utils/date';

interface RoomDetailsProps {
  room: MeetingRoom;
}

export function RoomDetails({ room }: RoomDetailsProps) {

  return (
    <div className="p-6">
      <div className="flex flex-wrap gap-3">

        {/* Capacity Badge */}
        <div className="inline-flex items-center px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">{room.capacity} people</span>
        </div>

        {/* Type Badge */}
        {room.notes && (
          <div className="inline-flex items-center px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">{room.notes}</span>
          </div>
        )}

        {/* Hours Badge - Using client-side timezone */}
        <div className="inline-flex items-center px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">

            {formatTime(room.startTime, true)} - {formatTime(room.endTime, true)}

          </span>
        </div>

        {/* Max Duration Badge */}
        {room.maxMeetingHours && (
          <div className="inline-flex items-center px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">
              Max {room.maxMeetingHours}h
            </span>
          </div>
        )}

        {/* Blocked Days Badge */}
        {room.blockedDays && room.blockedDays.length > 0 && (
          <div className="inline-flex items-center px-4 py-2.5 bg-yellow-50 rounded-lg border border-yellow-200">
            <svg className="w-4 h-4 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">
              {formatBlockedDays(room.blockedDays)}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
