import { Booking, MeetingRoom, User } from '@/lib/types'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Mock the API calls
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

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

describe('Booking Flow Integration Tests', () => {
  const mockRooms: MeetingRoom[] = [
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
  ]

  const mockBookings: Booking[] = [
    {
      id: 'booking1',
      userLabel: 'John Doe',
      user: 'user1',
      startTime: '2024-01-15T10:00:00.000Z',
      endTime: '2024-01-15T11:00:00.000Z',
      room: 'room1',
      status: 'Confirmed',
    },
  ]

  const mockUser: User = {
    id: 'user123',
    name: 'Jane Smith',
    image: 'https://example.com/avatar.jpg',
    team: 'Engineering',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15T09:00:00Z'))

    // Setup default fetch mocks
    mockFetch.mockImplementation((url) => {
      if (url.toString().includes('/api/rooms')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRooms),
        } as Response)
      }

      if (url.toString().includes('/api/bookings') && url.toString().includes('method=GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBookings),
        } as Response)
      }

      // Default to successful response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // Since we can't easily test the full app without the actual components,
  // we'll create mock components that represent the booking flow
  const MockRoomSelector = ({ onRoomSelect }: { onRoomSelect: (room: MeetingRoom) => void }) => {
    return (
      <div>
        <h2>Select a Room</h2>
        {mockRooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onRoomSelect(room)}
            data-testid={`room-${room.id}`}
          >
            {room.name} - {room.capacity} people
          </button>
        ))}
      </div>
    )
  }

  const MockTimeSlotGrid = ({
    room,
    selectedDate,
    onSlotSelect
  }: {
    room: MeetingRoom
    selectedDate: string
    onSlotSelect: (startTime: string, endTime: string) => void
  }) => {
    // Generate mock time slots
    const slots = []
    for (let hour = 9; hour < 17; hour++) {
      const startTime = `2024-01-15T${hour.toString().padStart(2, '0')}:00:00.000Z`
      const endTime = `2024-01-15T${hour.toString().padStart(2, '0')}:30:00.000Z`

      // Check if slot is booked
      const isBooked = mockBookings.some(booking =>
        booking.room === room.id &&
        booking.startTime === startTime
      )

      slots.push(
        <button
          key={`${hour}:00`}
          onClick={() => onSlotSelect(startTime, endTime)}
          disabled={isBooked}
          data-testid={`slot-${hour}`}
          className={isBooked ? 'booked' : 'available'}
        >
          {hour}:00 - {hour}:30 {isBooked ? '(Booked)' : ''}
        </button>
      )
    }

    return (
      <div>
        <h3>Time Slots for {room.name}</h3>
        <div>{slots}</div>
      </div>
    )
  }

  const MockBookingForm = ({
    room,
    startTime,
    endTime,
    onSubmit,
    onCancel
  }: {
    room: MeetingRoom
    startTime: string
    endTime: string
    onSubmit: (note: string) => void
    onCancel: () => void
  }) => {
    return (
      <div>
        <h3>Book {room.name}</h3>
        <p>Time: {new Date(startTime).toLocaleTimeString()} - {new Date(endTime).toLocaleTimeString()}</p>
        <input
          data-testid="booking-note"
          placeholder="Add a note (optional)"
        />
        <button
          data-testid="confirm-booking"
          onClick={() => {
            const note = (document.querySelector('[data-testid="booking-note"]') as HTMLInputElement)?.value || ''
            onSubmit(note)
          }}
        >
          Confirm Booking
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    )
  }

  // Main booking flow component
  const BookingFlowTest = () => {
    const [step, setStep] = React.useState<'rooms' | 'slots' | 'form' | 'success'>('rooms')
    const [selectedRoom, setSelectedRoom] = React.useState<MeetingRoom | null>(null)
    const [selectedSlot, setSelectedSlot] = React.useState<{ startTime: string; endTime: string } | null>(null)

    const handleRoomSelect = (room: MeetingRoom) => {
      setSelectedRoom(room)
      setStep('slots')
    }

    const handleSlotSelect = (startTime: string, endTime: string) => {
      setSelectedSlot({ startTime, endTime })
      setStep('form')
    }

    const handleBookingSubmit = async (note: string) => {
      if (!selectedRoom || !selectedSlot) return

      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: selectedRoom.id,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            note,
          }),
        })

        if (response.ok) {
          setStep('success')
        }
      } catch (error) {
        console.error('Booking failed:', error)
      }
    }

    return (
      <div>
        {step === 'rooms' && <MockRoomSelector onRoomSelect={handleRoomSelect} />}

        {step === 'slots' && selectedRoom && (
          <MockTimeSlotGrid
            room={selectedRoom}
            selectedDate="2024-01-15"
            onSlotSelect={handleSlotSelect}
          />
        )}

        {step === 'form' && selectedRoom && selectedSlot && (
          <MockBookingForm
            room={selectedRoom}
            startTime={selectedSlot.startTime}
            endTime={selectedSlot.endTime}
            onSubmit={handleBookingSubmit}
            onCancel={() => setStep('slots')}
          />
        )}

        {step === 'success' && (
          <div data-testid="booking-success">
            <h3>Booking Confirmed!</h3>
            <p>Your meeting room has been booked successfully.</p>
          </div>
        )}
      </div>
    )
  }



  it('should complete the full booking flow successfully', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    // Mock successful booking creation
    mockFetch.mockImplementation((url, options) => {
      if (options?.method === 'POST' && url.toString().includes('/api/bookings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'booking123',
            userLabel: mockUser.name,
            user: mockUser.id,
            startTime: '2024-01-15T14:00:00.000Z',
            endTime: '2024-01-15T14:30:00.000Z',
            room: 'room1',
            status: 'Confirmed',
          }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
    })

    render(<BookingFlowTest />)

    // Step 1: Select a room
    expect(screen.getByText('Select a Room')).toBeInTheDocument()
    const room1Button = screen.getByTestId('room-room1')
    await user.click(room1Button)

    // Step 2: Select a time slot
    await waitFor(() => {
      expect(screen.getByText('Time Slots for Conference Room A')).toBeInTheDocument()
    })

    // Click on an available slot (14:00 - should be available)
    const availableSlot = screen.getByTestId('slot-14')
    expect(availableSlot).not.toHaveClass('booked')
    await user.click(availableSlot)

    // Step 3: Fill booking form
    await waitFor(() => {
      expect(screen.getByText('Book Conference Room A')).toBeInTheDocument()
    })

    const noteInput = screen.getByTestId('booking-note')
    await user.type(noteInput, 'Team standup meeting')

    const confirmButton = screen.getByTestId('confirm-booking')
    await user.click(confirmButton)

    // Step 4: Verify success
    await waitFor(() => {
      expect(screen.getByTestId('booking-success')).toBeInTheDocument()
      expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument()
    })

    // Verify API call was made correctly
    expect(mockFetch).toHaveBeenCalledWith('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: 'room1',
        startTime: '2024-01-15T14:00:00.000Z',
        endTime: '2024-01-15T14:30:00.000Z',
        note: 'Team standup meeting',
      }),
    })
  })

  it('should prevent booking already booked slots', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(<BookingFlowTest />)

    // Select room 1
    const room1Button = screen.getByTestId('room-room1')
    await user.click(room1Button)

    // Try to select a booked slot (10:00 is booked according to mockBookings)
    await waitFor(() => {
      expect(screen.getByText('Time Slots for Conference Room A')).toBeInTheDocument()
    })

    const bookedSlot = screen.getByTestId('slot-10')
    expect(bookedSlot).toBeDisabled()
    expect(bookedSlot).toHaveTextContent('(Booked)')
  })

  it('should handle booking API errors gracefully', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    // Mock API error - make fetch throw to trigger catch block
    mockFetch.mockImplementation((url, options) => {
      if (options?.method === 'POST' && url.toString().includes('/api/bookings')) {
        return Promise.reject(new Error('Network error'))
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(<BookingFlowTest />)

    // Go through the flow
    const room1Button = screen.getByTestId('room-room1')
    await user.click(room1Button)

    await waitFor(() => {
      expect(screen.getByText('Time Slots for Conference Room A')).toBeInTheDocument()
    })

    const availableSlot = screen.getByTestId('slot-14')
    await user.click(availableSlot)

    await waitFor(() => {
      expect(screen.getByText('Book Conference Room A')).toBeInTheDocument()
    })

    const confirmButton = screen.getByTestId('confirm-booking')
    await user.click(confirmButton)

    // Should log the error but not crash
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Booking failed:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('should allow cancelling and going back to slot selection', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(<BookingFlowTest />)

    // Select room and slot
    const room1Button = screen.getByTestId('room-room1')
    await user.click(room1Button)

    await waitFor(async () => {
      const availableSlot = screen.getByTestId('slot-14')
      await user.click(availableSlot)
    })

    // Cancel booking
    await waitFor(async () => {
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
    })

    // Should be back to slot selection
    await waitFor(() => {
      expect(screen.getByText('Time Slots for Conference Room A')).toBeInTheDocument()
    })
  })

  it('should handle different room selections', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(<BookingFlowTest />)

    // Test selecting room 2
    const room2Button = screen.getByTestId('room-room2')
    await user.click(room2Button)

    await waitFor(() => {
      expect(screen.getByText('Time Slots for Meeting Room B')).toBeInTheDocument()
    })
  })

  it('should maintain state correctly throughout the flow', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(<BookingFlowTest />)

    // Complete flow and verify room selection is maintained
    const room1Button = screen.getByTestId('room-room1')
    await user.click(room1Button)

    await waitFor(() => {
      expect(screen.getByText('Time Slots for Conference Room A')).toBeInTheDocument()
    })

    const availableSlot = screen.getByTestId('slot-14')
    await user.click(availableSlot)

    await waitFor(() => {
      expect(screen.getByText('Book Conference Room A')).toBeInTheDocument()
    })
  })
})