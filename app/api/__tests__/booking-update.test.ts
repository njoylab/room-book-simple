/**
 * @fileoverview Tests for /api/bookings/[id] route
 * @description Tests for booking update endpoint (PATCH)
 */

import { NextRequest } from 'next/server';
import { PATCH } from '../bookings/[id]/route';
import * as airtable from '@/lib/airtable';
import * as authServer from '@/lib/auth_server';
import { User, Booking, BOOKING_STATUS } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/airtable', () => ({
  updateBooking: jest.fn()
}));

jest.mock('@/lib/auth_server', () => ({
  getServerUser: jest.fn()
}));

jest.mock('@/lib/validation', () => ({
  bookingIdSchema: { safeParse: jest.fn() },
  updateBookingSchema: { safeParse: jest.fn() },
  validateAndSanitize: jest.fn((schema, value) => value),
  checkRateLimit: jest.fn(() => true)
}));

jest.mock('@/lib/error-handler', () => ({
  handleApiError: jest.fn((error) => new Response(JSON.stringify({ error: error.message }), { status: 500 })),
  createError: {
    authentication: jest.fn(() => new Error('Authentication required')),
    authorization: jest.fn((message) => new Error(message)),
    rateLimit: jest.fn(() => new Error('Rate limit exceeded'))
  }
}));

const mockUpdateBooking = airtable.updateBooking as jest.Mock;
const mockGetServerUser = authServer.getServerUser as jest.Mock;
const mockCheckRateLimit = require('@/lib/validation').checkRateLimit as jest.Mock;

// Test data
const testUser: User = {
  id: 'U123456789',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
  team: 'Test Team'
};

const testBooking: Booking = {
  id: 'rec9876543210987',
  user: 'U123456789',
  userLabel: 'Test User',
  startTime: '2024-03-15T10:00:00.000Z',
  endTime: '2024-03-15T11:00:00.000Z',
  note: 'Team meeting',
  room: 'rec1234567890123',
  roomName: 'Conference Room A',
  roomLocation: 'Floor 2',
  status: BOOKING_STATUS.CONFIRMED
};

describe('/api/bookings/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
  });

  describe('PATCH', () => {
    it('should successfully cancel a booking', async () => {
      mockGetServerUser.mockResolvedValue(testUser);
      mockUpdateBooking.mockResolvedValue({
        ...testBooking,
        status: BOOKING_STATUS.CANCELLED
      });

      const requestBody = { status: BOOKING_STATUS.CANCELLED };
      const request = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const params = Promise.resolve({ id: 'rec9876543210987' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(mockGetServerUser).toHaveBeenCalledWith(request.cookies);
      expect(mockUpdateBooking).toHaveBeenCalledWith(
        'rec9876543210987',
        requestBody,
        'U123456789'
      );

      expect(response.status).toBe(200);
      expect(data.status).toBe(BOOKING_STATUS.CANCELLED);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const requestBody = { status: BOOKING_STATUS.CANCELLED };
      const request = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: JSON.stringify(requestBody)
      });

      const params = Promise.resolve({ id: 'rec9876543210987' });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(500); // Mocked handleApiError returns 500
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should enforce rate limiting', async () => {
      mockGetServerUser.mockResolvedValue(testUser);
      mockCheckRateLimit.mockReturnValue(false);

      const requestBody = { status: BOOKING_STATUS.CANCELLED };
      const request = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
        headers: { 
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.100'
        }
      });

      const params = Promise.resolve({ id: 'rec9876543210987' });
      const response = await PATCH(request, { params });

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        'update_U123456789_192.168.1.100',
        20,
        60 * 1000
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Rate limit exceeded');
    });

    it('should handle different IP header formats for rate limiting', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const requestBody = { status: BOOKING_STATUS.CANCELLED };
      
      // Test x-real-ip header
      const request1 = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
        headers: { 
          'x-real-ip': '10.0.0.1'
        }
      });

      const params1 = Promise.resolve({ id: 'rec9876543210987' });
      await PATCH(request1, { params: params1 });

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        'update_U123456789_10.0.0.1',
        20,
        60 * 1000
      );

      // Test fallback to 'unknown'
      const request2 = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: JSON.stringify(requestBody)
      });

      const params2 = Promise.resolve({ id: 'rec9876543210987' });
      await PATCH(request2, { params: params2 });

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        'update_U123456789_unknown',
        20,
        60 * 1000
      );
    });

    it('should handle authorization errors when updating others bookings', async () => {
      mockGetServerUser.mockResolvedValue(testUser);
      mockUpdateBooking.mockRejectedValue(new Error('Unauthorized'));

      const requestBody = { status: BOOKING_STATUS.CANCELLED };
      const request = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: JSON.stringify(requestBody)
      });

      const params = Promise.resolve({ id: 'rec9876543210987' });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('You can only cancel your own bookings');
    });

    it('should handle database errors', async () => {
      mockGetServerUser.mockResolvedValue(testUser);
      mockUpdateBooking.mockRejectedValue(new Error('Database connection failed'));

      const requestBody = { status: BOOKING_STATUS.CANCELLED };
      const request = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: JSON.stringify(requestBody)
      });

      const params = Promise.resolve({ id: 'rec9876543210987' });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Database connection failed');
    });

    it('should validate request body format', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const request = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: 'invalid json'
      });

      const params = Promise.resolve({ id: 'rec9876543210987' });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(500);
      // Should fail at JSON parsing stage
    });

    it('should validate booking ID parameter', async () => {
      mockGetServerUser.mockResolvedValue(testUser);
      
      const { validateAndSanitize } = require('@/lib/validation');
      validateAndSanitize.mockImplementation((schema, value) => {
        if (value === 'invalid-id') {
          throw new Error('Invalid booking ID format');
        }
        return value;
      });

      const requestBody = { status: BOOKING_STATUS.CANCELLED };
      const request = new NextRequest('http://localhost:3000/api/bookings/invalid-id', {
        method: 'PATCH',
        body: JSON.stringify(requestBody)
      });

      const params = Promise.resolve({ id: 'invalid-id' });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Invalid booking ID format');
    });

    it('should validate update data', async () => {
      mockGetServerUser.mockResolvedValue(testUser);
      
      const { validateAndSanitize } = require('@/lib/validation');
      validateAndSanitize.mockImplementation((schema, value) => {
        if (schema === require('@/lib/validation').updateBookingSchema && value.status === 'InvalidStatus') {
          throw new Error('Invalid booking status');
        }
        return value;
      });

      const requestBody = { status: 'InvalidStatus' };
      const request = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: JSON.stringify(requestBody)
      });

      const params = Promise.resolve({ id: 'rec9876543210987' });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Invalid booking status');
    });

    it('should successfully confirm a booking', async () => {
      mockGetServerUser.mockResolvedValue(testUser);
      mockUpdateBooking.mockResolvedValue({
        ...testBooking,
        status: BOOKING_STATUS.CONFIRMED
      });

      const requestBody = { status: BOOKING_STATUS.CONFIRMED };
      const request = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: JSON.stringify(requestBody)
      });

      const params = Promise.resolve({ id: 'rec9876543210987' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe(BOOKING_STATUS.CONFIRMED);
      expect(mockUpdateBooking).toHaveBeenCalledWith(
        'rec9876543210987',
        requestBody,
        'U123456789'
      );
    });

    it('should handle concurrent update requests with rate limiting', async () => {
      mockGetServerUser.mockResolvedValue(testUser);
      
      // First request should pass
      mockCheckRateLimit.mockReturnValueOnce(true);
      // Second request should be rate limited
      mockCheckRateLimit.mockReturnValueOnce(false);

      const requestBody = { status: BOOKING_STATUS.CANCELLED };
      
      const request1 = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
        headers: { 'x-forwarded-for': '192.168.1.100' }
      });

      const request2 = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
        headers: { 'x-forwarded-for': '192.168.1.100' }
      });

      const params1 = Promise.resolve({ id: 'rec9876543210987' });
      const params2 = Promise.resolve({ id: 'rec9876543210987' });

      mockUpdateBooking.mockResolvedValue(testBooking);

      const response1 = await PATCH(request1, { params: params1 });
      const response2 = await PATCH(request2, { params: params2 });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(500);
      
      const data2 = await response2.json();
      expect(data2.error).toBe('Rate limit exceeded');
    });

    it('should preserve other booking fields during update', async () => {
      const updatedBooking = {
        ...testBooking,
        status: BOOKING_STATUS.CANCELLED,
        // All other fields should be preserved
        note: 'Team meeting',
        userLabel: 'Test User',
        startTime: '2024-03-15T10:00:00.000Z',
        endTime: '2024-03-15T11:00:00.000Z'
      };

      mockGetServerUser.mockResolvedValue(testUser);
      mockUpdateBooking.mockResolvedValue(updatedBooking);

      const requestBody = { status: BOOKING_STATUS.CANCELLED };
      const request = new NextRequest('http://localhost:3000/api/bookings/rec9876543210987', {
        method: 'PATCH',
        body: JSON.stringify(requestBody)
      });

      const params = Promise.resolve({ id: 'rec9876543210987' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(data).toEqual(updatedBooking);
      expect(data.note).toBe('Team meeting');
      expect(data.userLabel).toBe('Test User');
    });
  });
});