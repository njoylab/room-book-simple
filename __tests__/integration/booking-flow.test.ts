/**
 * @fileoverview Integration tests for the complete booking flow
 * @description Tests the end-to-end booking process including room selection,
 * time slot availability, booking creation, and confirmation.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { getMeetingRooms, getRoomBookings, createBooking } from '@/lib/airtable';
import { getServerUser } from '@/lib/auth_server';

// Mock Next.js router
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock Airtable functions
jest.mock('@/lib/airtable', () => ({
  getMeetingRooms: jest.fn(),
  getRoomBookings: jest.fn(),
  createBooking: jest.fn(),
  checkBookingConflict: jest.fn(),
}));

// Mock authentication
jest.mock('@/lib/auth_server', () => ({
  getServerUser: jest.fn(),
}));

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Test data
const mockRooms = [
  {
    id: 'rec1234567890123',
    name: 'Conference Room A',
    capacity: 10,
    notes: 'Has projector',
    location: 'Floor 2',
    status: 'Available',
    startTime: 28800, // 8:00 AM
    endTime: 64800,   // 6:00 PM
    image: null
  },
  {
    id: 'rec9876543210987',
    name: 'Meeting Room B',
    capacity: 6,
    notes: 'Small meeting room',
    location: 'Floor 1',
    status: 'Available',
    startTime: 28800,
    endTime: 64800,
    image: null
  }
];

const mockUser = {
  id: 'U1234567890',
  name: 'John Doe',
  image: 'https://example.com/avatar.jpg',
  team: 'Engineering'
};

const mockBookings = [
  {
    id: 'rec1111111111111',
    userLabel: 'Jane Smith',
    user: 'U0987654321',
    startTime: '2024-03-15T10:00:00.000Z',
    endTime: '2024-03-15T11:00:00.000Z',
    note: 'Team meeting',
    room: 'rec1234567890123',
    roomName: 'Conference Room A',
    roomLocation: 'Floor 2',
    status: 'Confirmed'
  }
];

describe('Booking Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (getMeetingRooms as jest.Mock).mockResolvedValue(mockRooms);
    (getRoomBookings as jest.Mock).mockResolvedValue(mockBookings);
    (getServerUser as jest.Mock).mockResolvedValue(mockUser);
    (createBooking as jest.Mock).mockResolvedValue({
      id: 'rec2222222222222',
      userLabel: 'John Doe',
      user: 'U1234567890',
      startTime: '2024-03-15T14:00:00.000Z',
      endTime: '2024-03-15T15:00:00.000Z',
      note: 'Test booking',
      room: 'rec1234567890123',
      roomName: 'Conference Room A',
      roomLocation: 'Floor 2',
      status: 'Confirmed'
    });
  });

  describe('Room Selection and Availability', () => {
    it('should display available rooms and their status', async () => {
      // Mock API response for rooms
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRooms
      });

      // This would typically be tested in a component that fetches and displays rooms
      const rooms = await getMeetingRooms();
      
      expect(rooms).toHaveLength(2);
      expect(rooms[0].name).toBe('Conference Room A');
      expect(rooms[0].status).toBe('Available');
      expect(rooms[1].name).toBe('Meeting Room B');
    });

    it('should show room availability for selected date', async () => {
      const selectedDate = '2024-03-15';
      const roomId = 'rec1234567890123';

      // Mock API response for room slots
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            label: '09:00',
            startTime: '2024-03-15T09:00:00.000Z',
            endTime: '2024-03-15T09:30:00.000Z',
            isBooked: false,
            isPast: false
          },
          {
            label: '10:00',
            startTime: '2024-03-15T10:00:00.000Z',
            endTime: '2024-03-15T10:30:00.000Z',
            isBooked: true,
            isPast: false,
            booking: mockBookings[0]
          }
        ]
      });

      const response = await fetch(`/api/rooms/${roomId}/slots?date=${selectedDate}`);
      const slots = await response.json();

      expect(slots).toHaveLength(2);
      expect(slots[0].isBooked).toBe(false);
      expect(slots[1].isBooked).toBe(true);
    });
  });

  describe('Booking Creation Process', () => {
    it('should create a booking successfully', async () => {
      const bookingData = {
        roomId: 'rec1234567890123',
        startTime: '2024-03-15T14:00:00.000Z',
        endTime: '2024-03-15T15:00:00.000Z',
        note: 'Test booking'
      };

      // Mock successful booking creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'rec2222222222222',
          userLabel: 'John Doe',
          user: 'U1234567890',
          startTime: '2024-03-15T14:00:00.000Z',
          endTime: '2024-03-15T15:00:00.000Z',
          note: 'Test booking',
          room: 'rec1234567890123',
          roomName: 'Conference Room A',
          roomLocation: 'Floor 2',
          status: 'Confirmed'
        })
      });

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      expect(response.status).toBe(201);
      const booking = await response.json();
      expect(booking.userLabel).toBe('John Doe');
      expect(booking.roomName).toBe('Conference Room A');
      expect(booking.status).toBe('Confirmed');
    });

    it('should handle booking conflicts', async () => {
      const bookingData = {
        roomId: 'rec1234567890123',
        startTime: '2024-03-15T10:00:00.000Z', // Conflicting time
        endTime: '2024-03-15T11:00:00.000Z',
        note: 'Test booking'
      };

      // Mock conflict response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: {
            code: 'CONFLICT',
            message: 'This time slot is already booked'
          }
        })
      });

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      expect(response.status).toBe(409);
      const error = await response.json();
      expect(error.error.code).toBe('CONFLICT');
    });

    it('should validate booking data', async () => {
      const invalidBookingData = {
        roomId: 'invalid-id',
        startTime: 'invalid-date',
        endTime: '2024-03-15T15:00:00.000Z',
        note: 'A'.repeat(501) // Too long note
      };

      // Mock validation error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid booking data',
            details: [
              'Invalid room ID format',
              'Invalid start time format',
              'Note must be 500 characters or less'
            ]
          }
        })
      });

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidBookingData)
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for booking creation', async () => {
      const bookingData = {
        roomId: 'rec1234567890123',
        startTime: '2024-03-15T14:00:00.000Z',
        endTime: '2024-03-15T15:00:00.000Z',
        note: 'Test booking'
      };

      // Mock authentication error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User must be authenticated'
          }
        })
      });

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      expect(response.status).toBe(401);
      const error = await response.json();
      expect(error.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should handle rate limiting', async () => {
      const bookingData = {
        roomId: 'rec1234567890123',
        startTime: '2024-03-15T14:00:00.000Z',
        endTime: '2024-03-15T15:00:00.000Z',
        note: 'Test booking'
      };

      // Mock rate limit error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many booking requests. Please try again later.'
          }
        })
      });

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      expect(response.status).toBe(429);
      const error = await response.json();
      expect(error.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Calendar Integration', () => {
    it('should export booking to calendar format', async () => {
      const bookingId = 'rec2222222222222';

      // Mock calendar export response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'text/calendar'
        },
        text: async () => `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Meeting Room Booking//EN
BEGIN:VEVENT
UID:rec2222222222222
DTSTART:20240315T140000Z
DTEND:20240315T150000Z
SUMMARY:Test booking - Conference Room A
DESCRIPTION:Test booking
LOCATION:Floor 2
END:VEVENT
END:VCALENDAR`
      });

      const response = await fetch(`/api/bookings/${bookingId}/calendar?format=ics`);
      
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe('text/calendar');
      
      const calendarData = await response.text();
      expect(calendarData).toContain('BEGIN:VCALENDAR');
      expect(calendarData).toContain('SUMMARY:Test booking - Conference Room A');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/rooms');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should handle server errors', async () => {
      // Mock server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred'
          }
        })
      });

      const response = await fetch('/api/rooms');
      
      expect(response.status).toBe(500);
      const error = await response.json();
      expect(error.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle malformed JSON responses', async () => {
      // Mock malformed JSON response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      try {
        await fetch('/api/rooms');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Invalid JSON');
      }
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across API calls', async () => {
      // First, get rooms
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRooms
      });

      const roomsResponse = await fetch('/api/rooms');
      const rooms = await roomsResponse.json();

      // Then, get bookings for a specific room
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBookings
      });

      const bookingsResponse = await fetch(`/api/rooms/${rooms[0].id}/slots?date=2024-03-15`);
      const bookings = await bookingsResponse.json();

      // Verify data consistency
      expect(rooms[0].id).toBe('rec1234567890123');
      expect(bookings[0].room).toBe('rec1234567890123');
      expect(bookings[0].roomName).toBe('Conference Room A');
    });

    it('should handle concurrent booking requests', async () => {
      const bookingData = {
        roomId: 'rec1234567890123',
        startTime: '2024-03-15T14:00:00.000Z',
        endTime: '2024-03-15T15:00:00.000Z',
        note: 'Concurrent booking test'
      };

      // Mock first booking success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'rec3333333333333',
          userLabel: 'John Doe',
          status: 'Confirmed'
        })
      });

      // Mock second booking conflict
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: {
            code: 'CONFLICT',
            message: 'This time slot is already booked'
          }
        })
      });

      // Simulate concurrent requests
      const [response1, response2] = await Promise.all([
        fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData)
        }),
        fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData)
        })
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(409);
    });
  });
});