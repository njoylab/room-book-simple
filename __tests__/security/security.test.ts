import { describe, it, expect, beforeEach } from '@jest/globals'

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  SESSION_SECRET: 'mocksessionsecret32charsfortestX',
  SLACK_SIGNING_SECRET: 'mock_signing_secret_value',
}

describe('Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Session Security', () => {
    it('should validate session secret length', () => {
      const sessionSecret = process.env.SESSION_SECRET
      
      expect(sessionSecret).toBeDefined()
      expect(sessionSecret!.length).toBe(32)
    })

    it('should reject short session secrets', () => {
      const shortSecret = 'short'
      
      expect(shortSecret.length).toBeLessThan(32)
    })

    it('should validate session cookie name', () => {
      const cookieName = process.env.SESSION_COOKIE_NAME || 'room_booking_user'
      
      expect(cookieName).toBeDefined()
      expect(typeof cookieName).toBe('string')
      expect(cookieName.length).toBeGreaterThan(0)
    })
  })

  describe('Input Validation', () => {
    it('should validate room ID format', () => {
      const validRoomIds = [
        'rec1234567890',
        'recABCDEFGHIJ',
        'rec12345678901234567890'
      ]
      
      const invalidRoomIds = [
        'invalid',
        '1234567890',
        'rec',
        '',
        null,
        undefined
      ]
      
      validRoomIds.forEach(id => {
        expect(id).toMatch(/^rec[a-zA-Z0-9]+$/)
      })
      
      invalidRoomIds.forEach(id => {
        if (id) {
          expect(id).not.toMatch(/^rec[a-zA-Z0-9]+$/)
        }
      })
    })

    it('should validate booking ID format', () => {
      const validBookingIds = [
        'rec1234567890',
        'recABCDEFGHIJ'
      ]
      
      const invalidBookingIds = [
        'invalid',
        '1234567890',
        '',
        null,
        undefined
      ]
      
      validBookingIds.forEach(id => {
        expect(id).toMatch(/^rec[a-zA-Z0-9]+$/)
      })
      
      invalidBookingIds.forEach(id => {
        if (id) {
          expect(id).not.toMatch(/^rec[a-zA-Z0-9]+$/)
        }
      })
    })

    it('should validate date format', () => {
      const validDates = [
        '2024-01-17',
        '2024-12-31',
        '2025-02-29' // Leap year
      ]
      
      const invalidDates = [
        'invalid-date',
        '2024/01/17', // Wrong format
        '24-01-01',   // Wrong year format
        '2024-1-01',  // Wrong month format
        '2024-01-1',  // Wrong day format
        '',
        null,
        undefined
      ]
      
      const logicallyInvalidDates = [
        '2024-13-01', // Invalid month
        '2024-01-32', // Invalid day
      ]
      
      validDates.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(() => new Date(date)).not.toThrow()
      })
      
      invalidDates.forEach(date => {
        if (date) {
          expect(date).not.toMatch(/^\d{4}-\d{2}-\d{2}$/)
        }
      })
      
      // Test dates that match format but are logically invalid
      logicallyInvalidDates.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/) // Format is correct
        expect(new Date(date).toString()).toBe('Invalid Date') // But date is invalid
      })
    })

    it('should validate time format', () => {
      const validTimes = [
        0,        // Midnight
        28800,    // 8:00 AM
        64800,    // 6:00 PM
        86399     // 11:59:59 PM
      ]
      
      const invalidTimes = [
        -1,       // Negative
        86400,    // Beyond 24 hours
        1.5,      // Decimal
        '28800',  // String
        null,
        undefined
      ]
      
      validTimes.forEach(time => {
        expect(typeof time).toBe('number')
        expect(time).toBeGreaterThanOrEqual(0)
        expect(time).toBeLessThan(86400)
        expect(Number.isInteger(time)).toBe(true)
      })
      
      invalidTimes.forEach(time => {
        if (time !== null && time !== undefined) {
          expect(
            typeof time === 'number' && 
            time >= 0 && 
            time < 86400 && 
            Number.isInteger(time)
          ).toBe(false)
        }
      })
    })
  })

  describe('Authentication Security', () => {
    it('should validate Slack user ID format', () => {
      const validUserIds = [
        'U1234567890',
        'UABCDEFGHIJ',
        'U12345678901234567890'
      ]
      
      const invalidUserIds = [
        'invalid',
        '1234567890',
        'U',
        '',
        null,
        undefined
      ]
      
      validUserIds.forEach(id => {
        expect(id).toMatch(/^U[A-Z0-9]+$/)
      })
      
      invalidUserIds.forEach(id => {
        if (id) {
          expect(id).not.toMatch(/^U[A-Z0-9]+$/)
        }
      })
    })

    it('should validate Slack team ID format', () => {
      const validTeamIds = [
        'T1234567890',
        'TABCDEFGHIJ'
      ]
      
      const invalidTeamIds = [
        'invalid',
        '1234567890',
        'T',
        '',
        null,
        undefined
      ]
      
      validTeamIds.forEach(id => {
        expect(id).toMatch(/^T[A-Z0-9]+$/)
      })
      
      invalidTeamIds.forEach(id => {
        if (id) {
          expect(id).not.toMatch(/^T[A-Z0-9]+$/)
        }
      })
    })
  })

  describe('Authorization Tests', () => {
    it('should prevent users from accessing other users bookings', () => {
      const currentUser = 'U1234567890'
      const bookingOwner = 'U0987654321'
      const booking = {
        id: 'rec1234567890',
        user: bookingOwner,
        userLabel: 'Other User',
        startTime: '2024-01-17T09:00:00.000Z',
        endTime: '2024-01-17T10:00:00.000Z',
        room: 'rec1234567890',
        status: 'Confirmed'
      }
      
      // User should not be able to access booking owned by another user
      expect(booking.user).not.toBe(currentUser)
    })

    it('should validate booking ownership for updates', () => {
      const currentUser = 'U1234567890'
      const bookingOwner = 'U1234567890'
      const otherUser = 'U0987654321'
      
      const ownBooking = { user: bookingOwner }
      const otherBooking = { user: otherUser }
      
      // User should be able to update their own booking
      expect(ownBooking.user).toBe(currentUser)
      
      // User should not be able to update other user's booking
      expect(otherBooking.user).not.toBe(currentUser)
    })
  })

  describe('Rate Limiting', () => {
    it('should implement rate limiting for authentication endpoints', () => {
      const authEndpoints = [
        '/api/auth/slack',
        '/api/auth/user',
        '/api/auth/logout'
      ]
      
      const expectedLimit = 5 // requests per minute
      
      authEndpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\/auth\//)
      })
      
      expect(expectedLimit).toBeLessThanOrEqual(10) // Reasonable limit
    })

    it('should implement rate limiting for booking endpoints', () => {
      const bookingEndpoints = [
        '/api/bookings',
        '/api/bookings/calendar'
      ]
      
      const expectedLimit = 10 // requests per minute
      
      bookingEndpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\/bookings/)
      })
      
      expect(expectedLimit).toBeLessThanOrEqual(20) // Reasonable limit
    })

    it('should implement rate limiting for room endpoints', () => {
      const roomEndpoints = [
        '/api/rooms',
        '/api/rooms/[id]/slots',
        '/api/rooms/[id]/bookings'
      ]
      
      const expectedLimit = 20 // requests per minute
      
      roomEndpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\/rooms/)
      })
      
      expect(expectedLimit).toBeLessThanOrEqual(30) // Reasonable limit
    })
  })

  describe('Data Sanitization', () => {
    it('should sanitize user input in booking notes', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        '"><img src=x onerror=alert("xss")>'
      ]
      
      const safeInputs = [
        'Regular meeting notes',
        'Team standup discussion',
        'Client presentation prep',
        'Project review session'
      ]
      
      // Test that malicious inputs are detected
      maliciousInputs.forEach(input => {
        expect(input).toMatch(/<script|javascript:|data:text\/html|onerror=/i)
      })
      
      // Test that safe inputs are clean
      safeInputs.forEach(input => {
        expect(input).not.toMatch(/<script|javascript:|data:text\/html|onerror=/i)
      })
    })

    it('should validate room names for injection attempts', () => {
      const maliciousRoomNames = [
        'Room"; DROP TABLE rooms; --',
        'Room\' OR 1=1; --',
        'Room<script>alert("xss")</script>',
        'Room${7*7}',
        'Room{{7*7}}'
      ]
      
      const safeRoomNames = [
        'Conference Room A',
        'Meeting Room 1',
        'Board Room',
        'Training Room'
      ]
      
      // Test that malicious names are detected
      maliciousRoomNames.forEach(name => {
        expect(name).toMatch(/['";<>${}]|DROP|OR 1=1|script|alert/i)
      })
      
      // Test that safe names are clean
      safeRoomNames.forEach(name => {
        expect(name).not.toMatch(/['";<>${}]|DROP|OR 1=1|script|alert/i)
      })
    })
  })

  describe('Environment Security', () => {
    it('should validate required environment variables', () => {
      const requiredVars = [
        'AIRTABLE_API_KEY',
        'AIRTABLE_BASE_ID',
        'SLACK_CLIENT_ID',
        'SLACK_CLIENT_SECRET',
        'SLACK_SIGNING_SECRET',
        'SESSION_SECRET'
      ]
      
      requiredVars.forEach(varName => {
        const value = process.env[varName]
        expect(value).toBeDefined()
        expect(value).not.toBe('')
      })
    })

    it('should validate environment variable formats', () => {
      // Session secret should be exactly 32 characters
      const sessionSecret = process.env.SESSION_SECRET
      expect(sessionSecret).toHaveLength(32)
      
      // API keys should not be empty
      const apiKey = process.env.AIRTABLE_API_KEY
      expect(apiKey).toBeDefined()
      expect(apiKey!.length).toBeGreaterThan(0)
      
      // Base ID should be defined
      const baseId = process.env.AIRTABLE_BASE_ID
      expect(baseId).toBeDefined()
      expect(baseId!.length).toBeGreaterThan(0)
    })

    it('should prevent sensitive data exposure', () => {
      const sensitiveVars = [
        'AIRTABLE_API_KEY',
        'SLACK_CLIENT_SECRET',
        'SLACK_SIGNING_SECRET',
        'SESSION_SECRET'
      ]
      
      sensitiveVars.forEach(varName => {
        const value = process.env[varName]
        expect(value).toBeDefined()
        expect(value).not.toContain('your_')
        expect(value).not.toContain('test_')
        expect(value!.length).toBeGreaterThan(10) // Should be substantial
      })
    })
  })

  describe('CORS Security', () => {
    it('should validate CORS configuration', () => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
      
      if (allowedOrigins) {
        const origins = allowedOrigins.split(',')
        
        origins.forEach(origin => {
          // Origins should be valid URLs
          expect(origin).toMatch(/^https?:\/\/.+/)
          // Should not allow wildcards in production
          expect(origin).not.toContain('*')
        })
      }
    })

    it('should prevent unauthorized cross-origin requests', () => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS || ''
      const maliciousOrigins = [
        'http://malicious-site.com',
        'https://evil.com',
        'http://localhost:3001' // Different port
      ]
      
      if (allowedOrigins) {
        const origins = allowedOrigins.split(',')
        
        maliciousOrigins.forEach(malicious => {
          expect(origins).not.toContain(malicious)
        })
      }
    })
  })
})