import { 
  createBookingSchema, 
  updateBookingSchema, 
  dateSchema, 
  roomIdSchema,
  bookingIdSchema,
  validateAndSanitize,
  checkRateLimit,
  validateMeetingDuration,
  validateOperatingHours
} from '../validation'
import { ZodError } from 'zod'
import { BOOKING_STATUS } from '../types'
import { MeetingRoom } from '../types';

describe('Validation', () => {
  // Use future dates to avoid past date validation errors
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
  const futureStartTime = futureDate.toISOString();
  const futureEndTime = new Date(futureDate.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour later

  describe('createBookingSchema', () => {
    it('should validate valid booking data', () => {
      const validData = {
        roomId: 'recABCDEFGHIJKLMN',
        startTime: futureStartTime,
        endTime: futureEndTime,
        note: 'Team meeting'
      }

      const result = createBookingSchema.parse(validData)
      expect(result).toEqual(validData)
    })

    it('should validate with minimal required data', () => {
      const minimalData = {
        roomId: 'recABCDEFGHIJKLMN',
        startTime: futureStartTime,
        endTime: futureEndTime
      }

      const result = createBookingSchema.parse(minimalData)
      expect(result.note).toBe('') // Default value
    })

    it('should reject invalid room ID format', () => {
      const invalidData = {
        roomId: 'invalid@id!', // Contains special characters not allowed
        startTime: futureStartTime,
        endTime: futureEndTime
      }

      expect(() => createBookingSchema.parse(invalidData)).toThrow(ZodError)
    })

    it('should reject invalid datetime format', () => {
      const invalidData = {
        roomId: 'recABCDEFGHIJKLMN',
        startTime: 'not-a-date',
        endTime: futureEndTime
      }

      expect(() => createBookingSchema.parse(invalidData)).toThrow(ZodError)
    })

    it('should reject end time before start time', () => {
      const invalidData = {
        roomId: 'recABCDEFGHIJKLMN',
        startTime: futureEndTime,
        endTime: futureStartTime
      }

      expect(() => createBookingSchema.parse(invalidData)).toThrow(ZodError)
    })

    it('should reject booking that has already ended', () => {
      const endedBooking = {
        roomId: 'recABCDEFGHIJKLMN',
        startTime: '2020-01-01T10:00:00.000Z',
        endTime: '2020-01-01T11:00:00.000Z'
      }

      expect(() => createBookingSchema.parse(endedBooking)).toThrow(ZodError)
    })

    it('should allow booking ongoing slot (started but not ended)', () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
      const endTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      
      const ongoingBooking = {
        roomId: 'recABCDEFGHIJKLMN',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }

      const result = createBookingSchema.parse(ongoingBooking)
      expect(result).toEqual({ ...ongoingBooking, note: '' })
    })

    it('should reject note that is too long', () => {
      const longNote = 'x'.repeat(501)
      const invalidData = {
        roomId: 'recABCDEFGHIJKLMN',
        startTime: futureStartTime,
        endTime: futureEndTime,
        note: longNote
      }

      expect(() => createBookingSchema.parse(invalidData)).toThrow(ZodError)
    })

    it('should accept alternative room ID format', () => {
      const altData = {
        roomId: 'custom-room-123',
        startTime: futureStartTime,
        endTime: futureEndTime
      }

      const result = createBookingSchema.parse(altData)
      expect(result.roomId).toBe('custom-room-123')
    })
  })

  describe('updateBookingSchema', () => {
    it('should validate confirmed status', () => {
      const result = updateBookingSchema.parse({ status: BOOKING_STATUS.CONFIRMED })
      expect(result.status).toBe(BOOKING_STATUS.CONFIRMED)
    })

    it('should validate cancelled status', () => {
      const result = updateBookingSchema.parse({ status: BOOKING_STATUS.CANCELLED })
      expect(result.status).toBe(BOOKING_STATUS.CANCELLED)
    })

    it('should reject invalid status', () => {
      expect(() => updateBookingSchema.parse({ status: 'INVALID' })).toThrow(ZodError)
    })
  })

  describe('dateSchema', () => {
    it('should validate correct date format', () => {
      expect(dateSchema.parse('2024-01-15')).toBe('2024-01-15')
      expect(dateSchema.parse('2023-12-31')).toBe('2023-12-31')
      expect(dateSchema.parse('2024-02-29')).toBe('2024-02-29') // Leap year
    })

    it('should reject invalid date format', () => {
      expect(() => dateSchema.parse('2024/01/15')).toThrow(ZodError)
      expect(() => dateSchema.parse('01-15-2024')).toThrow(ZodError)
      expect(() => dateSchema.parse('2024-1-15')).toThrow(ZodError)
      expect(() => dateSchema.parse('not-a-date')).toThrow(ZodError)
    })

    it('should reject invalid dates', () => {
      expect(() => dateSchema.parse('2024-02-30')).toThrow(ZodError) // Feb 30 doesn't exist
      expect(() => dateSchema.parse('2024-13-01')).toThrow(ZodError) // Month 13 doesn't exist
      expect(() => dateSchema.parse('2023-02-29')).toThrow(ZodError) // Not a leap year
    })
  })

  describe('roomIdSchema', () => {
    it('should validate Airtable record ID format', () => {
      expect(roomIdSchema.parse('recABCDEFGHIJKLMN')).toBe('recABCDEFGHIJKLMN')
    })

    it('should validate custom ID format', () => {
      expect(roomIdSchema.parse('room-123')).toBe('room-123')
      expect(roomIdSchema.parse('meeting_room_a')).toBe('meeting_room_a')
      expect(roomIdSchema.parse('A123')).toBe('A123')
    })

    it('should reject empty or invalid IDs', () => {
      expect(() => roomIdSchema.parse('')).toThrow(ZodError)
      expect(() => roomIdSchema.parse('invalid@id')).toThrow(ZodError)
      expect(() => roomIdSchema.parse('id with spaces')).toThrow(ZodError)
    })
  })

  describe('bookingIdSchema', () => {
    it('should validate Airtable booking ID format', () => {
      expect(bookingIdSchema.parse('recABCDEFGHIJKLMN')).toBe('recABCDEFGHIJKLMN')
    })

    it('should reject invalid booking ID format', () => {
      expect(() => bookingIdSchema.parse('invalid-id')).toThrow(ZodError)
      expect(() => bookingIdSchema.parse('recTOOSHORT')).toThrow(ZodError)
      expect(() => bookingIdSchema.parse('recTOOLONGABCDEFGHI')).toThrow(ZodError)
      expect(() => bookingIdSchema.parse('')).toThrow(ZodError)
    })
  })

  describe('validateAndSanitize', () => {
    it('should return parsed data for valid input', () => {
      const schema = dateSchema
      const validData = '2024-01-15'
      
      const result = validateAndSanitize(schema, validData)
      expect(result).toBe('2024-01-15')
    })

    it('should throw ZodError for invalid input', () => {
      const schema = dateSchema
      const invalidData = 'invalid-date'
      
      expect(() => validateAndSanitize(schema, invalidData)).toThrow(ZodError)
    })

          it('should work with complex schemas', () => {
        const validBooking = {
          roomId: 'recABCDEFGHIJKLMN',
          startTime: futureStartTime,
          endTime: futureEndTime,
          note: 'Test meeting'
        }

      const result = validateAndSanitize(createBookingSchema, validBooking)
      expect(result).toEqual(validBooking)
    })
  })

  describe('checkRateLimit', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      // Clear any existing rate limit data by requiring a fresh instance
      jest.resetModules()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should allow requests within rate limit', () => {
      const identifier = 'test-user-1'
      
      expect(checkRateLimit(identifier, 5, 60000)).toBe(true) // 1st request
      expect(checkRateLimit(identifier, 5, 60000)).toBe(true) // 2nd request
      expect(checkRateLimit(identifier, 5, 60000)).toBe(true) // 3rd request
    })

    it('should block requests exceeding rate limit', () => {
      const identifier = 'test-user-2'
      const maxRequests = 3
      
      // Make requests up to the limit
      for (let i = 0; i < maxRequests; i++) {
        expect(checkRateLimit(identifier, maxRequests, 60000)).toBe(true)
      }
      
      // Next request should be blocked
      expect(checkRateLimit(identifier, maxRequests, 60000)).toBe(false)
    })

    it('should reset rate limit after time window', () => {
      const identifier = 'test-user-3'
      const maxRequests = 2
      const windowMs = 60000 // 1 minute
      
      // Exhaust the rate limit
      expect(checkRateLimit(identifier, maxRequests, windowMs)).toBe(true)
      expect(checkRateLimit(identifier, maxRequests, windowMs)).toBe(true)
      expect(checkRateLimit(identifier, maxRequests, windowMs)).toBe(false)
      
      // Advance time beyond the window
      jest.advanceTimersByTime(windowMs + 1000)
      
      // Should allow requests again
      expect(checkRateLimit(identifier, maxRequests, windowMs)).toBe(true)
    })

    it('should handle different identifiers independently', () => {
      const user1 = 'test-user-4'
      const user2 = 'test-user-5'
      const maxRequests = 2
      
      // User 1 makes requests
      expect(checkRateLimit(user1, maxRequests, 60000)).toBe(true)
      expect(checkRateLimit(user1, maxRequests, 60000)).toBe(true)
      expect(checkRateLimit(user1, maxRequests, 60000)).toBe(false)
      
      // User 2 should not be affected
      expect(checkRateLimit(user2, maxRequests, 60000)).toBe(true)
      expect(checkRateLimit(user2, maxRequests, 60000)).toBe(true)
      expect(checkRateLimit(user2, maxRequests, 60000)).toBe(false)
    })

    it('should handle immediate expiration', () => {
      const identifier = 'test-user-6'
      
      expect(checkRateLimit(identifier, 1, 0)).toBe(true)
      
      // Advance time just a little
      jest.advanceTimersByTime(1)
      
      // Should allow new request after window expiration
      expect(checkRateLimit(identifier, 1, 0)).toBe(true)
    })
  })
})

/**
 * @fileoverview Tests for validation functions
 * @description Tests for input validation schemas and utility functions
 */

describe('validateMeetingDuration', () => {
  const baseRoom: MeetingRoom = {
    id: 'room1',
    name: 'Test Room',
    capacity: 10,
    startTime: 28800,
    endTime: 64800,
    image: null
  };

  it('should return true for valid meeting duration within global limit', () => {
    const startTime = '2024-01-01T09:00:00.000Z';
    const endTime = '2024-01-01T17:00:00.000Z'; // 8 hours
    
    expect(validateMeetingDuration(startTime, endTime, baseRoom)).toBe(true);
  });

  it('should return false for meeting duration exceeding global limit', () => {
    const startTime = '2024-01-01T09:00:00.000Z';
    const endTime = '2024-01-01T19:00:00.000Z'; // 10 hours
    
    expect(validateMeetingDuration(startTime, endTime, baseRoom)).toBe(false);
  });

  it('should return true for meeting duration within room-specific limit', () => {
    const roomWithCustomLimit: MeetingRoom = {
      ...baseRoom,
      maxMeetingHours: 4
    };
    
    const startTime = '2024-01-01T09:00:00.000Z';
    const endTime = '2024-01-01T13:00:00.000Z'; // 4 hours
    
    expect(validateMeetingDuration(startTime, endTime, roomWithCustomLimit)).toBe(true);
  });

  it('should return false for meeting duration exceeding room-specific limit', () => {
    const roomWithCustomLimit: MeetingRoom = {
      ...baseRoom,
      maxMeetingHours: 4
    };
    
    const startTime = '2024-01-01T09:00:00.000Z';
    const endTime = '2024-01-01T15:00:00.000Z'; // 6 hours
    
    expect(validateMeetingDuration(startTime, endTime, roomWithCustomLimit)).toBe(false);
  });

  it('should handle edge case of exactly maximum duration', () => {
    const startTime = '2024-01-01T09:00:00.000Z';
    const endTime = '2024-01-01T17:00:00.000Z'; // Exactly 8 hours
    
    expect(validateMeetingDuration(startTime, endTime, baseRoom)).toBe(true);
  });

  it('should handle very short meetings', () => {
    const startTime = '2024-01-01T09:00:00.000Z';
    const endTime = '2024-01-01T09:30:00.000Z'; // 30 minutes
    
    expect(validateMeetingDuration(startTime, endTime, baseRoom)).toBe(true);
  });

  it('should handle room with very short limit', () => {
    const roomWithShortLimit: MeetingRoom = {
      ...baseRoom,
      maxMeetingHours: 1
    };
    
    const startTime = '2024-01-01T09:00:00.000Z';
    const endTime = '2024-01-01T10:00:00.000Z'; // Exactly 1 hour
    
    expect(validateMeetingDuration(startTime, endTime, roomWithShortLimit)).toBe(true);
  });

  it('should return false for meeting exceeding very short limit', () => {
    const roomWithShortLimit: MeetingRoom = {
      ...baseRoom,
      maxMeetingHours: 1
    };
    
    const startTime = '2024-01-01T09:00:00.000Z';
    const endTime = '2024-01-01T10:30:00.000Z'; // 1.5 hours
    
    expect(validateMeetingDuration(startTime, endTime, roomWithShortLimit)).toBe(false);
  });

  it('should handle decimal maxMeetingHours values', () => {
    const roomWithDecimalLimit: MeetingRoom = {
      ...baseRoom,
      maxMeetingHours: 1.5 // 90 minutes
    };
    
    // Test 1: Meeting within limit (1 hour = 60 minutes)
    const startTime1 = '2024-01-01T09:00:00.000Z';
    const endTime1 = '2024-01-01T10:00:00.000Z'; // 1 hour
    
    expect(validateMeetingDuration(startTime1, endTime1, roomWithDecimalLimit)).toBe(true);
    
    // Test 2: Meeting exactly at limit (1.5 hours = 90 minutes)
    const startTime2 = '2024-01-01T09:00:00.000Z';
    const endTime2 = '2024-01-01T10:30:00.000Z'; // 1.5 hours
    
    expect(validateMeetingDuration(startTime2, endTime2, roomWithDecimalLimit)).toBe(true);
    
    // Test 3: Meeting exceeding limit (2 hours = 120 minutes)
    const startTime3 = '2024-01-01T09:00:00.000Z';
    const endTime3 = '2024-01-01T11:00:00.000Z'; // 2 hours
    
    expect(validateMeetingDuration(startTime3, endTime3, roomWithDecimalLimit)).toBe(false);
  });

  it('should handle very short decimal limits', () => {
    const roomWithVeryShortLimit: MeetingRoom = {
      ...baseRoom,
      maxMeetingHours: 0.5 // 30 minutes
    };
    
    // Test 1: Meeting within limit (15 minutes)
    const startTime1 = '2024-01-01T09:00:00.000Z';
    const endTime1 = '2024-01-01T09:15:00.000Z'; // 15 minutes
    
    expect(validateMeetingDuration(startTime1, endTime1, roomWithVeryShortLimit)).toBe(true);
    
    // Test 2: Meeting exactly at limit (30 minutes)
    const startTime2 = '2024-01-01T09:00:00.000Z';
    const endTime2 = '2024-01-01T09:30:00.000Z'; // 30 minutes
    
    expect(validateMeetingDuration(startTime2, endTime2, roomWithVeryShortLimit)).toBe(true);
    
    // Test 3: Meeting exceeding limit (45 minutes)
    const startTime3 = '2024-01-01T09:00:00.000Z';
    const endTime3 = '2024-01-01T09:45:00.000Z'; // 45 minutes
    
    expect(validateMeetingDuration(startTime3, endTime3, roomWithVeryShortLimit)).toBe(false);
  });
});

describe('validateOperatingHours', () => {
  const baseRoom: MeetingRoom = {
    id: 'room1',
    name: 'Test Room',
    capacity: 10,
    startTime: 28800, // 8:00 AM
    endTime: 64800,   // 6:00 PM
    image: null
  };

  it('should return true for booking within operating hours', () => {
    const startTime = '2024-01-01T09:00:00.000Z'; // 9:00 AM
    const endTime = '2024-01-01T10:00:00.000Z';   // 10:00 AM
    
    expect(validateOperatingHours(startTime, endTime, baseRoom)).toBe(true);
  });

  it('should return false for booking starting before opening time', () => {
    const startTime = '2024-01-01T07:00:00.000Z'; // 7:00 AM (before 8:00 AM)
    const endTime = '2024-01-01T09:00:00.000Z';   // 9:00 AM
    
    expect(validateOperatingHours(startTime, endTime, baseRoom)).toBe(false);
  });

  it('should return false for booking ending after closing time', () => {
    const startTime = '2024-01-01T17:00:00.000Z'; // 5:00 PM
    const endTime = '2024-01-01T19:00:00.000Z';   // 7:00 PM (after 6:00 PM)
    
    expect(validateOperatingHours(startTime, endTime, baseRoom)).toBe(false);
  });

  it('should return false for booking spanning outside operating hours', () => {
    const startTime = '2024-01-01T17:00:00.000Z'; // 5:00 PM
    const endTime = '2024-01-01T20:00:00.000Z';   // 8:00 PM (after 6:00 PM)
    
    expect(validateOperatingHours(startTime, endTime, baseRoom)).toBe(false);
  });

  it('should return true for booking exactly at opening time', () => {
    const startTime = '2024-01-01T08:00:00.000Z'; // Exactly 8:00 AM
    const endTime = '2024-01-01T09:00:00.000Z';   // 9:00 AM
    
    expect(validateOperatingHours(startTime, endTime, baseRoom)).toBe(true);
  });

  it('should return true for booking ending exactly at closing time', () => {
    const startTime = '2024-01-01T17:00:00.000Z'; // 5:00 PM
    const endTime = '2024-01-01T18:00:00.000Z';   // Exactly 6:00 PM
    
    expect(validateOperatingHours(startTime, endTime, baseRoom)).toBe(true);
  });

  it('should handle room with non-standard hours', () => {
    const nightRoom: MeetingRoom = {
      ...baseRoom,
      startTime: 64800, // 6:00 PM
      endTime: 86400,   // 12:00 AM (midnight)
    };
    
    const startTime = '2024-01-01T20:00:00.000Z'; // 8:00 PM
    const endTime = '2024-01-01T22:00:00.000Z';   // 10:00 PM
    
    expect(validateOperatingHours(startTime, endTime, nightRoom)).toBe(true);
  });

  it('should handle room with 24-hour operation', () => {
    const allDayRoom: MeetingRoom = {
      ...baseRoom,
      startTime: 0,     // 12:00 AM (midnight)
      endTime: 86400,   // 12:00 AM (next day)
    };
    
    const startTime = '2024-01-01T23:00:00.000Z'; // 11:00 PM
    const endTime = '2024-01-02T01:00:00.000Z';   // 1:00 AM next day
    
    expect(validateOperatingHours(startTime, endTime, allDayRoom)).toBe(true);
  });

  it('should handle booking spanning midnight', () => {
    const lateRoom: MeetingRoom = {
      ...baseRoom,
      startTime: 64800, // 6:00 PM
      endTime: 3600,    // 1:00 AM next day
    };
    
    const startTime = '2024-01-01T23:00:00.000Z'; // 11:00 PM
    const endTime = '2024-01-02T00:30:00.000Z';   // 12:30 AM next day
    
    expect(validateOperatingHours(startTime, endTime, lateRoom)).toBe(true);
  });

  it('should return false for booking outside late night hours', () => {
    const lateRoom: MeetingRoom = {
      ...baseRoom,
      startTime: 64800, // 6:00 PM
      endTime: 3600,    // 1:00 AM next day
    };
    
    const startTime = '2024-01-01T14:00:00.000Z'; // 2:00 PM (before 6:00 PM)
    const endTime = '2024-01-01T15:00:00.000Z';   // 3:00 PM
    
    expect(validateOperatingHours(startTime, endTime, lateRoom)).toBe(false);
  });
});