import { getMeetingRooms, getUpcomingBookings } from '@/lib/airtable';
import { env } from '@/lib/env';
import { Suspense, cache } from 'react';
import { RoomGrid } from './components/RoomGrid';
import { TagFilter } from './components/TagFilter';
import { UpcomingMeetings } from './components/UpcomingMeetings';

// Cache the getMeetingRooms function to avoid duplicate requests
const getCachedMeetingRooms = cache(getMeetingRooms);
const getCachedUpcomingBookings = cache(getUpcomingBookings);

export default async function Home() {
  const rooms = await getCachedMeetingRooms();
  const bookings = await getCachedUpcomingBookings();

  // Extract unique tags from all rooms
  const allTags = new Set<string>();
  rooms.forEach(room => {
    if (room.tags) {
      room.tags.forEach(tag => allTags.add(tag));
    }
  });

  // Determine available tags: use env config if set, otherwise show all tags from data
  const availableTags = env.FILTER_ROOM_TAGS
    ? env.FILTER_ROOM_TAGS.filter(tag => allTags.has(tag))
    : Array.from(allTags).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content - Rooms Grid */}
          <div className="flex-1">
            <Suspense
              fallback={
                <div className="text-sm text-gray-500">Loading rooms...</div>
              }
            >
              <TagFilter availableTags={availableTags} />
              <RoomGrid rooms={rooms} bookings={bookings} />
            </Suspense>
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
