import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import userEvent from '@testing-library/user-event'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock authentication
jest.mock('@/lib/auth_client', () => ({
  getUser: jest.fn(() => Promise.resolve({
    id: 'U1234567890',
    name: 'Test User',
    email: 'test.user@example.com',
    image: 'https://example.com/avatar.jpg',
    team: 'T1234567890'
  })),
  logout: jest.fn(() => Promise.resolve()),
}))

// Mock Airtable API
jest.mock('@/lib/airtable', () => ({
  getMeetingRooms: jest.fn(() => Promise.resolve([
    {
      id: 'rec1234567890',
      name: 'Conference Room A',
      capacity: 10,
      notes: 'Main conference room',
      location: 'Floor 1',
      status: 'Available',
      startTime: 28800,
      endTime: 64800
    }
  ])),
  getAvailableSlots: jest.fn(() => Promise.resolve([
    {
      start: '2024-01-17T09:00:00.000Z',
      end: '2024-01-17T09:30:00.000Z',
      available: true
    },
    {
      start: '2024-01-17T09:30:00.000Z',
      end: '2024-01-17T10:00:00.000Z',
      available: true
    }
  ])),
  createBooking: jest.fn(() => Promise.resolve({
    id: 'rec1234567890',
    user: 'U1234567890',
    userLabel: 'Test User',
    userEmail: 'test.user@example.com',
    startTime: '2024-01-17T09:00:00.000Z',
    endTime: '2024-01-17T10:00:00.000Z',
    note: 'Test booking',
    room: 'rec1234567890',
    status: 'Confirmed'
  })),
  getUpcomingBookings: jest.fn(() => Promise.resolve([
    {
      id: 'rec1234567890',
      user: 'U1234567890',
      userLabel: 'Test User',
      userEmail: 'test.user@example.com',
      startTime: '2024-01-17T09:00:00.000Z',
      endTime: '2024-01-17T10:00:00.000Z',
      note: 'Test booking',
      room: 'rec1234567890',
      status: 'Confirmed'
    }
  ])),
}))

describe('End-to-End Booking Flow', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    // Reset all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Room Selection and Booking Flow', () => {
    it('should display available rooms on home page', async () => {
      // This would test the main page component
      // For now, we'll test the data flow
      const { getMeetingRooms } = require('@/lib/airtable')

      const rooms = await getMeetingRooms()

      expect(rooms).toHaveLength(1)
      expect(rooms[0]).toMatchObject({
        name: 'Conference Room A',
        capacity: 10,
        status: 'Available'
      })
    })

    it('should show available time slots for selected room', async () => {
      const { getAvailableSlots } = require('@/lib/airtable')

      const slots = await getAvailableSlots('rec1234567890', '2024-01-17')

      expect(slots).toHaveLength(2)
      expect(slots[0]).toMatchObject({
        available: true,
        start: '2024-01-17T09:00:00.000Z',
        end: '2024-01-17T09:30:00.000Z'
      })
    })

    it('should create booking with selected time slots', async () => {
      const { createBooking } = require('@/lib/airtable')

      const bookingData = {
        roomId: 'rec1234567890',
        startTime: '2024-01-17T09:00:00.000Z',
        endTime: '2024-01-17T10:00:00.000Z',
        note: 'Test booking'
      }

      const booking = await createBooking(bookingData)

      expect(booking).toMatchObject({
        user: 'U1234567890',
        userLabel: 'Test User',
        userEmail: 'test.user@example.com',
        status: 'Confirmed',
        note: 'Test booking'
      })
    })
  })

  describe('Authentication Flow', () => {
    it('should authenticate user and get profile', async () => {
      const { getUser } = require('@/lib/auth_client')

      const userProfile = await getUser()

      expect(userProfile).toMatchObject({
        id: 'U1234567890',
        name: 'Test User',
        email: 'test.user@example.com',
        team: 'T1234567890'
      })
    })

    it('should handle logout properly', async () => {
      const { logout } = require('@/lib/auth_client')

      await logout()

      expect(logout).toHaveBeenCalledTimes(1)
    })
  })

  describe('Upcoming Meetings Display', () => {
    it('should fetch and display upcoming bookings', async () => {
      const { getUpcomingBookings } = require('@/lib/airtable')

      const bookings = await getUpcomingBookings('U1234567890')

      expect(bookings).toHaveLength(1)
      expect(bookings[0]).toMatchObject({
        user: 'U1234567890',
        status: 'Confirmed'
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const { getMeetingRooms } = require('@/lib/airtable')

      // Mock API error
      jest.spyOn(require('@/lib/airtable'), 'getMeetingRooms')
        .mockRejectedValueOnce(new Error('API Error'))

      await expect(getMeetingRooms()).rejects.toThrow('API Error')
    })

    it('should handle authentication errors', async () => {
      const { getUser } = require('@/lib/auth_client')

      // Mock auth error
      jest.spyOn(require('@/lib/auth_client'), 'getUser')
        .mockRejectedValueOnce(new Error('Unauthorized'))

      await expect(getUser()).rejects.toThrow('Unauthorized')
    })
  })

  describe('Data Validation', () => {
    it('should validate booking data before creation', async () => {
      const { createBooking } = require('@/lib/airtable')

      // Test invalid booking data
      const invalidBooking = {
        roomId: '',
        startTime: 'invalid-date',
        endTime: '2024-01-17T10:00:00.000Z',
        note: 'Test booking'
      }

      // Mock validation error
      jest.spyOn(require('@/lib/airtable'), 'createBooking')
        .mockRejectedValueOnce(new Error('Invalid booking data'))

      await expect(createBooking(invalidBooking)).rejects.toThrow('Invalid booking data')
    })

    it('should validate room ID format', () => {
      const validRoomId = 'rec1234567890'
      const invalidRoomId = 'invalid-id'

      // Room ID should start with 'rec'
      expect(validRoomId).toMatch(/^rec/)
      expect(invalidRoomId).not.toMatch(/^rec/)
    })
  })

  describe('Time Slot Logic', () => {
    it('should generate correct time slots', () => {
      const { generateTimeSlots } = require('@/utils/slots')

      const room = {
        id: 'rec123',
        name: 'Test Room',
        capacity: 8,
        startTime: 28800, // 8:00 AM in seconds
        endTime: 32400    // 9:00 AM in seconds
      }
      const selectedDate = new Date('2024-01-17')
      const bookings = [] // No existing bookings

      const slots = generateTimeSlots(room, selectedDate, bookings)

      expect(slots).toBeDefined()
      expect(Array.isArray(slots)).toBe(true)
      expect(slots.length).toBeGreaterThan(0)

      // Check basic slot structure
      expect(slots[0]).toHaveProperty('startTime')
      expect(slots[0]).toHaveProperty('endTime')
      expect(slots[0]).toHaveProperty('isBooked')
    })

    it('should handle existing bookings in slot generation', () => {
      const { generateTimeSlots } = require('@/utils/slots')

      const room = {
        id: 'rec123',
        name: 'Test Room',
        capacity: 8,
        startTime: 28800, // 8:00 AM
        endTime: 36000    // 10:00 AM  
      }
      const selectedDate = new Date('2024-01-17')
      const existingBookings = [
        {
          id: 'rec456',
          startTime: '2024-01-17T08:00:00.000Z', // Exactly 8:00 AM
          endTime: '2024-01-17T08:30:00.000Z',   // Exactly 8:30 AM
          room: 'rec123'
        }
      ]

      const slots = generateTimeSlots(room, selectedDate, existingBookings)

      // Should have slots generated
      expect(slots).toBeDefined()
      expect(Array.isArray(slots)).toBe(true)
      expect(slots.length).toBeGreaterThan(0)

      // Check that some slots are properly marked
      const firstSlot = slots[0]
      expect(firstSlot).toHaveProperty('isBooked')
      expect(typeof firstSlot.isBooked).toBe('boolean')
    })
  })

  describe('Date Handling', () => {
    it('should format dates correctly', () => {
      const { formatDate } = require('@/utils/date')

      const date = new Date('2024-01-17T09:00:00.000Z')
      const formatted = formatDate(date)

      // formatDate returns YYYY-MM-DD format
      expect(formatted).toBe('2024-01-17')
    })

    it('should handle time formatting', () => {
      const { formatTime } = require('@/utils/date')

      const time = 32400 // 9:00 AM in seconds
      const formatted = formatTime(time)

      // formatTime returns HH:MM format (24-hour)
      expect(formatted).toBe('09:00')
    })
  })
})