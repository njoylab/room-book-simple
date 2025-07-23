import { getBookingsForDate } from '@/lib/airtable';
import { getServerUser } from '@/lib/auth_server';
import { MeetingRoom } from '@/lib/types';
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

  // Generate time slots for the selected date
  const bookings = await getBookingsForDate(room.id, selectedDate);
  const timeSlots = generateTimeSlots(room, selectedDate, bookings);

  const cookieStore = await cookies();
  const user = await getServerUser(cookieStore);

  return (
    <>
      {/* Time Slots Grid */}
      <TimeSlotsGrid room={room} timeSlots={timeSlots} user={user} isUnavailable={isUnavailable} />
    </>
  );
}