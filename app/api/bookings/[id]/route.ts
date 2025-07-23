import { updateBooking } from '@/lib/airtable';
import { getServerUser } from '@/lib/auth_server';
import { bookingIdSchema, checkRateLimit, updateBookingSchema, validateAndSanitize } from '@/lib/validation';
import { handleApiError, createError } from '@/lib/error-handler';
import { NextRequest, NextResponse } from 'next/server';

async function handleUpdateBooking(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser(request.cookies);
  if (!user) {
    throw createError.authentication();
  }

  // Rate limiting
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(`update_${user.id}_${clientIP}`, 20, 60 * 1000)) {
    throw createError.rateLimit();
  }

  const body = await request.json();
  const validatedUpdate = validateAndSanitize(updateBookingSchema, body);

  const params = await context.params;
  const validatedBookingId = validateAndSanitize(bookingIdSchema, params.id);

  try {
    const updatedBooking = await updateBooking(validatedBookingId, validatedUpdate, user.id);
    return NextResponse.json(updatedBooking);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      throw createError.authorization('You can only cancel your own bookings');
    }
    throw error;
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    return await handleUpdateBooking(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}