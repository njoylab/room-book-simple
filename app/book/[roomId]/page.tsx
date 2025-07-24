import { DateNavigation } from '@/app/components/DateNavigation';
import { RoomBookingView } from '@/app/components/RoomBookingView';
import { TimeSlotsGridSkeleton } from '@/app/components/TimeSlotsGridSkeleton';
import { getRoomById } from '@/lib/airtable';
import { formatDate, formatTime } from '@/utils/date';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Suspense, cache } from 'react';

// Cache the getRoomById function to avoid duplicate requests
const getCachedRoomById = cache(getRoomById);

interface PageProps {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function BookRoomPage({ params, searchParams }: PageProps) {
  const { roomId } = await params;
  const dateParam = (await searchParams).date;

  // Default to today if no date specified  
  const selectedDate = dateParam ? new Date(dateParam + 'T00:00:00.000Z') : (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  })();
  const dateString = formatDate(selectedDate);

  const room = await getCachedRoomById(roomId);
  if (!room) {
    notFound();
  }

  const isUnavailable = room.status === "Unavailable";

  /** Use room image or fallback to default image */
  const defaultRoomImage = '/images/default-room.webp';
  const roomImage = room.image?.thumbnails.large.url || defaultRoomImage;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Header Section with Room Info */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

            {/* Room Image Header */}
            <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary to-purple-600 overflow-hidden">
              <Image
                src={roomImage}
                alt={room.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10"></div>

              {/* Room Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-2xl text-shadow-lg">
                  {room.name}
                </h1>
                {room.location && (
                  <div className="flex items-center text-white/95">
                    <span className="text-lg font-medium drop-shadow-lg">{room.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Room Details */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Capacity */}
                <div className="flex items-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-lg font-semibold text-primary">{room.capacity} people</p>
                  </div>
                </div>

                {/* Notes */}
                {room.notes && (
                  <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-lg font-semibold text-green-700">{room.notes}</p>
                    </div>
                  </div>
                )}

                {/* Hours */}
                <div className="flex items-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-lg font-semibold text-orange-700">
                      {formatTime(room.startTime)} - {formatTime(room.endTime)}
                    </p>
                  </div>
                </div>

                {/* Max Meeting Duration */}
                {room.maxMeetingHours && (
                  <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-lg font-semibold text-blue-700">
                        Max {room.maxMeetingHours} {room.maxMeetingHours === 1 ? 'hour' : 'hours'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="mb-6">
          <DateNavigation roomId={room.id} selectedDate={selectedDate} />
        </div>

        {/* Time Slots Section */}
        <div className="space-y-4">
          {isUnavailable && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-lg font-medium text-red-800">Room Unavailable for New Bookings</h3>
                  <p className="text-red-700 mt-1">This room is currently unavailable for new bookings. You can still view existing reservations below.</p>
                </div>
              </div>
            </div>
          )}
          
          <Suspense key={roomId + dateString} fallback={<TimeSlotsGridSkeleton />}>
            <RoomBookingView
              room={room}
              selectedDate={selectedDate}
              isUnavailable={isUnavailable}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { roomId } = await params;
  const room = await getCachedRoomById(roomId);

  if (!room) {
    return {
      title: 'Room Not Found - Meeting Room Booking'
    };
  }

  return {
    title: `Book ${room.name} - Meeting Room Booking`,
    description: `Book the ${room.name} meeting room. Capacity: ${room.capacity} people.`
  };
}