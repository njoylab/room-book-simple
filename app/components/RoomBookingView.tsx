import { getBookingsForDate } from '@/lib/airtable';
import { getServerUser } from '@/lib/auth_server';
import { MeetingRoom } from '@/lib/types';
import { formatBlockedDays } from '@/utils/date';
import { generateTimeSlots } from '@/utils/slots';
import { cookies } from 'next/headers';
import { TimeSlotsGrid } from './TimeSlotsGrid';

interface RoomBookingViewProps {
  room: MeetingRoom;
  selectedDate: Date;
  isUnavailable?: boolean;
}

export async function RoomBookingView({
  room,
  selectedDate,
  isUnavailable = false
}: RoomBookingViewProps) {

  // Check if the selected date is a blocked day
  const dayOfWeek = selectedDate.getDay();
  const isBlockedDay = room.blockedDays?.includes(dayOfWeek) || false;

  // Generate time slots for the selected date (empty if blocked)
  const bookings = isBlockedDay ? [] : await getBookingsForDate(room.id, selectedDate);
  const timeSlots = isBlockedDay ? [] : generateTimeSlots(room, selectedDate, bookings);

  const cookieStore = await cookies();
  const user = await getServerUser(cookieStore);

  return (
    <>
      {/* Blocked Day Warning */}
      {isBlockedDay && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-yellow-800">Room Not Available on This Day</h3>
              <p className="text-yellow-700 mt-1">
                This room is not available for bookings on this day of the week.
                {room.blockedDays && room.blockedDays.length > 0 && (
                  <> The room is blocked on: <span className="font-semibold">{formatBlockedDays(room.blockedDays)}</span>.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Time Slots Grid */}
      <TimeSlotsGrid room={room} timeSlots={timeSlots} user={user} isUnavailable={isUnavailable || isBlockedDay} />
    </>
  );
}