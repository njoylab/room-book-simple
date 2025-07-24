/**
 * @fileoverview Room card component for displaying meeting room information and status
 * @description Provides a visual card representation of a meeting room with real-time
 * availability status, current/next booking information, and room details.
 */

import { Booking, MeetingRoom } from '@/lib/types';
import { formatTime } from '@/utils/date';
import { formatSlotTime } from '@/utils/slots';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Props for the RoomCard component
 * @interface RoomCardProps
 */
interface RoomCardProps {
  /** The meeting room to display */
  room: MeetingRoom;
  /** Array of bookings for this room (used to determine current status) */
  bookings: Booking[];
}

/**
 * Default fallback image for rooms without a specific image
 * @constant {string}
 */
const defaultRoomImage = '/images/default-room.webp';

/**
 * Room card component that displays meeting room information with real-time status
 * @param {RoomCardProps} props - Component props
 * @returns {JSX.Element} Rendered room card component
 * @description Displays a comprehensive room card with:
 * - Room image (desktop) with status overlay
 * - Room name, location, and capacity
 * - Operating hours
 * - Current booking status (Available/Occupied/Unavailable)
 * - Current booking details (if occupied)
 * - Next booking information (if available and not currently occupied)
 * - Room notes/description
 * - Interactive hover effects and navigation to booking page
 * @example
 * ```tsx
 * <RoomCard 
 *   room={meetingRoom} 
 *   bookings={roomBookings} 
 * />
 * ```
 */
export function RoomCard({ room, bookings }: RoomCardProps) {
  const now = new Date();
  /** Safely handle potentially undefined bookings array */
  const safeBookings = bookings || [];

  /**
   * Find current active booking (if any)
   * @description Searches for a booking where current time falls between start and end time
   */
  const currentBooking = safeBookings.find(booking => {
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    return startTime <= now && now <= endTime;
  });

  /**
   * Find the next upcoming booking
   * @description Finds the earliest booking that starts after the current time
   */
  const nextBooking = safeBookings
    .filter(booking => new Date(booking.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  /** Check if room is marked as unavailable in the system */
  const isUnavailable = room.status === "Unavailable";
  /** Determine if room is currently available for booking */
  const isAvailable = !currentBooking && !isUnavailable;

  /**
   * Configuration object for different room status states
   * @description Defines styling and text for each possible room status
   */
  const statusConfig = {
    /** Room is available for booking */
    available: {
      text: 'Available',
      bgColor: 'bg-green-500',
      textColor: 'text-green-50',
      borderColor: 'border-green-200',
      cardBg: 'hover:border-green-300'
    },
    /** Room is currently occupied */
    occupied: {
      text: 'Occupied',
      bgColor: 'bg-orange-500',
      textColor: 'text-orange-50',
      borderColor: 'border-orange-200',
      cardBg: 'hover:border-orange-300'
    },
    /** Room is marked as unavailable */
    unavailable: {
      text: 'Unavailable',
      bgColor: 'bg-gray-500',
      textColor: 'text-gray-50',
      borderColor: 'border-gray-200',
      cardBg: 'hover:border-gray-300'
    }
  };

  /** Determine current room status based on availability and booking state */
  const status = isUnavailable ? 'unavailable' : isAvailable ? 'available' : 'occupied';
  /** Get styling configuration for current status */
  const config = statusConfig[status];

  /** Use room image or fallback to default image */
  const roomImage = room.image?.thumbnails.large.url || defaultRoomImage;

  const CardContent = (
    <div className={`
      bg-white rounded-xl shadow-sm border-2 border-gray-100 
      transition-all duration-200 ease-in-out
      hover:shadow-lg hover:border-gray-200 ${config.cardBg}
      ${isUnavailable ? 'opacity-75' : 'transform hover:-translate-y-1'}
      overflow-hidden
    `}>
      {/* Room Image - Desktop only */}
      <div className="hidden md:block relative h-48 bg-gradient-to-br from-primary to-purple-600 overflow-hidden">
        <Image
          src={roomImage}
          alt={room.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 0vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

        {/* Status Badge - Overlay on image */}
        <div className="absolute top-4 right-4">
          <div className={`
              ${config.bgColor} ${config.textColor} 
              px-3 py-1.5 rounded-full text-sm font-medium
              shadow-lg backdrop-blur-sm
            `}>
            {config.text}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors">
              {room.name}
            </h3>
            {room.location && (
              <div className="flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {room.location}
              </div>
            )}
          </div>

          {/* Status Badge - Mobile only */}
          <div className="md:hidden">
            <div className={`
                ${config.bgColor} ${config.textColor} 
                px-3 py-1.5 rounded-full text-sm font-medium
              `}>
              {config.text}
            </div>
          </div>
        </div>

        {/* Room Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="font-medium">{room.capacity}</span>
            <span className="ml-1">people</span>
          </div>

          {(room.startTime || room.endTime) && (
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTime(room.startTime)} - {formatTime(room.endTime)}</span>
            </div>
          )}
        </div>

        {/* Room Tags */}
        {room.tags && room.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {room.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Current Booking */}
        {currentBooking && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4 rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-orange-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">Currently occupied</p>
                <p className="text-sm text-orange-700">{currentBooking.userLabel}</p>
                <p className="text-xs text-orange-600 mt-1">
                  {formatSlotTime(currentBooking.startTime)} - {formatSlotTime(currentBooking.endTime)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next Booking */}
        {nextBooking && !currentBooking && (
          <div className="bg-primary/10 border-l-4 border-primary p-4 mb-4 rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">Next booking</p>
                <p className="text-sm text-primary/80">{nextBooking.userLabel}</p>
                <p className="text-xs text-primary/70 mt-1">
                  {formatSlotTime(nextBooking.startTime)} - {formatSlotTime(nextBooking.endTime)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Room Notes */}
        {room.notes && (
          <div className="bg-gray-50 rounded-lg p-3 mt-4">
            <p className="text-sm text-gray-600">{room.notes}</p>
          </div>
        )}


      </div>
    </div>
  );

  return (
    <Link href={`/book/${room.id}`} className="group">
      {CardContent}
    </Link>
  );
}