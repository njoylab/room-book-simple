import { NextRequest } from 'next/server'
import { GET, POST } from '../bookings/route'

// Mock the dependencies
jest.mock('@/lib/airtable', () => ({
  checkBookingConflict: jest.fn(),
  createBooking: jest.fn(),
  getBookings: jest.fn(),
}))

jest.mock('@/lib/auth_server', () => ({
  getServerUser: jest.fn(),
}))

jest.mock('@/lib/validation', () => ({
  checkRateLimit: jest.fn(),
  createBookingSchema: {
    parse: jest.fn(),
  },
  validateAndSanitize: jest.fn(),
}))

import { checkBookingConflict, createBooking, getBookings } from '@/lib/airtable'
import { getServerUser } from '@/lib/auth_server'
import { checkRateLimit, validateAndSanitize } from '@/lib/validation'

describe('/api/bookings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/bookings', () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/bookings')

    it('should return bookings successfully', async () => {
      const mockBookings = [
        {
          id: 'booking1',
          userLabel: 'John Doe',
          user: 'user1',
          startTime: '2024-01-15T10:00:00.000Z',
          endTime: '2024-01-15T11:00:00.000Z',
          room: 'room1',
          status: 'Confirmed',
        },
        {
          id: 'booking2',
          userLabel: 'Jane Smith',
          user: 'user2',
          startTime: '2024-01-15T14:00:00.000Z',
          endTime: '2024-01-15T15:00:00.000Z',
          room: 'room2',
          status: 'Confirmed',
        },
      ]

      ;(getBookings as jest.Mock).mockResolvedValue(mockBookings)

      const response = await GET(mockRequest)

      expect(getBookings).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData).toEqual(mockBookings)
    })

    it('should handle database errors', async () => {
      ;(getBookings as jest.Mock).mockResolvedValue(null)

      const response = await GET(mockRequest)

      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
      expect(responseData).toHaveProperty('type', 'INTERNAL_ERROR')
    })
  })

  describe('POST /api/bookings', () => {
    const mockUser = {
      id: 'user123',
      name: 'John Doe',
      image: 'https://example.com/avatar.jpg',
      team: 'Engineering',
    }

    const validBookingData = {
      roomId: 'recABCDEFGHIJKLMNOP',
      startTime: '2024-06-15T10:00:00.000Z',
      endTime: '2024-06-15T11:00:00.000Z',
      note: 'Team meeting',
    }

    const mockCookies = new Map()
    mockCookies.set('auth-token', 'valid-token')

    it('should create booking successfully', async () => {
      ;(getServerUser as jest.Mock).mockResolvedValue(mockUser)
      ;(checkRateLimit as jest.Mock).mockReturnValue(true)
      ;(validateAndSanitize as jest.Mock).mockReturnValue(validBookingData)
      ;(checkBookingConflict as jest.Mock).mockResolvedValue(false)
      
      const mockCreatedBooking = {
        id: 'booking123',
        ...validBookingData,
        userLabel: mockUser.name,
        user: mockUser.id,
      }
      ;(createBooking as jest.Mock).mockResolvedValue(mockCreatedBooking)

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        body: JSON.stringify(validBookingData),
      })
      
      // Mock cookies
      Object.defineProperty(request, 'cookies', {
        value: mockCookies,
      })

      const response = await POST(request)

      expect(getServerUser).toHaveBeenCalledWith(mockCookies)
      expect(checkRateLimit).toHaveBeenCalledWith('booking_user123_127.0.0.1', 10, 60000)
      expect(validateAndSanitize).toHaveBeenCalled()
      expect(checkBookingConflict).toHaveBeenCalledWith(
        validBookingData.roomId,
        validBookingData.startTime,
        validBookingData.endTime
      )
      expect(createBooking).toHaveBeenCalledWith({
        roomId: validBookingData.roomId,
        userId: mockUser.id,
        userLabel: mockUser.name,
        startTime: validBookingData.startTime,
        endTime: validBookingData.endTime,
        note: validBookingData.note,
      })

      expect(response.status).toBe(201)
      const responseData = await response.json()
      expect(responseData).toEqual(mockCreatedBooking)
    })

    it('should return 401 when user is not authenticated', async () => {
      ;(getServerUser as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validBookingData),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error', 'Authentication required')
      expect(responseData).toHaveProperty('type', 'AUTHENTICATION_ERROR')
    })

    it('should return 429 when rate limit is exceeded', async () => {
      ;(getServerUser as jest.Mock).mockResolvedValue(mockUser)
      ;(checkRateLimit as jest.Mock).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        body: JSON.stringify(validBookingData),
      })

      Object.defineProperty(request, 'cookies', {
        value: mockCookies,
      })

      const response = await POST(request)

      expect(response.status).toBe(429)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error', 'Rate limit exceeded')
      expect(responseData).toHaveProperty('type', 'RATE_LIMIT_ERROR')
    })

    it('should return 400 for invalid input data', async () => {
      const { ZodError } = await import('zod')
      ;(getServerUser as jest.Mock).mockResolvedValue(mockUser)
      ;(checkRateLimit as jest.Mock).mockReturnValue(true)
      ;(validateAndSanitize as jest.Mock).mockImplementation(() => {
        throw new ZodError([])
      })

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        body: JSON.stringify({ invalid: 'data' }),
      })

      Object.defineProperty(request, 'cookies', {
        value: mockCookies,
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error', 'Invalid input data')
      expect(responseData).toHaveProperty('type', 'VALIDATION_ERROR')
    })

    it('should return 409 when booking conflicts with existing booking', async () => {
      ;(getServerUser as jest.Mock).mockResolvedValue(mockUser)
      ;(checkRateLimit as jest.Mock).mockReturnValue(true)
      ;(validateAndSanitize as jest.Mock).mockReturnValue(validBookingData)
      ;(checkBookingConflict as jest.Mock).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        body: JSON.stringify(validBookingData),
      })

      Object.defineProperty(request, 'cookies', {
        value: mockCookies,
      })

      const response = await POST(request)

      expect(response.status).toBe(409)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error', 'Room is already booked for this time slot')
      expect(responseData).toHaveProperty('type', 'CONFLICT_ERROR')
    })

    it('should handle missing IP address in headers', async () => {
      ;(getServerUser as jest.Mock).mockResolvedValue(mockUser)
      ;(checkRateLimit as jest.Mock).mockReturnValue(true)
      ;(validateAndSanitize as jest.Mock).mockReturnValue(validBookingData)
      ;(checkBookingConflict as jest.Mock).mockResolvedValue(false)
      ;(createBooking as jest.Mock).mockResolvedValue({ id: 'booking123' })

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validBookingData),
      })

      Object.defineProperty(request, 'cookies', {
        value: mockCookies,
      })

      const response = await POST(request)

      expect(checkRateLimit).toHaveBeenCalledWith('booking_user123_unknown', 10, 60000)
      expect(response.status).toBe(201)
    })

    it('should handle database errors during booking creation', async () => {
      ;(getServerUser as jest.Mock).mockResolvedValue(mockUser)
      ;(checkRateLimit as jest.Mock).mockReturnValue(true)
      ;(validateAndSanitize as jest.Mock).mockReturnValue(validBookingData)
      ;(checkBookingConflict as jest.Mock).mockResolvedValue(false)
      ;(createBooking as jest.Mock).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        body: JSON.stringify(validBookingData),
      })

      Object.defineProperty(request, 'cookies', {
        value: mockCookies,
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error', 'Internal server error')
      expect(responseData).toHaveProperty('type', 'INTERNAL_ERROR')
    })

    it('should handle malformed JSON in request body', async () => {
      ;(getServerUser as jest.Mock).mockResolvedValue(mockUser)
      ;(checkRateLimit as jest.Mock).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        body: 'invalid json{',
      })

      Object.defineProperty(request, 'cookies', {
        value: mockCookies,
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should use x-real-ip header when x-forwarded-for is not present', async () => {
      ;(getServerUser as jest.Mock).mockResolvedValue(mockUser)
      ;(checkRateLimit as jest.Mock).mockReturnValue(true)
      ;(validateAndSanitize as jest.Mock).mockReturnValue(validBookingData)
      ;(checkBookingConflict as jest.Mock).mockResolvedValue(false)
      ;(createBooking as jest.Mock).mockResolvedValue({ id: 'booking123' })

      const request = new NextRequest('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-real-ip': '192.168.1.1',
        },
        body: JSON.stringify(validBookingData),
      })

      Object.defineProperty(request, 'cookies', {
        value: mockCookies,
      })

      const response = await POST(request)

      expect(checkRateLimit).toHaveBeenCalledWith('booking_user123_192.168.1.1', 10, 60000)
      expect(response.status).toBe(201)
    })
  })
})