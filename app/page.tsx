import { getMeetingRooms, getUpcomingBookings } from '@/lib/airtable';
import { Suspense, cache } from 'react';
import { RoomCard } from './components/RoomCard';
import { UpcomingMeetings } from './components/UpcomingMeetings';

// Cache the getMeetingRooms function to avoid duplicate requests
const getCachedMeetingRooms = cache(getMeetingRooms);
const getCachedUpcomingBookings = cache(getUpcomingBookings);

export default async function Home() {
  const rooms = await getCachedMeetingRooms();
  const bookings = await getCachedUpcomingBookings();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content - Rooms Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  bookings={bookings.filter(booking => booking.room === room.id)}
                />
              ))}
            </div>

            {/* Empty State */}
            {rooms.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8s-16-3.582-16-8" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No meeting rooms</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No meeting rooms are currently configured.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - Upcoming Meetings */}
          <div className="lg:w-96 flex-shrink-0">
            <Suspense fallback={
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
                  <div className="space-y-4">
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            }>
              <UpcomingMeetings />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}