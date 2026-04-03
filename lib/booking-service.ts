import { checkBookingConflict, createBooking, getRoomById } from '@/lib/airtable';
import { bookingHooks } from '@/lib/booking-hooks';
import { createError } from '@/lib/error-handler';
import {
  checkRateLimit,
  createBookingSchema,
  validateAndSanitize,
  validateMeetingDuration,
  validateOperatingHours,
} from '@/lib/validation';
import { Booking, User } from '@/lib/types';

interface CreateBookingForUserParams {
  user: User;
  body: unknown;
  rateLimitKey: string;
}

export async function createValidatedBookingForUser({
  user,
  body,
  rateLimitKey,
}: CreateBookingForUserParams): Promise<Booking> {
  if (!checkRateLimit(rateLimitKey, 10, 60 * 1000)) {
    throw createError.rateLimit();
  }

  const validatedData = validateAndSanitize(createBookingSchema, body);

  const room = await getRoomById(validatedData.roomId);
  if (!room) {
    throw createError.notFound('Room not found');
  }

  if (!validateMeetingDuration(validatedData.startTime, validatedData.endTime, room)) {
    const maxHours = room.maxMeetingHours ?? 8;
    throw createError.validation(`Meeting duration exceeds the maximum allowed time of ${maxHours} hours for this room`);
  }

  if (!validateOperatingHours(validatedData.startTime, validatedData.endTime, room)) {
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    const openTime = formatTime(room.startTime);
    const closeTime = formatTime(room.endTime);
    throw createError.validation(`Booking must be within the room's operating hours (${openTime} - ${closeTime})`);
  }

  const hasConflict = await checkBookingConflict(
    validatedData.roomId,
    validatedData.startTime,
    validatedData.endTime
  );

  if (hasConflict) {
    throw createError.conflict('Room is already booked for this time slot');
  }

  const hookContext = { user, room };
  const validationResult = await bookingHooks.validateBooking(validatedData, hookContext);
  if (!validationResult.valid) {
    throw createError.validation(validationResult.error || 'Custom validation failed');
  }

  const modifiedBookingData = await bookingHooks.beforeCreate(validatedData, hookContext);

  try {
    const booking = await createBooking({
      roomId: modifiedBookingData.roomId,
      userId: user.id,
      userLabel: user.name,
      userEmail: user.email,
      startTime: modifiedBookingData.startTime,
      endTime: modifiedBookingData.endTime,
      note: modifiedBookingData.note,
    });

    await bookingHooks.afterCreate(booking, hookContext);

    return booking;
  } catch {
    throw createError.internal();
  }
}
