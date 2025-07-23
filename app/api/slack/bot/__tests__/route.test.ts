/**
 * @fileoverview Tests for Slack bot API endpoint
 * @description Tests slash command handling, signature verification, and message formatting
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { createHmac } from 'crypto';

// Mock the environment
jest.mock('@/lib/env', () => ({
  env: {
    SLACK_SIGNING_SECRET: 'test_signing_secret',
    APP_BASE_URL: 'https://test.example.com'
  }
}));

// Mock the airtable functions
jest.mock('@/lib/airtable', () => ({
  getUserFutureBookings: jest.fn(),
  getMeetingRooms: jest.fn(),
  updateBooking: jest.fn()
}));

// Store original console.error to restore after tests
const originalConsoleError = console.error;
const mockConsoleError = jest.fn();

beforeAll(() => {
  console.error = mockConsoleError;
});

afterAll(() => {
  console.error = originalConsoleError;
});

import { getUserFutureBookings, getMeetingRooms, updateBooking } from '@/lib/airtable';

const mockGetUserFutureBookings = getUserFutureBookings as jest.MockedFunction<typeof getUserFutureBookings>;
const mockGetMeetingRooms = getMeetingRooms as jest.MockedFunction<typeof getMeetingRooms>;
const mockUpdateBooking = updateBooking as jest.MockedFunction<typeof updateBooking>;

describe('/api/slack/bot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
  });

  const createSlackRequest = (body: string, timestamp?: string) => {
    const ts = timestamp || Math.floor(Date.now() / 1000).toString();
    const signingSecret = 'test_signing_secret';
    const baseString = `v0:${ts}:${body}`;
    const signature = 'v0=' + createHmac('sha256', signingSecret).update(baseString).digest('hex');

    const request = new NextRequest('http://localhost:3000/api/slack/bot', {
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-slack-request-timestamp': ts,
        'x-slack-signature': signature
      }
    });

    return request;
  };

  const createSlackInteraction = (actionId: string, value: string, userId: string = 'U123456789') => {
    const interaction = {
      type: 'block_actions',
      user: {
        id: userId,
        name: 'testuser'
      },
      response_url: 'https://hooks.slack.com/actions/test',
      actions: [{
        action_id: actionId,
        value: value,
        type: 'button'
      }]
    };
    
    const body = `payload=${encodeURIComponent(JSON.stringify(interaction))}`;
    return createSlackRequest(body);
  };

  const sampleSlackCommand = new URLSearchParams({
    token: 'test_token',
    team_id: 'T123',
    team_domain: 'testteam',
    channel_id: 'C123',
    channel_name: 'general',
    user_id: 'U123456789',
    user_name: 'testuser',
    command: '/my-bookings',
    text: '',
    response_url: 'https://hooks.slack.com/commands/test',
    trigger_id: 'trigger123'
  }).toString();

  describe('GET', () => {
    it('should return a test response', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Slack bot endpoint is running');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('POST - Signature Verification', () => {
    it('should reject requests without timestamp header', async () => {
      const request = new NextRequest('http://localhost:3000/api/slack/bot', {
        method: 'POST',
        body: sampleSlackCommand,
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-slack-signature': 'v0=test'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing Slack headers');
    });

    it('should reject requests without signature header', async () => {
      const request = new NextRequest('http://localhost:3000/api/slack/bot', {
        method: 'POST',
        body: sampleSlackCommand,
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-slack-request-timestamp': Math.floor(Date.now() / 1000).toString()
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing Slack headers');
    });

    it('should reject requests with old timestamp', async () => {
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString(); // 400 seconds ago
      const request = createSlackRequest(sampleSlackCommand, oldTimestamp);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Request timestamp too old');
    });

    it('should reject requests with invalid signature', async () => {
      const request = new NextRequest('http://localhost:3000/api/slack/bot', {
        method: 'POST',
        body: sampleSlackCommand,
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-slack-request-timestamp': Math.floor(Date.now() / 1000).toString(),
          'x-slack-signature': 'v0=invalid_signature'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid signature');
    });
  });

  describe('POST - Command Handling', () => {
    it('should handle /my-bookings command with no bookings', async () => {
      mockGetUserFutureBookings.mockResolvedValue([]);
      mockGetMeetingRooms.mockResolvedValue([]);

      const request = createSlackRequest(sampleSlackCommand);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response_type).toBe('ephemeral');
      expect(data.blocks[0].text.text).toContain('Your Upcoming Bookings');
      expect(data.blocks[0].text.text).toContain('no upcoming meeting room bookings');
    });

    it('should handle /my-bookings command with current booking', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
      const endTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

      const mockBookings = [
        {
          id: 'rec1',
          user: 'U123456789',
          userLabel: 'Test User',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          note: 'Current meeting',
          room: 'room1',
          roomName: 'Conference Room A',
          status: 'Confirmed'
        }
      ];

      mockGetUserFutureBookings.mockResolvedValue(mockBookings);

      const request = createSlackRequest(sampleSlackCommand);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response_type).toBe('ephemeral');
      expect(data.blocks).toHaveLength(5); // Header + Current section + booking + divider + footer
      
      // Check for "Currently Ongoing" section
      const currentSection = data.blocks.find((block: any) => 
        block.text?.text?.includes('Currently Ongoing')
      );
      expect(currentSection).toBeDefined();

      // Check for room name and note - blocks now have accessory buttons
      const bookingBlock = data.blocks.find((block: any) => 
        block.text?.text?.includes('Conference Room A') && block.accessory
      );
      expect(bookingBlock).toBeDefined();
      expect(bookingBlock.text.text).toContain('Current meeting');
    });

    it('should handle /my-bookings command with future bookings', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now

      const mockBookings = [
        {
          id: 'rec1',
          user: 'U123456789',
          userLabel: 'Test User',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          note: 'Future meeting',
          room: 'room1',
          roomName: 'Meeting Room B',
          status: 'Confirmed'
        }
      ];

      mockGetUserFutureBookings.mockResolvedValue(mockBookings);

      const request = createSlackRequest(sampleSlackCommand);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response_type).toBe('ephemeral');
      
      // Check for "Coming Up" section
      const upcomingSection = data.blocks.find((block: any) => 
        block.text?.text?.includes('Coming Up')
      );
      expect(upcomingSection).toBeDefined();

      // Check for room name, date, and note - blocks now have accessory buttons
      const bookingBlock = data.blocks.find((block: any) => 
        block.text?.text?.includes('Meeting Room B') && block.accessory
      );
      expect(bookingBlock).toBeDefined();
      expect(bookingBlock.text.text).toContain('Future meeting');
      expect(bookingBlock.text.text).toContain(startTime.toDateString());
    });

    it('should handle /bookings command (alternative)', async () => {
      const alternativeCommand = new URLSearchParams({
        ...Object.fromEntries(new URLSearchParams(sampleSlackCommand)),
        command: '/bookings'
      }).toString();

      mockGetUserFutureBookings.mockResolvedValue([]);
      mockGetMeetingRooms.mockResolvedValue([]);

      const request = createSlackRequest(alternativeCommand);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response_type).toBe('ephemeral');
      expect(data.blocks[0].text.text).toContain('Your Upcoming Bookings');
    });

    it('should handle unknown commands', async () => {
      const unknownCommand = new URLSearchParams({
        ...Object.fromEntries(new URLSearchParams(sampleSlackCommand)),
        command: '/unknown-command'
      }).toString();

      const request = createSlackRequest(unknownCommand);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response_type).toBe('ephemeral');
      expect(data.text).toContain('Unknown command: /unknown-command');
    });

    it('should limit displayed bookings to 10', async () => {
      const now = new Date();
      const mockBookings = Array.from({ length: 15 }, (_, i) => ({
        id: `rec${i}`,
        user: 'U123456789',
        userLabel: 'Test User',
        startTime: new Date(now.getTime() + (i + 1) * 60 * 60 * 1000).toISOString(),
        endTime: new Date(now.getTime() + (i + 2) * 60 * 60 * 1000).toISOString(),
        note: `Meeting ${i + 1}`,
        room: 'room1',
        status: 'Confirmed'
      }));

      const mockRooms = [
        {
          id: 'room1',
          name: 'Conference Room A',
          capacity: 8,
          notes: 'Main conference room',
          startTime: 28800,
          endTime: 64800
        }
      ];

      mockGetUserFutureBookings.mockResolvedValue(mockBookings);
      mockGetMeetingRooms.mockResolvedValue(mockRooms);

      const request = createSlackRequest(sampleSlackCommand);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Should show "... and X more bookings" message
      const moreBookingsBlock = data.blocks.find((block: any) => 
        block.elements?.[0]?.text?.includes('and 5 more bookings')
      );
      expect(moreBookingsBlock).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockGetUserFutureBookings.mockRejectedValue(new Error('Database error'));
      mockGetMeetingRooms.mockResolvedValue([]);

      const request = createSlackRequest(sampleSlackCommand);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response_type).toBe('ephemeral');
      expect(data.text).toContain('couldn\'t retrieve your bookings');
      
      // Check that console.error was called (the message format may vary)
      expect(mockConsoleError).toHaveBeenCalled();
      const errorCall = mockConsoleError.mock.calls.find(call => 
        call[0] && call[0].includes('Error fetching user bookings')
      );
      expect(errorCall).toBeDefined();
    });

    it('should handle signature verification errors', async () => {
      // Create a request with invalid signature
      const malformedRequest = new NextRequest('http://localhost:3000/api/slack/bot', {
        method: 'POST',
        body: 'malformed data',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-slack-request-timestamp': Math.floor(Date.now() / 1000).toString(),
          'x-slack-signature': 'v0=invalid'
        }
      });

      const response = await POST(malformedRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid signature');
    });

    it('should handle general parsing errors gracefully', async () => {
      // Mock request.text() to throw an error to simulate parsing failure
      const originalText = NextRequest.prototype.text;
      NextRequest.prototype.text = jest.fn().mockRejectedValue(new Error('Parse error'));

      const request = createSlackRequest(sampleSlackCommand);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.response_type).toBe('ephemeral');
      expect(data.text).toContain('something went wrong');

      // Check that error was logged
      expect(mockConsoleError).toHaveBeenCalled();
      const errorCall = mockConsoleError.mock.calls.find(call => 
        call[0] && call[0].includes('Slack bot error')
      );
      expect(errorCall).toBeDefined();

      // Restore original method
      NextRequest.prototype.text = originalText;
    });
  });

  describe('POST - Interactive Buttons', () => {
    it('should handle booking cancellation successfully', async () => {
      const bookingId = 'rec123456789';
      const userId = 'U123456789';
      
      mockUpdateBooking.mockResolvedValue({
        id: bookingId,
        user: userId,
        userLabel: 'Test User',
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T11:00:00.000Z',
        room: 'room1',
        roomName: 'Conference Room A',
        status: 'Cancelled'
      });

      const request = createSlackInteraction('cancel_booking', bookingId, userId);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response_type).toBe('in_channel');
      expect(data.text).toContain('✅ *Booking Cancelled Successfully!*');
      
      // Check that the response includes formatted blocks with cancellation details
      expect(data.blocks).toBeDefined();
      expect(data.blocks).toHaveLength(4); // Header, divider, booking details, timestamp
      expect(data.blocks[0].text.text).toContain('✅ *Booking Cancelled Successfully!*');
      expect(data.blocks[1].type).toBe('divider');
      expect(data.blocks[2].text.text).toContain('~~🏢 *Conference Room A*~~');
      expect(data.blocks[2].text.text).toContain('❌ *CANCELLED*');
      expect(data.blocks[3].elements[0].text).toContain('_Cancelled at');
      
      expect(mockUpdateBooking).toHaveBeenCalledWith(
        bookingId,
        { status: 'Cancelled' },
        userId
      );
    });

    it('should handle unauthorized booking cancellation', async () => {
      const bookingId = 'rec123456789';
      const userId = 'U123456789';
      
      mockUpdateBooking.mockRejectedValue(new Error('Unauthorized'));

      const request = createSlackInteraction('cancel_booking', bookingId, userId);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response_type).toBe('ephemeral');
      expect(data.text).toContain('❌ You can only cancel your own bookings.');
      expect(data.replace_original).toBe(false);
    });

    it('should handle booking cancellation errors gracefully', async () => {
      const bookingId = 'rec123456789';
      const userId = 'U123456789';
      
      mockUpdateBooking.mockRejectedValue(new Error('Database error'));

      const request = createSlackInteraction('cancel_booking', bookingId, userId);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response_type).toBe('ephemeral');
      expect(data.text).toContain('❌ Failed to cancel booking. Please try again later.');
      expect(data.replace_original).toBe(false);
      
      // Check that error was logged
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle unknown interaction actions', async () => {
      const request = createSlackInteraction('unknown_action', 'some_value');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response_type).toBe('ephemeral');
      expect(data.text).toBe('Unknown action.');
    });

    it('should handle malformed interaction payloads', async () => {
      const malformedBody = 'payload=invalid_json';
      const request = createSlackRequest(malformedBody);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.response_type).toBe('ephemeral');
      expect(data.text).toContain('something went wrong');
      
      // Check that error was logged
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('Message Formatting with Cancel Buttons', () => {
    it('should include cancel buttons for upcoming bookings', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now

      const mockBookings = [
        {
          id: 'rec123',
          user: 'U123456789',
          userLabel: 'Test User',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          note: 'Test meeting',
          room: 'room1',
          roomName: 'Conference Room A',
          status: 'Confirmed'
        }
      ];

      mockGetUserFutureBookings.mockResolvedValue(mockBookings);

      const request = createSlackRequest(sampleSlackCommand);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Check that booking block has a cancel button
      const bookingBlock = data.blocks.find((block: any) => 
        block.accessory && block.accessory.action_id === 'cancel_booking'
      );
      expect(bookingBlock).toBeDefined();
      expect(bookingBlock.accessory.text.text).toBe('❌ Cancel');
      expect(bookingBlock.accessory.style).toBe('danger');
      expect(bookingBlock.accessory.value).toBe('rec123');
    });

    it('should include cancel buttons for current bookings', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
      const endTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

      const mockBookings = [
        {
          id: 'rec456',
          user: 'U123456789',
          userLabel: 'Test User',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          note: 'Current meeting',
          room: 'room1',
          roomName: 'Conference Room A',
          status: 'Confirmed'
        }
      ];

      mockGetUserFutureBookings.mockResolvedValue(mockBookings);

      const request = createSlackRequest(sampleSlackCommand);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Check that current booking block has a cancel button
      const bookingBlock = data.blocks.find((block: any) => 
        block.accessory && block.accessory.value === 'rec456'
      );
      expect(bookingBlock).toBeDefined();
      expect(bookingBlock.accessory.action_id).toBe('cancel_booking');
    });
  });
});