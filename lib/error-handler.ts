/**
 * @fileoverview Centralized error handling system for the room booking application
 * @description Provides standardized error types, custom error classes, and utility
 * functions for consistent error handling across API routes and application logic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Standardized error types for the application
 * @description Defines all possible error categories to ensure consistent error handling
 * and proper HTTP status code mapping across the application.
 * @enum {string}
 */
export enum ErrorType {
  /** Input validation errors (400) */
  VALIDATION = 'VALIDATION_ERROR',
  /** Authentication required errors (401) */
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  /** Authorization/permission errors (403) */
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  /** Resource not found errors (404) */
  NOT_FOUND = 'NOT_FOUND',
  /** Rate limiting errors (429) */
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  /** Resource conflict errors (409) */
  CONFLICT = 'CONFLICT_ERROR',
  /** Internal server errors (500) */
  INTERNAL = 'INTERNAL_ERROR'
}

/**
 * Standard API error response interface
 * @interface ApiError
 * @description Defines the structure of error responses sent to clients
 */
export interface ApiError {
  /** The type of error that occurred */
  type: ErrorType;
  /** Human-readable error message */
  message: string;
  /** HTTP status code associated with the error */
  statusCode: number;
  /** Optional additional error details (only shown in development) */
  details?: unknown;
}

/**
 * Custom error class for application-specific errors
 * @class AppError
 * @extends Error
 * @description Provides structured error handling with error types, status codes,
 * and optional additional details for debugging purposes.
 */
export class AppError extends Error {
  /** The categorized type of error */
  public readonly type: ErrorType;
  /** HTTP status code for the error */
  public readonly statusCode: number;
  /** Optional additional error details */
  public readonly details?: unknown;

  /**
   * Creates a new AppError instance
   * @param {ErrorType} type - The category of error
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code for the error
   * @param {unknown} [details] - Optional additional error details
   */
  constructor(type: ErrorType, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

/**
 * Centralized error handler for API routes
 * @function handleApiError
 * @description Processes any error and returns a standardized NextResponse with
 * appropriate status codes and error messages. Handles Zod validation errors,
 * custom AppErrors, and unexpected errors with proper logging and security considerations.
 * @param {unknown} error - The error to handle (can be any type)
 * @returns {NextResponse} Standardized error response for the client
 */
export function handleApiError(error: unknown): NextResponse {
  // Log solo gli errori interni per sicurezza
  if (!(error instanceof AppError)) {
    console.error('Unexpected error:', error);
  }

  // Gestione errori Zod
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Invalid input data',
        type: ErrorType.VALIDATION,
        details: process.env.NODE_ENV === 'development' ? error.issues : undefined
      },
      { status: 400 }
    );
  }

  // Gestione errori personalizzati
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        type: error.type,
        details: process.env.NODE_ENV === 'development' ? error.details : undefined
      },
      { status: error.statusCode }
    );
  }

  // Errori generici - non esporre dettagli in produzione
  return NextResponse.json(
    {
      error: 'Internal server error',
      type: ErrorType.INTERNAL
    },
    { status: 500 }
  );
}

/**
 * Utility object containing factory functions for creating standardized errors
 * @description Provides convenient methods to create AppError instances for common
 * error scenarios with appropriate default messages and status codes.
 */
export const createError = {
  /**
   * Creates a validation error (400)
   * @param {string} message - Specific validation error message
   * @param {unknown} [details] - Optional validation details
   * @returns {AppError} Validation error instance
   */
  validation: (message: string, details?: unknown) =>
    new AppError(ErrorType.VALIDATION, message, 400, details),

  /**
   * Creates an authentication error (401)
   * @param {string} [message='Authentication required'] - Authentication error message
   * @returns {AppError} Authentication error instance
   */
  authentication: (message: string = 'Authentication required') =>
    new AppError(ErrorType.AUTHENTICATION, message, 401),

  /**
   * Creates an authorization error (403)
   * @param {string} [message='Insufficient permissions'] - Authorization error message
   * @returns {AppError} Authorization error instance
   */
  authorization: (message: string = 'Insufficient permissions') =>
    new AppError(ErrorType.AUTHORIZATION, message, 403),

  /**
   * Creates a not found error (404)
   * @param {string} [message='Resource not found'] - Not found error message
   * @returns {AppError} Not found error instance
   */
  notFound: (message: string = 'Resource not found') =>
    new AppError(ErrorType.NOT_FOUND, message, 404),

  /**
   * Creates a conflict error (409)
   * @param {string} [message='Resource conflict'] - Conflict error message
   * @returns {AppError} Conflict error instance
   */
  conflict: (message: string = 'Resource conflict') =>
    new AppError(ErrorType.CONFLICT, message, 409),

  /**
   * Creates a rate limit error (429)
   * @param {string} [message='Rate limit exceeded'] - Rate limit error message
   * @returns {AppError} Rate limit error instance
   */
  rateLimit: (message: string = 'Rate limit exceeded') =>
    new AppError(ErrorType.RATE_LIMIT, message, 429),

  /**
   * Creates an internal server error (500)
   * @param {string} [message='Internal server error'] - Internal error message
   * @param {unknown} [details] - Optional error details for debugging
   * @returns {AppError} Internal server error instance
   */
  internal: (message: string = 'Internal server error', details?: unknown) =>
    new AppError(ErrorType.INTERNAL, message, 500, details)
};

/**
 * Higher-order function that wraps API route handlers with error handling
 * @template T - Type of the NextRequest
 * @template U - Type of the optional context parameter
 * @param {function} handler - The API route handler function to wrap
 * @returns {function} Wrapped handler that automatically catches and handles errors
 * @description Automatically catches any errors thrown by the wrapped handler and
 * processes them through the centralized error handling system. This ensures
 * consistent error responses across all API routes.
 * @example
 * ```typescript
 * export const POST = withErrorHandler(async (request: NextRequest) => {
 *   // Your API logic here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withErrorHandler<T extends NextRequest, U = unknown>(
  handler: (request: T, context: U) => Promise<NextResponse>
) {
  return async (request: T, context: U): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}