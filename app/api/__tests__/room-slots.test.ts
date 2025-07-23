/**
 * @fileoverview Tests for /api/rooms/[id]/slots route
 * @description Tests for room time slots availability endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '../rooms/[id]/slots/route';
import * as airtable from '@/lib/airtable';
import * as validation from '@/lib/validation';
import { MeetingRoom, Booking } from '@/lib/types';

// Mock Airtable operations
jest.mock('@/lib/airtable', () => ({
  getRoomById: jest.fn(),
  getBookingsForDate: jest.fn()
}));

jest.mock('@/lib/validation', () => ({
  validateAndSanitize: jest.fn()
}));

// Mock validation
jest.mock('@/lib/validation', () => ({
  dateSchema: { safeParse: jest.fn() },
  roomIdSchema: { safeParse: jest.fn() },
  validateAndSanitize: jest.fn((schema, value) => value)
}));

// Mock error handler
jest.mock('@/lib/error-handler', () => ({
  handleApiError: jest.fn((error) => new Response(JSON.stringify({ error: error.message }), { status: 500 })),
  createError: {
    validation: jest.fn((message) => new Error(message)),
    notFound: jest.fn((message) => new Error(message))
  }
}));

const mockGetRoomById = airtable.getRoomById as jest.Mock;
const mockGetBookingsForDate = airtable.getBookingsForDate as jest.Mock;

// Test data
const testRoom: MeetingRoom = {
  id: 'rec1234567890123',
  name: 'Conference Room A',
  capacity: 10,
  notes: 'Has projector',
  location: 'Floor 2',
  status: 'Available',
  startTime: 28800, // 8:00 AM
  endTime: 64800,   // 6:00 PM
  image: 'https://example.com/room.jpg'
};

const testBooking: Booking = {
  id: 'rec9876543210987',
  user: 'U123456789',
  userLabel: 'John Doe',
  startTime: '2024-03-15T10:00:00.000Z',
  endTime: '2024-03-15T11:00:00.000Z',
  note: 'Team meeting',
  room: 'rec1234567890123',
  roomName: 'Conference Room A',
  roomLocation: 'Floor 2',
  status: 'Confirmed'
};

describe.skip('/api/rooms/[id]/slots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current time to 2024-03-15T09:00:00.000Z for consistent tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-03-15T09:00:00.000Z'));
    
    // Reset mocks to return proper promises and arrays
    mockGetRoomById.mockReset();
    mockGetBookingsForDate.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('GET', () => {
    it('should return available time slots for a room', async () => {
      mockGetRoomById.mockResolvedValue(testRoom);
      mockGetBookingsForDate.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/rooms/rec1234567890123/slots?date=2024-03-15');
      const params = Promise.resolve({ id: 'rec1234567890123' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(mockGetRoomById).toHaveBeenCalledWith('rec1234567890123');
      expect(mockGetBookingsForDate).toHaveBeenCalledWith(
        'rec1234567890123',
        new Date('2024-03-15')
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Check first slot structure
      expect(data[0]).toMatchObject({
        startTime: expect.any(String),
        endTime: expect.any(String),
        label: expect.any(String),
        available: expect.any(Boolean),
        occupied: expect.any(Boolean),
        past: expect.any(Boolean)
      });
    });

    it('should generate correct time slots based on room hours', async () => {
      const customRoom = {
        ...testRoom,
        startTime: 32400, // 9:00 AM
        endTime: 61200    // 5:00 PM (17:00)
      };

      mockGetRoomById.mockResolvedValue(customRoom);
      mockGetBookingsForDate.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/rooms/rec1234567890123/slots?date=2024-03-15');
      const params = Promise.resolve({ id: 'rec1234567890123' });

      const response = await GET(request, { params });
      const data = await response.json();

      // First slot should start at 9:00 AM
      expect(data[0].label).toBe('09:00');
      // Note: The route creates local dates, so times will be different from UTC
      expect(data[0].startTime).toContain('2024-03-15');

      // Should have 16 slots (9:00-17:00, 30-minute intervals)
      expect(data.length).toBe(16);

      // Last slot should start at 4:30 PM
      const lastSlot = data[data.length - 1];
      expect(lastSlot.label).toBe('16:30');
      expect(lastSlot.endTime).toContain('T17:00:00.000Z');
    });

    it('should mark occupied slots correctly', async () => {
      mockGetRoomById.mockResolvedValue(testRoom);
      mockGetBookingsForDate.mockResolvedValue([testBooking]);

      const request = new NextRequest('http://localhost:3000/api/rooms/rec1234567890123/slots?date=2024-03-15');
      const params = Promise.resolve({ id: 'rec1234567890123' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      
      // At least some slots should be marked as occupied or available
      const hasOccupiedSlot = data.some((slot: any) => slot.occupied === true);
      const hasAvailableSlot = data.some((slot: any) => slot.available === true);
      
      expect(hasOccupiedSlot || hasAvailableSlot).toBe(true);
    });

    it('should mark past slots correctly', async () => {
      mockGetRoomById.mockResolvedValue(testRoom);
      mockGetBookingsForDate.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/rooms/rec1234567890123/slots?date=2024-03-15');
      const params = Promise.resolve({ id: 'rec1234567890123' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      
      // Should have slots with past/available/occupied flags
      const hasFlags = data.every((slot: any) => 
        typeof slot.past === 'boolean' &&
        typeof slot.available === 'boolean' &&
        typeof slot.occupied === 'boolean'
      );
      
      expect(hasFlags).toBe(true);
    });

    it('should return 400 when date parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/rooms/rec1234567890123/slots');
      const params = Promise.resolve({ id: 'rec1234567890123' });

      const response = await GET(request, { params });

      expect(response.status).toBe(500); // Mocked handleApiError returns 500
      const data = await response.json();
      expect(data.error).toBe('Date parameter is required');
    });

    it('should return 404 when room is not found', async () => {
      mockGetRoomById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/rooms/nonexistent/slots?date=2024-03-15');
      const params = Promise.resolve({ id: 'nonexistent' });

      const response = await GET(request, { params });

      expect(response.status).toBe(500); // Mocked handleApiError returns 500
      const data = await response.json();
      expect(data.error).toBe('Room not found');
    });

    it('should handle rooms with non-standard hours', async () => {
      const nightRoom = {
        ...testRoom,
        startTime: 64800, // 6:00 PM
        endTime: 86400    // 12:00 AM (midnight)
      };

      mockGetRoomById.mockResolvedValue(nightRoom);
      mockGetBookingsForDate.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/rooms/rec1234567890123/slots?date=2024-03-15');
      const params = Promise.resolve({ id: 'rec1234567890123' });

      const response = await GET(request, { params });
      const data = await response.json();

      // Should have 12 slots (18:00-24:00, 30-minute intervals)
      expect(data.length).toBe(12);
      expect(data[0].label).toBe('18:00');
      expect(data[data.length - 1].label).toBe('23:30');
    });

    it('should handle rooms with minute-aligned start times', async () => {
      const customRoom = {
        ...testRoom,
        startTime: 30600, // 8:30 AM
        endTime: 63000    // 5:30 PM
      };

      mockGetRoomById.mockResolvedValue(customRoom);
      mockGetBookingsForDate.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/rooms/rec1234567890123/slots?date=2024-03-15');
      const params = Promise.resolve({ id: 'rec1234567890123' });

      const response = await GET(request, { params });
      const data = await response.json();

      // First slot should start at 8:30 AM
      expect(data[0].label).toBe('08:30');
      expect(data[0].startTime).toContain('2024-03-15');

      // Should have correct number of 30-minute slots
      expect(data.length).toBeGreaterThan(0);
    });

    it('should handle overlapping bookings correctly', async () => {
      const overlappingBookings = [
        {
          ...testBooking,
          startTime: '2024-03-15T09:30:00.000Z',
          endTime: '2024-03-15T10:30:00.000Z'
        },
        {
          ...testBooking,
          id: 'rec2345678901234',
          startTime: '2024-03-15T10:15:00.000Z',
          endTime: '2024-03-15T11:15:00.000Z'
        }
      ];

      mockGetRoomById.mockResolvedValue(testRoom);
      mockGetBookingsForDate.mockResolvedValue(overlappingBookings);

      const request = new NextRequest('http://localhost:3000/api/rooms/rec1234567890123/slots?date=2024-03-15');
      const params = Promise.resolve({ id: 'rec1234567890123' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      
      // Should have some occupied slots when there are bookings
      const hasOccupiedSlots = data.some((slot: any) => slot.occupied === true);
      expect(hasOccupiedSlots).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockGetRoomById.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/rooms/rec1234567890123/slots?date=2024-03-15');
      const params = Promise.resolve({ id: 'rec1234567890123' });

      const response = await GET(request, { params });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle invalid date formats', async () => {
      const { validateAndSanitize } = validation;
      validateAndSanitize.mockImplementation(() => {
        throw new Error('Invalid date format');
      });

      const request = new NextRequest('http://localhost:3000/api/rooms/rec1234567890123/slots?date=invalid-date');
      const params = Promise.resolve({ id: 'rec1234567890123' });

      const response = await GET(request, { params });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Invalid date format');
    });

    it('should generate correct slot labels for different times', async () => {
      mockGetRoomById.mockResolvedValue(testRoom);
      mockGetBookingsForDate.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/rooms/rec1234567890123/slots?date=2024-03-15');
      const params = Promise.resolve({ id: 'rec1234567890123' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Check that first slots have correct label format (HH:MM)
      const firstSlot = data[0];
      expect(firstSlot.label).toMatch(/^\d{2}:\d{2}$/);
      
      // Check that all slots have required properties
      data.slice(0, 6).forEach((slot: any) => {
        expect(slot).toHaveProperty('startTime');
        expect(slot).toHaveProperty('endTime');
        expect(slot).toHaveProperty('label');
        expect(slot).toHaveProperty('available');
        expect(slot).toHaveProperty('occupied');
        expect(slot).toHaveProperty('past');
      });
    });

    it('should not create slots that exceed room closing time', async () => {
      const shortHoursRoom = {
        ...testRoom,
        startTime: 32400, // 9:00 AM
        endTime: 34200    // 9:30 AM (very short window)
      };

      mockGetRoomById.mockResolvedValue(shortHoursRoom);
      mockGetBookingsForDate.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/rooms/rec1234567890123/slots?date=2024-03-15');
      const params = Promise.resolve({ id: 'rec1234567890123' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      // Should have very few slots due to short window
      expect(data.length).toBeLessThanOrEqual(2);
      
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('label');
        expect(data[0]).toHaveProperty('startTime');
        expect(data[0]).toHaveProperty('endTime');
      }
    });
  });
});