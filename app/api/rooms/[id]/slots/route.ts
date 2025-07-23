import { getBookingsForDate, getRoomById } from '@/lib/airtable';
import { dateSchema, roomIdSchema, validateAndSanitize } from '@/lib/validation';
import { handleApiError, createError } from '@/lib/error-handler';
import { NextRequest, NextResponse } from 'next/server';

async function handleGetRoomSlots(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  if (!dateParam) {
    throw createError.validation('Date parameter is required');
  }

  // Validate date format
  const validatedDate = validateAndSanitize(dateSchema, dateParam);
  const selectedDate = new Date(validatedDate);

  const { id: roomId } = await params;
  const validatedRoomId = validateAndSanitize(roomIdSchema, roomId);

  // Get room details to check custom start/end times
  const room = await getRoomById(validatedRoomId);

  if (!room) {
    throw createError.notFound('Room not found');
  }

    // Parse custom start/end times or use defaults
    const startHour = Math.floor(room.startTime / 3600);
    const startMinute = Math.floor((room.startTime % 3600) / 60);
    const endHour = Math.floor(room.endTime / 3600);
    const endMinute = Math.floor((room.endTime % 3600) / 60);

    // Generate time slots based on room's custom hours
    const slots = [];

    // Convert end time to minutes for easier comparison
    const endTimeMinutes = endHour * 60 + endMinute;


    for (let hour = startHour; hour * 60 < endTimeMinutes; hour++) {
      for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += 30) {
        const currentTimeMinutes = hour * 60 + minute;

        // Stop if we've reached the end time
        if (currentTimeMinutes >= endTimeMinutes) break;

        const startTime = new Date(selectedDate);
        startTime.setHours(hour, minute, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 30);

        // Don't create slot if it would exceed the room's closing time
        if (endTime.getHours() * 60 + endTime.getMinutes() > endTimeMinutes) break;

        slots.push({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        });
      }
    }

    // Get existing bookings for this room on this date
    const bookings = await getBookingsForDate(validatedRoomId, selectedDate);

    // Mark slots as occupied
    const slotsWithAvailability = slots.map(slot => {
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);

      const isOccupied = bookings.some(booking => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);

        // Check if slot overlaps with booking
        return (slotStart < bookingEnd && slotEnd > bookingStart);
      });

      // Check if slot is in the past
      const now = new Date();
      const isPast = slotEnd <= now;

      return {
        ...slot,
        available: !isOccupied && !isPast,
        occupied: isOccupied,
        past: isPast
      };
    });

  return NextResponse.json(slotsWithAvailability);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await handleGetRoomSlots(request, { params });
  } catch (error) {
    return handleApiError(error);
  }
}