/**
 * @fileoverview Tests for Airtable database operations
 * @description Comprehensive test suite for all Airtable CRUD operations,
 * data parsing, validation, and error handling
 */

// Mock console.error
const mockConsoleError = jest.fn();
console.error = mockConsoleError;

// Mock environment first
jest.mock('../env', () => ({
  env: {
    AIRTABLE_API_KEY: 'test-api-key',
    AIRTABLE_BASE_ID: 'test-base-id',
    AIRTABLE_MEETING_ROOMS_TABLE: 'MeetingRooms',
    AIRTABLE_BOOKINGS_TABLE: 'Bookings',
    ROOM_CACHE_TIME: 3600
  }
}));

// Mock the custom airtable_client
jest.mock('../airtable_client', () => ({
  fetchAllRecords: jest.fn(),
  fetchRecord: jest.fn(),
  createRecord: jest.fn(),
  updateRecord: jest.fn(),
}));

import { getMeetingRooms, getBookings, getMaxMeetingHours } from '../airtable';
import { MeetingRoom } from '../types';
import { fetchAllRecords } from '../airtable_client';
import { CACHE_TAGS } from '@/app/constants/cache';
import { env } from '../env';

// Mock the env module
jest.mock('../env', () => ({
  env: {
    AIRTABLE_MEETING_ROOMS_TABLE: 'MeetingRooms',
    AIRTABLE_BOOKINGS_TABLE: 'Bookings',
    MAX_MEETING_HOURS: 8,
    ROOM_CACHE_TIME: 3600
  }
}));

const mockFetchAllRecords = fetchAllRecords as jest.MockedFunction<typeof fetchAllRecords>;

describe('airtable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
  });

  describe('getMeetingRooms', () => {
    it('should fetch and parse meeting rooms', async () => {
      const mockRecords = [
        {
          id: 'rec123',
          fields: {
            name: 'Conference Room A',
            capacity: 8,
            notes: 'Main conference room',
            location: 'Floor 1',
            status: 'Available',
            startTime: 28800,
            endTime: 64800,
          }
        }
      ];

      mockFetchAllRecords.mockResolvedValue(mockRecords);

      const rooms = await getMeetingRooms();

      expect(fetchAllRecords).toHaveBeenCalledWith('MeetingRooms', {
        fields: ['name', 'capacity', 'notes', 'location', 'status', 'startTime', 'endTime', 'image', 'maxMeetingHours', 'tags'],
        sort: [{ field: 'name', direction: 'asc' }],
        cache: {
          cacheOptions: {
            tags: [CACHE_TAGS.MEETING_ROOMS],
            revalidate: env.ROOM_CACHE_TIME
          },
          cache: 'force-cache'
        }
      });

      expect(rooms).toHaveLength(1);
      expect(rooms[0]).toEqual({
        id: 'rec123',
        name: 'Conference Room A',
        capacity: 8,
        notes: 'Main conference room',
        location: 'Floor 1',
        status: 'Available',
        startTime: 28800,
        endTime: 64800,
        image: undefined,
      });
    });
  });

  describe('getBookings', () => {
    it('should fetch and parse all bookings', async () => {
      const mockRecords = [
        {
          id: 'rec456',
          fields: {
            user: 'U123456789',
            userLabel: 'John Doe',
            startTime: '2024-01-15T10:00:00.000Z',
            endTime: '2024-01-15T11:00:00.000Z',
            note: 'Team meeting',
            room: ['rec123'],
            status: 'Confirmed',
          }
        }
      ];

      mockFetchAllRecords.mockResolvedValue(mockRecords);

      const bookings = await getBookings();

      expect(fetchAllRecords).toHaveBeenCalledWith('Bookings', {
        fields: ['user', 'userLabel', 'startTime', 'endTime', 'note', 'room', 'roomName', 'roomLocation', 'status'],
        cache: {
          cacheOptions: {
            tags: [CACHE_TAGS.BOOKINGS_ALL]
          },
          cache: 'force-cache'
        }
      });

      expect(bookings).toHaveLength(1);
      expect(bookings[0]).toEqual({
        id: 'rec456',
        user: 'U123456789',
        userLabel: 'John Doe',
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T11:00:00.000Z',
        note: 'Team meeting',
        room: 'rec123',
        roomName: undefined,
        roomLocation: undefined,
        status: 'Confirmed',
      });
    });
  });
});

describe('getMaxMeetingHours', () => {
  it('should return room-specific maxMeetingHours when set', () => {
    const room: MeetingRoom = {
      id: 'room1',
      name: 'Test Room',
      capacity: 10,
      startTime: 28800,
      endTime: 64800,
      image: null,
      maxMeetingHours: 4
    };
    
    expect(getMaxMeetingHours(room)).toBe(4);
  });

  it('should return global default when room-specific maxMeetingHours is not set', () => {
    const room: MeetingRoom = {
      id: 'room1',
      name: 'Test Room',
      capacity: 10,
      startTime: 28800,
      endTime: 64800,
      image: null
    };
    
    expect(getMaxMeetingHours(room)).toBe(8);
  });

  it('should return global default when room-specific maxMeetingHours is undefined', () => {
    const room: MeetingRoom = {
      id: 'room1',
      name: 'Test Room',
      capacity: 10,
      startTime: 28800,
      endTime: 64800,
      image: null,
      maxMeetingHours: undefined
    };
    
    expect(getMaxMeetingHours(room)).toBe(8);
  });
});