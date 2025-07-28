/**
 * @fileoverview Environment variable validation and configuration management
 * @description Provides type-safe environment variable validation using Zod schemas,
 * ensuring all required configuration is present and properly formatted at runtime.
 */

import { z } from 'zod';

/**
 * Zod schema for validating environment variables
 * @description Defines validation rules for all environment variables used in the application,
 * including required database credentials, authentication secrets, and optional configuration.
 * Provides default values where appropriate and custom validation for security-critical values.
 */
const envSchema = z.object({
  /** Database/API Configuration */
  /** Airtable API key for database access */
  AIRTABLE_API_KEY: z.string().min(1, 'AIRTABLE_API_KEY is required'),
  /** Airtable base ID for the room booking database */
  AIRTABLE_BASE_ID: z.string().min(1, 'AIRTABLE_BASE_ID is required'),
  /** Name of the meeting rooms table in Airtable */
  AIRTABLE_MEETING_ROOMS_TABLE: z.string().default('MeetingRooms'),
  /** Name of the bookings table in Airtable */
  AIRTABLE_BOOKINGS_TABLE: z.string().default('Bookings'),

  /** Authentication Configuration */
  /** Slack OAuth client ID for authentication */
  SLACK_CLIENT_ID: z.string().min(1, 'SLACK_CLIENT_ID is required'),
  /** Slack OAuth client secret for authentication */
  SLACK_CLIENT_SECRET: z.string().min(1, 'SLACK_CLIENT_SECRET is required'),
  /** Slack signing secret for webhook verification */
  SLACK_SIGNING_SECRET: z.string().min(1, 'SLACK_SIGNING_SECRET is required'),

  /** Session Security Configuration */
  /** 256-bit secret key for JWT encryption/decryption */
  SESSION_SECRET: z.string()
    .length(32, 'SESSION_SECRET must be exactly 32 characters (256 bits)')
    .refine(
      (val) => val !== 'your-256-bit-secret-here-change-in-',
      'SESSION_SECRET must be changed from default value'
    ),
  /** Name of the HTTP-only session cookie */
  SESSION_COOKIE_NAME: z.string().default('room_booking_user'),
  /** Session duration in hours (1-168 hours, defaults to 168 = 7 days) */
  SESSION_DURATION_HOURS: z.string().default('168').transform(val => parseInt(val) || 168).refine(val => val >= 1 && val <= 168, 'SESSION_DURATION_HOURS must be between 1 and 168 hours (1 week)'),

  /** Application Configuration */
  /** Application title displayed in UI and page metadata */
  APP_TITLE: z.string().default('B4I'),
  /** Number of hours to look ahead for upcoming meetings (optional - defaults to end of current day) */
  UPCOMING_MEETINGS_HOURS: z.string().transform(val => parseInt(val) || 0).refine(val => val >= 0 && val <= 168, 'UPCOMING_MEETINGS_HOURS must be between 0 and 168 hours (1 week)').optional(),
  /** Base URL for the application (used for OAuth redirects) */
  APP_BASE_URL: z.string().url().optional(),
  /** Node.js environment mode */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  /** Calendar Integration Configuration */
  /** Token for calendar feed authentication */
  CALENDAR_FEED_TOKEN: z.string().min(1, 'CALENDAR_FEED_TOKEN is required'),

  /** Meeting Duration Configuration */
  /** Maximum number of hours a meeting can last (1-24 hours, defaults to 8 hours) */
  MAX_MEETING_HOURS: z.string().default('8').transform(val => parseInt(val) || 8).refine(val => val >= 1 && val <= 24, 'MAX_MEETING_HOURS must be between 1 and 24 hours'),

  /** Cache Configuration */
  /** Cache time for room data in seconds (defaults to 3600 = 1 hour) */
  ROOM_CACHE_TIME: z.string().default('3600').transform(val => parseInt(val) || 3600).refine(val => val >= 300 && val <= 86400 * 30, 'ROOM_CACHE_TIME must be between 300 and 86400 seconds (5 minutes to 1 month)'),

});

/**
 * TypeScript type derived from the environment schema
 * @description Provides type safety for environment variables throughout the application
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates and parses environment variables against the schema
 * @returns {Env} Validated environment variables object
 * @throws {Error} When required environment variables are missing or invalid
 * @description Performs runtime validation of environment variables to ensure
 * the application has all necessary configuration before startup. Provides
 * detailed error messages for debugging configuration issues.
 * @example
 * ```typescript
 * try {
 *   const config = validateEnv();
 *   console.log('Environment validation successful');
 * } catch (error) {
 *   console.error('Environment validation failed:', error.message);
 *   process.exit(1);
 * }
 * ```
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
      throw new Error(`Invalid environment variables:\n${missingVars}`);
    }
    throw error;
  }
}

/**
 * Validated environment variables for application use
 * @description Pre-validated environment configuration that can be safely used
 * throughout the application with full type safety guarantees.
 */
export const env = validateEnv();

/** Utility flag: true if running in production environment */
export const isProduction = env.NODE_ENV === 'production';
/** Utility flag: true if running in development environment */
export const isDevelopment = env.NODE_ENV === 'development';
/** Utility flag: true if running in test environment */
export const isTest = env.NODE_ENV === 'test';

/**
 * Gets the base URL for the application
 * @returns {string} The base URL for the current environment
 * @description Determines the correct base URL for the application based on
 * environment configuration. Priority order:
 * 1. APP_BASE_URL environment variable
 * 2. Vercel deployment URL (VERCEL_URL)
 * 3. Local development fallback (localhost:3000)
 * @example
 * ```typescript
 * const baseUrl = getBaseUrl();
 * const callbackUrl = `${baseUrl}/api/auth/callback`;
 * ```
 */
export function getBaseUrl(): string {
  if (env.APP_BASE_URL) return env.APP_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}