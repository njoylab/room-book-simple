import { NextRequest } from 'next/server'
import { GET } from '../rooms/route'

// Mock the Airtable dependency
jest.mock('@/lib/airtable', () => ({
  getMeetingRooms: jest.fn(),
}))

import { getMeetingRooms } from '@/lib/airtable'

describe('/api/rooms', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/rooms', () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/rooms')

    it('should return rooms successfully', async () => {
      const mockRooms = [
        {
          id: 'room1',
          name: 'Conference Room A',
          capacity: 10,
          notes: 'Whiteboard available',
          location: 'First Floor',
          status: 'Active',
          startTime: 28800, // 8:00 AM
          endTime: 64800,   // 6:00 PM
        },
        {
          id: 'room2',
          name: 'Meeting Room B',
          capacity: 6,
          notes: 'Video conferencing setup',
          location: 'Second Floor',
          status: 'Active',
          startTime: 32400, // 9:00 AM
          endTime: 61200,   // 5:00 PM
        },
        {
          id: 'room3',
          name: 'Small Meeting Room',
          capacity: 4,
          location: 'Third Floor',
          status: 'Active',
          startTime: 28800,
          endTime: 64800,
        },
      ]

        ; (getMeetingRooms as jest.Mock).mockResolvedValue(mockRooms)

      const response = await GET(mockRequest)

      expect(getMeetingRooms).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toEqual(mockRooms)
    })

    it('should return empty array when no rooms exist', async () => {
      ; (getMeetingRooms as jest.Mock).mockResolvedValue([])

      const response = await GET(mockRequest)

      expect(getMeetingRooms).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toEqual([])
    })

    it('should handle database connection errors', async () => {
      ; (getMeetingRooms as jest.Mock).mockResolvedValue(null)

      const response = await GET(mockRequest)

      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
      expect(responseData).toHaveProperty('type', 'INTERNAL_ERROR')
    })

    it('should handle Airtable API errors', async () => {
      const airtableError = new Error('Invalid API key')
      airtableError.name = 'AUTHENTICATION_ERROR'

        ; (getMeetingRooms as jest.Mock).mockRejectedValue(airtableError)

      const response = await GET(mockRequest)

      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error', 'Internal server error')
      expect(responseData).toHaveProperty('type', 'INTERNAL_ERROR')
    })

    it('should handle rate limiting errors from Airtable', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.name = 'RATE_LIMIT_ERROR'

        ; (getMeetingRooms as jest.Mock).mockRejectedValue(rateLimitError)

      const response = await GET(mockRequest)

      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error', 'Internal server error')
      expect(responseData).toHaveProperty('type', 'INTERNAL_ERROR')
    })

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TIMEOUT_ERROR'

        ; (getMeetingRooms as jest.Mock).mockRejectedValue(timeoutError)

      const response = await GET(mockRequest)

      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error', 'Internal server error')
      expect(responseData).toHaveProperty('type', 'INTERNAL_ERROR')
    })

    it('should handle malformed data from Airtable', async () => {
      ; (getMeetingRooms as jest.Mock).mockResolvedValue(null)

      const response = await GET(mockRequest)

      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
      expect(responseData).toHaveProperty('type', 'INTERNAL_ERROR')
    })

    it('should maintain consistent response structure', async () => {
      const mockRoomsWithMinimalData = [
        {
          id: 'minimal-room',
          name: 'Minimal Room',
          capacity: 2,
          startTime: 28800,
          endTime: 64800,
          // Missing optional fields: notes, location, status
        },
      ]

        ; (getMeetingRooms as jest.Mock).mockResolvedValue(mockRoomsWithMinimalData)

      const response = await GET(mockRequest)

      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData).toEqual(mockRoomsWithMinimalData)

      // Verify the response structure
      expect(Array.isArray(responseData)).toBe(true)
      expect(responseData[0]).toHaveProperty('id')
      expect(responseData[0]).toHaveProperty('name')
      expect(responseData[0]).toHaveProperty('capacity')
      expect(responseData[0]).toHaveProperty('startTime')
      expect(responseData[0]).toHaveProperty('endTime')
    })

    it('should handle very large number of rooms', async () => {
      // Create a large array of rooms to test performance
      const manyRooms = Array.from({ length: 1000 }, (_, index) => ({
        id: `room${index + 1}`,
        name: `Room ${index + 1}`,
        capacity: (index % 20) + 1,
        startTime: 28800,
        endTime: 64800,
        status: 'Active',
      }))

        ; (getMeetingRooms as jest.Mock).mockResolvedValue(manyRooms)

      const response = await GET(mockRequest)

      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData).toHaveLength(1000)
      expect(responseData[0].id).toBe('room1')
      expect(responseData[999].id).toBe('room1000')
    })

    it('should handle rooms with special characters in names', async () => {
      const roomsWithSpecialChars = [
        {
          id: 'room1',
          name: 'Conference Room "A" & Meeting Space',
          capacity: 10,
          notes: 'Room with <HTML> tags & special chars: @#$%^&*()',
          location: 'Floor 1 - Section A/B',
          startTime: 28800,
          endTime: 64800,
        },
        {
          id: 'room2',
          name: 'Café Meeting Room ñ',
          capacity: 6,
          notes: 'Échappé français characters: àáâãäåæçèéêë',
          location: '2nd Floor → West Wing',
          startTime: 28800,
          endTime: 64800,
        },
      ]

        ; (getMeetingRooms as jest.Mock).mockResolvedValue(roomsWithSpecialChars)

      const response = await GET(mockRequest)

      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData).toEqual(roomsWithSpecialChars)

      // Verify special characters are preserved
      expect(responseData[0].name).toContain('"A"')
      expect(responseData[0].notes).toContain('<HTML>')
      expect(responseData[1].name).toContain('ñ')
      expect(responseData[1].notes).toContain('àáâãäåæçèéêë')
    })
  })
})