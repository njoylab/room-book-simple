import { getBookingsForDate, getRoomById } from '@/lib/airtable';
import { dateSchema, roomIdSchema, validateAndSanitize } from '@/lib/validation';
import { handleApiError, createError } from '@/lib/error-handler';
import { generateTimeSlots } from '@/utils/slots';
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

  // Get existing bookings for this room on this date
  const bookings = await getBookingsForDate(validatedRoomId, selectedDate);

  // Generate time slots using the utility function
  const slots = generateTimeSlots(room, selectedDate, bookings);

  // Transform the response format to match API expectations
  const slotsWithAvailability = slots.map(slot => ({
    startTime: slot.startTime,
    endTime: slot.endTime,
    label: slot.label,
    available: !slot.isBooked && !slot.isPast,
    occupied: slot.isBooked,
    past: slot.isPast
  }));

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