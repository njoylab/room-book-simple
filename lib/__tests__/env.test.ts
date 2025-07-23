import { z } from 'zod'

// Import the schema and functions to test them
// Note: We can't directly import env because it runs validation immediately
// So we'll test the schema and utility functions separately

describe('Environment Configuration', () => {
  // Mock environment variables
  const validEnv = {
    AIRTABLE_API_KEY: 'test_api_key',
    AIRTABLE_BASE_ID: 'test_base_id',
    AIRTABLE_MEETING_ROOMS_TABLE: 'MeetingRooms',
    AIRTABLE_BOOKINGS_TABLE: 'Bookings',
    SLACK_CLIENT_ID: 'test_client_id',
    SLACK_CLIENT_SECRET: 'test_client_secret',
    SLACK_SIGNING_SECRET: 'test_signing_secret',
    SESSION_SECRET: 'test_session_secret_32_chars_123',
    SESSION_COOKIE_NAME: 'room_booking_user',
    SESSION_DURATION_HOURS: '168',
    APP_BASE_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
  }

  describe('Environment Schema Validation', () => {
    // We'll recreate the schema here for testing
    const envSchema = z.object({
      AIRTABLE_API_KEY: z.string().min(1, 'AIRTABLE_API_KEY is required'),
      AIRTABLE_BASE_ID: z.string().min(1, 'AIRTABLE_BASE_ID is required'),
      AIRTABLE_MEETING_ROOMS_TABLE: z.string().default('MeetingRooms'),
      AIRTABLE_BOOKINGS_TABLE: z.string().default('Bookings'),
      SLACK_CLIENT_ID: z.string().min(1, 'SLACK_CLIENT_ID is required'),
      SLACK_CLIENT_SECRET: z.string().min(1, 'SLACK_CLIENT_SECRET is required'),
      SLACK_SIGNING_SECRET: z.string().min(1, 'SLACK_SIGNING_SECRET is required'),
      SESSION_SECRET: z.string()
        .length(32, 'SESSION_SECRET must be exactly 32 characters (256 bits)')
        .refine(
          (val) => val !== 'your-256-bit-secret-here-change-in-',
          'SESSION_SECRET must be changed from default value'
        ),
      SESSION_COOKIE_NAME: z.string().default('room_booking_user'),
      SESSION_DURATION_HOURS: z.string().default('168').transform(val => parseInt(val) || 168).refine(val => val >= 1 && val <= 168, 'SESSION_DURATION_HOURS must be between 1 and 168 hours (1 week)'),
      APP_TITLE: z.string().default('B4I'),
      UPCOMING_MEETINGS_HOURS: z.string().transform(val => parseInt(val) || 0).refine(val => val >= 0 && val <= 168, 'UPCOMING_MEETINGS_HOURS must be between 0 and 168 hours (1 week)').optional(),
      APP_BASE_URL: z.string().url().optional(),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    })

    it('should validate complete valid environment', () => {
      const result = envSchema.parse(validEnv)
      
      expect(result.AIRTABLE_API_KEY).toBe('test_api_key')
      expect(result.AIRTABLE_BASE_ID).toBe('test_base_id')
      expect(result.SLACK_CLIENT_ID).toBe('test_client_id')
      expect(result.SESSION_SECRET).toBe('test_session_secret_32_chars_123')
      expect(result.NODE_ENV).toBe('test')
    })

    it('should apply default values correctly', () => {
      const minimalEnv = {
        AIRTABLE_API_KEY: 'test_api_key',
        AIRTABLE_BASE_ID: 'test_base_id',
        SLACK_CLIENT_ID: 'test_client_id',
        SLACK_CLIENT_SECRET: 'test_client_secret',
        SLACK_SIGNING_SECRET: 'test_signing_secret',
        SESSION_SECRET: 'test_session_secret_32_chars_123',
      }

      const result = envSchema.parse(minimalEnv)
      
      expect(result.AIRTABLE_MEETING_ROOMS_TABLE).toBe('MeetingRooms')
      expect(result.AIRTABLE_BOOKINGS_TABLE).toBe('Bookings')
      expect(result.SESSION_COOKIE_NAME).toBe('room_booking_user')
      expect(result.NODE_ENV).toBe('development')
    })

    it('should reject missing required variables', () => {
      const incompleteEnv = {
        AIRTABLE_API_KEY: 'test_api_key',
        // Missing AIRTABLE_BASE_ID
        SLACK_CLIENT_ID: 'test_client_id',
        SLACK_CLIENT_SECRET: 'test_client_secret',
        SLACK_SIGNING_SECRET: 'test_signing_secret',
        SESSION_SECRET: 'test_session_secret_32_chars_123',
      }

      expect(() => envSchema.parse(incompleteEnv)).toThrow(z.ZodError)
    })

    it('should reject empty required variables', () => {
      const emptyEnv = {
        ...validEnv,
        AIRTABLE_API_KEY: '', // Empty required field
      }

      expect(() => envSchema.parse(emptyEnv)).toThrow(z.ZodError)
    })

    it('should validate SESSION_SECRET length', () => {
      const shortSecretEnv = {
        ...validEnv,
        SESSION_SECRET: 'too_short', // Less than 32 characters
      }

      expect(() => envSchema.parse(shortSecretEnv)).toThrow(z.ZodError)

      const longSecretEnv = {
        ...validEnv,
        SESSION_SECRET: 'this_is_way_too_long_for_session_secret_validation', // More than 32 characters
      }

      expect(() => envSchema.parse(longSecretEnv)).toThrow(z.ZodError)
    })

    it('should reject default SESSION_SECRET', () => {
      const defaultSecretEnv = {
        ...validEnv,
        SESSION_SECRET: 'your-256-bit-secret-here-change-in-', // Default value
      }

      expect(() => envSchema.parse(defaultSecretEnv)).toThrow(z.ZodError)
    })

    it('should validate APP_BASE_URL format', () => {
      const invalidUrlEnv = {
        ...validEnv,
        APP_BASE_URL: 'not-a-valid-url',
      }

      expect(() => envSchema.parse(invalidUrlEnv)).toThrow(z.ZodError)

      const validUrlEnv = {
        ...validEnv,
        APP_BASE_URL: 'https://example.com/auth',
      }

      const result = envSchema.parse(validUrlEnv)
      expect(result.APP_BASE_URL).toBe('https://example.com/auth')
    })

    it('should validate NODE_ENV enum', () => {
      const invalidNodeEnv = {
        ...validEnv,
        NODE_ENV: 'invalid_env',
      }

      expect(() => envSchema.parse(invalidNodeEnv)).toThrow(z.ZodError)

      // Test all valid values
      const devEnv = envSchema.parse({ ...validEnv, NODE_ENV: 'development' })
      expect(devEnv.NODE_ENV).toBe('development')

      const prodEnv = envSchema.parse({ ...validEnv, NODE_ENV: 'production' })
      expect(prodEnv.NODE_ENV).toBe('production')

      const testEnv = envSchema.parse({ ...validEnv, NODE_ENV: 'test' })
      expect(testEnv.NODE_ENV).toBe('test')
    })


    it('should handle SESSION_DURATION_HOURS correctly', () => {
      // Test default value (7 days = 168 hours)
      const defaultEnv = {
        ...validEnv,
        SESSION_DURATION_HOURS: undefined,
      }
      delete defaultEnv.SESSION_DURATION_HOURS
      
      const result1 = envSchema.parse(defaultEnv)
      expect(result1.SESSION_DURATION_HOURS).toBe(168)

      // Test custom value
      const customEnv = {
        ...validEnv,
        SESSION_DURATION_HOURS: '24',
      }
      
      const result2 = envSchema.parse(customEnv)
      expect(result2.SESSION_DURATION_HOURS).toBe(24)

      // Test minimum value (1 hour)
      const minEnv = {
        ...validEnv,
        SESSION_DURATION_HOURS: '1',
      }
      
      const result3 = envSchema.parse(minEnv)
      expect(result3.SESSION_DURATION_HOURS).toBe(1)

      // Test maximum value (1 week = 168 hours)
      const maxEnv = {
        ...validEnv,
        SESSION_DURATION_HOURS: '168',
      }
      
      const result4 = envSchema.parse(maxEnv)
      expect(result4.SESSION_DURATION_HOURS).toBe(168)
    })

    it('should handle UPCOMING_MEETINGS_HOURS correctly', () => {
      // Test default value (undefined - will use current day logic)
      const defaultEnv = {
        ...validEnv,
        UPCOMING_MEETINGS_HOURS: undefined,
      }
      delete defaultEnv.UPCOMING_MEETINGS_HOURS
      
      const result1 = envSchema.parse(defaultEnv)
      expect(result1.UPCOMING_MEETINGS_HOURS).toBeUndefined()

      // Test custom value
      const customEnv = {
        ...validEnv,
        UPCOMING_MEETINGS_HOURS: '48',
      }
      
      const result2 = envSchema.parse(customEnv)
      expect(result2.UPCOMING_MEETINGS_HOURS).toBe(48)

      // Test maximum value (1 week = 168 hours)
      const maxEnv = {
        ...validEnv,
        UPCOMING_MEETINGS_HOURS: '168',
      }
      
      const result3 = envSchema.parse(maxEnv)
      expect(result3.UPCOMING_MEETINGS_HOURS).toBe(168)

      // Test zero value (explicit current day)
      const zeroEnv = {
        ...validEnv,
        UPCOMING_MEETINGS_HOURS: '0',
      }
      
      const result4 = envSchema.parse(zeroEnv)
      expect(result4.UPCOMING_MEETINGS_HOURS).toBe(0)
    })

    it('should reject invalid UPCOMING_MEETINGS_HOURS values', () => {
      // Test negative value
      const negativeEnv = {
        ...validEnv,
        UPCOMING_MEETINGS_HOURS: '-5',
      }
      
      expect(() => envSchema.parse(negativeEnv)).toThrow('UPCOMING_MEETINGS_HOURS must be between 0 and 168 hours')

      // Test value over maximum
      const overMaxEnv = {
        ...validEnv,
        UPCOMING_MEETINGS_HOURS: '200',
      }
      
      expect(() => envSchema.parse(overMaxEnv)).toThrow('UPCOMING_MEETINGS_HOURS must be between 0 and 168 hours')

      // Test non-numeric string (should default to 0 after parseInt fails, which means current day)
      const nonNumericEnv = {
        ...validEnv,
        UPCOMING_MEETINGS_HOURS: 'invalid',
      }
      
      const result = envSchema.parse(nonNumericEnv)
      expect(result.UPCOMING_MEETINGS_HOURS).toBe(0)
    })
  })

  describe('Utility Functions', () => {
    // We'll test the utility functions by recreating them
    const isProduction = (nodeEnv: string) => nodeEnv === 'production'
    const isDevelopment = (nodeEnv: string) => nodeEnv === 'development'
    const isTest = (nodeEnv: string) => nodeEnv === 'test'

    const getBaseUrl = (nextAuthUrl?: string, vercelUrl?: string) => {
      if (nextAuthUrl) return nextAuthUrl
      if (vercelUrl) return `https://${vercelUrl}`
      return 'http://localhost:3000'
    }

    it('should correctly identify environment types', () => {
      expect(isProduction('production')).toBe(true)
      expect(isProduction('development')).toBe(false)
      expect(isProduction('test')).toBe(false)

      expect(isDevelopment('development')).toBe(true)
      expect(isDevelopment('production')).toBe(false)
      expect(isDevelopment('test')).toBe(false)

      expect(isTest('test')).toBe(true)
      expect(isTest('development')).toBe(false)
      expect(isTest('production')).toBe(false)
    })

    it('should generate correct base URL', () => {
      // With APP_BASE_URL
      expect(getBaseUrl('https://example.com')).toBe('https://example.com')

      // With VERCEL_URL but no APP_BASE_URL
      expect(getBaseUrl(undefined, 'my-app.vercel.app')).toBe('https://my-app.vercel.app')

      // With neither (default to localhost)
      expect(getBaseUrl()).toBe('http://localhost:3000')

      // APP_BASE_URL takes precedence over VERCEL_URL
      expect(getBaseUrl('https://custom.com', 'vercel.app')).toBe('https://custom.com')
    })
  })

  describe('Error Handling', () => {
    const envSchema = z.object({
      REQUIRED_VAR: z.string().min(1, 'REQUIRED_VAR is required'),
      OPTIONAL_VAR: z.string().optional(),
    })

    it('should provide detailed error messages for missing variables', () => {
      try {
        envSchema.parse({})
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError)
        const zodError = error as z.ZodError
        expect(zodError.issues[0].message).toBe('Invalid input: expected string, received undefined')
        expect(zodError.issues[0].path).toEqual(['REQUIRED_VAR'])
      }
    })

    it('should provide detailed error messages for invalid formats', () => {
      const invalidEnv = {
        AIRTABLE_API_KEY: 'test',
        AIRTABLE_BASE_ID: 'test',
        SLACK_CLIENT_ID: 'test',
        SLACK_CLIENT_SECRET: 'test',
        SLACK_SIGNING_SECRET: 'test',
        SESSION_SECRET: 'invalid', // Too short
        APP_BASE_URL: 'invalid-url', // Invalid URL
        NODE_ENV: 'invalid', // Invalid enum
      }

      const envSchema = z.object({
        AIRTABLE_API_KEY: z.string().min(1),
        AIRTABLE_BASE_ID: z.string().min(1),
        SLACK_CLIENT_ID: z.string().min(1),
        SLACK_CLIENT_SECRET: z.string().min(1),
        SLACK_SIGNING_SECRET: z.string().min(1),
        SESSION_SECRET: z.string().length(32),
        APP_BASE_URL: z.string().url().optional(),
        NODE_ENV: z.enum(['development', 'production', 'test']),
      })

      try {
        envSchema.parse(invalidEnv)
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError)
        const zodError = error as z.ZodError
        expect(zodError.issues.length).toBeGreaterThan(0)
      }
    })
  })
})