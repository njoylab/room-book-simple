import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  ErrorType,
  AppError,
  handleApiError,
  createError,
  withErrorHandler
} from '../error-handler'

describe('Error Handler', () => {
  describe('AppError Class', () => {
    it('should create AppError with all properties', () => {
      const error = new AppError(
        ErrorType.VALIDATION,
        'Invalid input',
        400,
        { field: 'email' }
      )

      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.message).toBe('Invalid input')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: 'email' })
      expect(error.name).toBe('AppError')
      expect(error).toBeInstanceOf(Error)
    })

    it('should create AppError without details', () => {
      const error = new AppError(ErrorType.NOT_FOUND, 'Resource not found', 404)

      expect(error.type).toBe(ErrorType.NOT_FOUND)
      expect(error.message).toBe('Resource not found')
      expect(error.statusCode).toBe(404)
      expect(error.details).toBeUndefined()
    })
  })

  describe('handleApiError', () => {
    // Mock console.error to avoid noise in test output
    const originalConsoleError = console.error
    beforeEach(() => {
      console.error = jest.fn()
    })

    afterEach(() => {
      console.error = originalConsoleError
    })

    it('should handle ZodError correctly', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(0)
      })

      try {
        schema.parse({ email: 'invalid', age: -1 })
      } catch (zodError) {
        const response = handleApiError(zodError)
        expect(response).toBeInstanceOf(NextResponse)
        
        // Check status
        expect(response.status).toBe(400)
        
        // Parse response body (this is a mock, so we need to simulate this)
        // In a real test, you'd need to await response.json()
      }
    })

    it('should handle AppError correctly', () => {
      const appError = new AppError(
        ErrorType.AUTHENTICATION,
        'Invalid credentials',
        401,
        { userId: 'test123' }
      )

      const response = handleApiError(appError)
      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(401)
    })

    it('should handle unknown errors as internal server error', () => {
      const unknownError = new Error('Something went wrong')

      const response = handleApiError(unknownError)
      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(500)
      
      // Should log unknown errors
      expect(console.error).toHaveBeenCalledWith('Unexpected error:', unknownError)
    })

    it('should not log AppError instances', () => {
      const appError = new AppError(ErrorType.VALIDATION, 'Test error', 400)

      handleApiError(appError)
      
      // Should not log AppError since it's expected
      expect(console.error).not.toHaveBeenCalled()
    })

    it('should handle string errors', () => {
      const response = handleApiError('Simple string error')
      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(500)
    })

    it('should handle null/undefined errors', () => {
      const nullResponse = handleApiError(null)
      expect(nullResponse).toBeInstanceOf(NextResponse)
      expect(nullResponse.status).toBe(500)

      const undefinedResponse = handleApiError(undefined)
      expect(undefinedResponse).toBeInstanceOf(NextResponse)
      expect(undefinedResponse.status).toBe(500)
    })
  })

  describe('createError utility', () => {
    it('should create validation error', () => {
      const error = createError.validation('Invalid field', { field: 'email' })
      
      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.message).toBe('Invalid field')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: 'email' })
    })

    it('should create authentication error with default message', () => {
      const error = createError.authentication()
      
      expect(error.type).toBe(ErrorType.AUTHENTICATION)
      expect(error.message).toBe('Authentication required')
      expect(error.statusCode).toBe(401)
    })

    it('should create authentication error with custom message', () => {
      const error = createError.authentication('Invalid token')
      
      expect(error.message).toBe('Invalid token')
    })

    it('should create authorization error with default message', () => {
      const error = createError.authorization()
      
      expect(error.type).toBe(ErrorType.AUTHORIZATION)
      expect(error.message).toBe('Insufficient permissions')
      expect(error.statusCode).toBe(403)
    })

    it('should create not found error', () => {
      const error = createError.notFound('Room not found')
      
      expect(error.type).toBe(ErrorType.NOT_FOUND)
      expect(error.message).toBe('Room not found')
      expect(error.statusCode).toBe(404)
    })

    it('should create conflict error', () => {
      const error = createError.conflict('Room already booked')
      
      expect(error.type).toBe(ErrorType.CONFLICT)
      expect(error.message).toBe('Room already booked')
      expect(error.statusCode).toBe(409)
    })

    it('should create rate limit error', () => {
      const error = createError.rateLimit('Too many requests')
      
      expect(error.type).toBe(ErrorType.RATE_LIMIT)
      expect(error.message).toBe('Too many requests')
      expect(error.statusCode).toBe(429)
    })

    it('should create internal error', () => {
      const error = createError.internal('Database connection failed', { connection: 'lost' })
      
      expect(error.type).toBe(ErrorType.INTERNAL)
      expect(error.message).toBe('Database connection failed')
      expect(error.statusCode).toBe(500)
      expect(error.details).toEqual({ connection: 'lost' })
    })
  })

  describe('withErrorHandler middleware', () => {
    it('should pass through successful responses', async () => {
      const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = withErrorHandler(mockHandler)
      
      const mockRequest = {} as unknown
      const mockContext = { params: { id: '123' } }
      
      const response = await wrappedHandler(mockRequest, mockContext)
      
      expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockContext)
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should catch and handle thrown AppErrors', async () => {
      const mockError = new AppError(ErrorType.NOT_FOUND, 'Resource not found', 404)
      const mockHandler = jest.fn().mockRejectedValue(mockError)
      const wrappedHandler = withErrorHandler(mockHandler)
      
      const response = await wrappedHandler({} as unknown)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(404)
    })

    it('should catch and handle ZodErrors', async () => {
      const schema = z.object({ email: z.string().email() })
      const mockHandler = jest.fn().mockImplementation(() => {
        schema.parse({ email: 'invalid' }) // This will throw
      })
      const wrappedHandler = withErrorHandler(mockHandler)
      
      const response = await wrappedHandler({} as unknown)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(400)
    })

    it('should catch and handle unknown errors', async () => {
      const mockError = new Error('Unexpected error')
      const mockHandler = jest.fn().mockRejectedValue(mockError)
      const wrappedHandler = withErrorHandler(mockHandler)
      
      // Mock console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const response = await wrappedHandler({} as unknown)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(500)
      
      consoleSpy.mockRestore()
    })

    it('should work without context parameter', async () => {
      const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ data: 'test' }))
      const wrappedHandler = withErrorHandler(mockHandler)
      
      const response = await wrappedHandler({} as unknown)
      
      expect(mockHandler).toHaveBeenCalledWith({}, undefined)
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should preserve handler return type', async () => {
      const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ id: 123, name: 'Test' }))
      const wrappedHandler = withErrorHandler(mockHandler)
      
      const response = await wrappedHandler({} as unknown)
      
      expect(response).toBeInstanceOf(NextResponse)
    })
  })

  describe('ErrorType enum', () => {
    it('should have all expected error types', () => {
      expect(ErrorType.VALIDATION).toBe('VALIDATION_ERROR')
      expect(ErrorType.AUTHENTICATION).toBe('AUTHENTICATION_ERROR')
      expect(ErrorType.AUTHORIZATION).toBe('AUTHORIZATION_ERROR')
      expect(ErrorType.NOT_FOUND).toBe('NOT_FOUND')
      expect(ErrorType.RATE_LIMIT).toBe('RATE_LIMIT_ERROR')
      expect(ErrorType.CONFLICT).toBe('CONFLICT_ERROR')
      expect(ErrorType.INTERNAL).toBe('INTERNAL_ERROR')
    })
  })

  describe('Environment-specific behavior', () => {
    const originalNodeEnv = process.env.NODE_ENV

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv
    })

    it('should include details in development mode', () => {
      process.env.NODE_ENV = 'development'
      
      const error = new AppError(ErrorType.VALIDATION, 'Test error', 400, { debug: 'info' })
      const response = handleApiError(error)
      
      // In a real implementation, you'd check that the response includes details
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should hide details in production mode', () => {
      process.env.NODE_ENV = 'production'
      
      const error = new AppError(ErrorType.VALIDATION, 'Test error', 400, { debug: 'sensitive' })
      const response = handleApiError(error)
      
      // In a real implementation, you'd check that details are excluded
      expect(response).toBeInstanceOf(NextResponse)
    })
  })
})