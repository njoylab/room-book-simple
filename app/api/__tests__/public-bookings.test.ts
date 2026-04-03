import { NextRequest } from 'next/server';
import { POST } from '../public/bookings/route';

jest.mock('@/lib/api-auth', () => ({
  getApiUserFromRequest: jest.fn(),
}));

jest.mock('@/lib/booking-service', () => ({
  createValidatedBookingForUser: jest.fn(),
}));

import { getApiUserFromRequest } from '@/lib/api-auth';
import { createValidatedBookingForUser } from '@/lib/booking-service';

describe('/api/public/bookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a booking with bearer authentication', async () => {
    const user = {
      id: 'user123',
      name: 'John Doe',
      email: 'john@example.com',
      image: 'https://example.com/avatar.jpg',
      team: 'Engineering',
    };

    const payload = {
      roomId: 'recABCDEFGHIJKLMNOP',
      startTime: '2026-04-04T10:00:00.000Z',
      endTime: '2026-04-04T11:00:00.000Z',
      note: 'External booking',
    };

    const createdBooking = {
      id: 'booking123',
      user: user.id,
      userLabel: user.name,
      room: payload.roomId,
      roomName: 'Board Room',
      startTime: payload.startTime,
      endTime: payload.endTime,
      note: payload.note,
      status: 'Confirmed',
    };

    (getApiUserFromRequest as jest.Mock).mockResolvedValue(user);
    (createValidatedBookingForUser as jest.Mock).mockResolvedValue(createdBooking);

    const request = new NextRequest('http://localhost:3000/api/public/bookings', {
      method: 'POST',
      headers: {
        authorization: 'Bearer token',
        'content-type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
      },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(createValidatedBookingForUser).toHaveBeenCalledWith({
      user,
      body: payload,
      rateLimitKey: 'public_booking_user123_127.0.0.1',
    });
    expect(data).toEqual(createdBooking);
  });
});
