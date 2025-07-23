import {
  createBookingSchema,
  updateBookingSchema,
  dateSchema,
  roomIdSchema,
  bookingIdSchema,
  validateAndSanitize,
  checkRateLimit
} from '../validation'
import { ZodError } from 'zod'
import { BOOKING_STATUS } from '../types'

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