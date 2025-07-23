import { NextResponse } from 'next/server';
import { getRoomBookings } from '@/lib/airtable';
import { handleApiError, createError } from '@/lib/error-handler';
import { roomIdSchema, validateAndSanitize } from '@/lib/validation';

async function handleGetRoomBookings(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validatedRoomId = validateAndSanitize(roomIdSchema, id);
  
  const bookings = await getRoomBookings(validatedRoomId);
  if (!bookings) {
    throw createError.internal('Failed to fetch room bookings');
  }
  
  return NextResponse.json(bookings);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await handleGetRoomBookings(request, { params });
  } catch (error) {
    return handleApiError(error);
  }
}