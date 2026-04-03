import { getApiUserFromRequest } from '@/lib/api-auth';
import { createValidatedBookingForUser } from '@/lib/booking-service';
import { assertExternalApiEnabled } from '@/lib/external-api';
import { withErrorHandler } from '@/lib/error-handler';
import { NextRequest, NextResponse } from 'next/server';

async function handleCreatePublicBooking(request: NextRequest) {
  assertExternalApiEnabled();
  const user = await getApiUserFromRequest(request);
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const body = await request.json();

  const booking = await createValidatedBookingForUser({
    user,
    body,
    rateLimitKey: `public_booking_${user.id}_${clientIP}`,
  });

  return NextResponse.json(booking, { status: 201 });
}

export const POST = withErrorHandler(handleCreatePublicBooking);
