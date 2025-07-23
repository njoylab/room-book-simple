import { NextRequest } from 'next/server';
import { GET } from '../bookings/[id]/calendar/route';
import { GET as CalendarFeedGET, POST as CalendarWebhookPOST } from '../calendar/integration/route';

// Mock the dependencies
jest.mock('@/lib/airtable', () => ({
  getBookingById: jest.fn(),
  getRoomById: jest.fn(),
  getBookings: jest.fn(),
  getMeetingRooms: jest.fn(),
}));

jest.mock('@/lib/auth_server', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/lib/ics', () => ({
  generateICSForBooking: jest.fn(),
  generateGoogleCalendarUrl: jest.fn(),
  generateOutlookCalendarUrl: jest.fn(),
}));

import { getBookingById, getBookings, getMeetingRooms } from '@/lib/airtable';
import { authenticateRequest } from '@/lib/auth_server';
import { generateGoogleCalendarUrl, generateICSForBooking, generateOutlookCalendarUrl } from '@/lib/ics';
import { BOOKING_STATUS } from '@/lib/types';

describe('/api/bookings/[id]/calendar', () => {
  const mockUser = {
    id: 'U123456789',
    name: 'John Doe',
    image: 'https://example.com/avatar.jpg',
    team: 'Engineering',
  };

  const mockBooking = {
    id: 'rec123456789',
    userLabel: 'John Doe',
    user: 'U123456789',
    startTime: '2024-01-15T10:00:00.000Z',
    endTime: '2024-01-15T11:00:00.000Z',
    room: 'recROOM123456',
    roomName: 'Conference Room A',
    roomLocation: 'Building 1, Floor 2',
    status: BOOKING_STATUS.CONFIRMED,
    note: 'Team meeting',
  };


  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/bookings/[id]/calendar', () => {
    it('should export ICS file successfully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/bookings/rec123456789/calendar?format=ics');
      const mockContext = {
        params: Promise.resolve({ id: 'rec123456789' }),
      };

      (authenticateRequest as jest.Mock).mockResolvedValue(mockUser);
      (getBookingById as jest.Mock).mockResolvedValue(mockBooking);
      (generateICSForBooking as jest.Mock).mockReturnValue('MOCK_ICS_CONTENT');

      const response = await GET(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8');
      expect(response.headers.get('Content-Disposition')).toContain('booking-rec123456789-Conference-Room-A.ics');
      expect(generateICSForBooking).toHaveBeenCalledWith(mockBooking, 'Conference Room A', 'Building 1, Floor 2');
    });

    it('should redirect to Google Calendar', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/bookings/rec123456789/calendar?format=google');
      const mockContext = {
        params: Promise.resolve({ id: 'rec123456789' }),
      };

      (authenticateRequest as jest.Mock).mockResolvedValue(mockUser);
      (getBookingById as jest.Mock).mockResolvedValue(mockBooking);
      (generateGoogleCalendarUrl as jest.Mock).mockReturnValue('https://calendar.google.com/calendar/render?...');

      const response = await GET(mockRequest, mockContext);

      expect(response.status).toBe(302);
      expect(generateGoogleCalendarUrl).toHaveBeenCalledWith(mockBooking, 'Conference Room A', 'Building 1, Floor 2');
    });

    it('should redirect to Outlook Calendar', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/bookings/rec123456789/calendar?format=outlook');
      const mockContext = {
        params: Promise.resolve({ id: 'rec123456789' }),
      };

      (authenticateRequest as jest.Mock).mockResolvedValue(mockUser);
      (getBookingById as jest.Mock).mockResolvedValue(mockBooking);
      (generateOutlookCalendarUrl as jest.Mock).mockReturnValue('https://outlook.live.com/calendar/...');

      const response = await GET(mockRequest, mockContext);

      expect(response.status).toBe(302);
      expect(generateOutlookCalendarUrl).toHaveBeenCalledWith(mockBooking, 'Conference Room A', 'Building 1, Floor 2');
    });

    it('should return 401 when user is not authenticated', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/bookings/rec123456789/calendar');
      const mockContext = {
        params: Promise.resolve({ id: 'rec123456789' }),
      };

      (authenticateRequest as jest.Mock).mockResolvedValue(null);

      const response = await GET(mockRequest, mockContext);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should return 404 when booking is not found', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/bookings/nonexistent/calendar');
      const mockContext = {
        params: Promise.resolve({ id: 'nonexistent' }),
      };

      (authenticateRequest as jest.Mock).mockResolvedValue(mockUser);
      (getBookingById as jest.Mock).mockResolvedValue(null);

      const response = await GET(mockRequest, mockContext);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Booking not found');
    });

    it('should return 403 when user does not own the booking', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/bookings/rec123456789/calendar');
      const mockContext = {
        params: Promise.resolve({ id: 'rec123456789' }),
      };

      const otherUserBooking = { ...mockBooking, user: 'U987654321' };

      (authenticateRequest as jest.Mock).mockResolvedValue(mockUser);
      (getBookingById as jest.Mock).mockResolvedValue(otherUserBooking);

      const response = await GET(mockRequest, mockContext);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should return 400 when trying to export cancelled booking', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/bookings/rec123456789/calendar');
      const mockContext = {
        params: Promise.resolve({ id: 'rec123456789' }),
      };

      const cancelledBooking = { ...mockBooking, status: BOOKING_STATUS.CANCELLED };

      (authenticateRequest as jest.Mock).mockResolvedValue(mockUser);
      (getBookingById as jest.Mock).mockResolvedValue(cancelledBooking);

      const response = await GET(mockRequest, mockContext);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Cannot export cancelled booking');
    });

    it('should return 400 for invalid format', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/bookings/rec123456789/calendar?format=invalid');
      const mockContext = {
        params: Promise.resolve({ id: 'rec123456789' }),
      };

      (authenticateRequest as jest.Mock).mockResolvedValue(mockUser);
      (getBookingById as jest.Mock).mockResolvedValue(mockBooking);

      const response = await GET(mockRequest, mockContext);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid format. Supported formats: ics, google, outlook');
    });
  });
});

describe('/api/calendar/integration', () => {
  const mockUser = {
    id: 'U123456789',
    name: 'John Doe',
    image: 'https://example.com/avatar.jpg',
    team: 'Engineering',
  };

  const mockBookings = [
    {
      id: 'rec123456789',
      userLabel: 'John Doe',
      user: 'U123456789',
      startTime: '2024-01-15T10:00:00.000Z',
      endTime: '2024-01-15T11:00:00.000Z',
      room: 'recROOM123456',
      status: BOOKING_STATUS.CONFIRMED,
    },
  ];

  const mockRooms = [
    {
      id: 'recROOM123456',
      name: 'Conference Room A',
      capacity: 10,
      location: 'Building 1, Floor 2',
      startTime: 28800,
      endTime: 64800,
      image: 'room.jpg',
      status: 'Available',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/calendar/integration', () => {
    it('should return calendar feed with valid token', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/calendar/integration?token=mock_calendar_feed_token_value');

      (getBookings as jest.Mock).mockResolvedValue(mockBookings);
      (getMeetingRooms as jest.Mock).mockResolvedValue(mockRooms);
      (generateICSForBooking as jest.Mock).mockReturnValue('BEGIN:VEVENT\r\nEND:VEVENT');

      const response = await CalendarFeedGET(mockRequest);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8');
    });

    it('should return 401 without token', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/calendar/integration');

      const response = await CalendarFeedGET(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication token required');
    });

    it('should return 403 with invalid token', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/calendar/integration?token=invalid');

      const response = await CalendarFeedGET(mockRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Invalid authentication token');
    });

    it('should filter bookings by user', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/calendar/integration?token=mock_calendar_feed_token_value&user=U123456789');

      (getBookings as jest.Mock).mockResolvedValue(mockBookings);
      (getMeetingRooms as jest.Mock).mockResolvedValue(mockRooms);
      (generateICSForBooking as jest.Mock).mockReturnValue('BEGIN:VEVENT\r\nEND:VEVENT');

      const response = await CalendarFeedGET(mockRequest);

      expect(response.status).toBe(200);
      expect(getBookings).toHaveBeenCalled();
    });
  });

  describe('POST /api/calendar/integration/webhook', () => {
    it('should process webhook successfully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/calendar/integration/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'booking_created',
          bookingId: 'rec123456789',
          userId: 'U123456789',
        }),
      });

      (authenticateRequest as jest.Mock).mockResolvedValue(mockUser);

      const response = await CalendarWebhookPOST(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.subscriptions).toBeDefined();
    });

    it('should return 401 when user is not authenticated', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/calendar/integration/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'booking_created',
          bookingId: 'rec123456789',
          userId: 'U123456789',
        }),
      });

      (authenticateRequest as jest.Mock).mockResolvedValue(null);

      const response = await CalendarWebhookPOST(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });
  });
});