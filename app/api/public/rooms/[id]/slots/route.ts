import { getApiUserFromRequest } from '@/lib/api-auth';
import { getBookingsForDate, getRoomById } from '@/lib/airtable';
import { assertExternalApiEnabled } from '@/lib/external-api';
import { handleApiError, createError } from '@/lib/error-handler';
import { dateSchema, roomIdSchema, validateAndSanitize } from '@/lib/validation';
import { generateTimeSlots } from '@/utils/slots';
import { parseDate } from '@/utils/date';
import { NextRequest, NextResponse } from 'next/server';

async function handleGetPublicRoomSlots(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  assertExternalApiEnabled();
  await getApiUserFromRequest(request);

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  if (!dateParam) {
    throw createError.validation('Date parameter is required');
  }

  const validatedDate = validateAndSanitize(dateSchema, dateParam);
  const selectedDate = parseDate(validatedDate);

  const { id: roomId } = await params;
  const validatedRoomId = validateAndSanitize(roomIdSchema, roomId);

  const room = await getRoomById(validatedRoomId);

  if (!room) {
    throw createError.notFound('Room not found');
  }

  const bookings = await getBookingsForDate(validatedRoomId, selectedDate);
  const slots = generateTimeSlots(room, selectedDate, bookings);

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
  context: { params: Promise<{ id: string }> }
) {
  try {
    return await handleGetPublicRoomSlots(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}
