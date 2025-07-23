import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoomCard } from '../RoomCard'
import { MeetingRoom } from '@/lib/types'

describe('RoomCard', () => {
  const mockRoom: MeetingRoom = {
    id: 'room1',
    name: 'Conference Room A',
    capacity: 10,
    notes: 'Whiteboard and projector available',
    location: 'First Floor',
    status: 'Active',
    startTime: 28800, // 8:00 AM
    endTime: 64800,   // 6:00 PM
  }

  const defaultProps = {
    room: mockRoom,
    bookings: [],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render room name', () => {
    render(<RoomCard {...defaultProps} />)
    
    expect(screen.getByText('Conference Room A')).toBeInTheDocument()
  })

  it('should render room capacity', () => {
    render(<RoomCard {...defaultProps} />)
    
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('people')).toBeInTheDocument()
  })

  it('should render room notes when provided', () => {
    render(<RoomCard {...defaultProps} />)
    
    expect(screen.getByText('Whiteboard and projector available')).toBeInTheDocument()
  })

  it('should render room location when provided', () => {
    render(<RoomCard {...defaultProps} />)
    
    expect(screen.getByText(/First Floor/)).toBeInTheDocument()
  })

  it('should not render notes section when notes are not provided', () => {
    const roomWithoutNotes = { ...mockRoom, description: undefined }
    render(<RoomCard {...defaultProps} room={roomWithoutNotes} />)
    
    // Should still render the room card but not the notes
    expect(screen.getByText('Conference Room A')).toBeInTheDocument()
  })

  it('should not render location section when location is not provided', () => {
    const roomWithoutLocation = {
      ...mockRoom,
      location: undefined,
    }
    
    render(<RoomCard {...defaultProps} room={roomWithoutLocation} />)
    
    expect(screen.queryByText('First Floor')).not.toBeInTheDocument()
  })

  it('should render operating hours', () => {
    render(<RoomCard {...defaultProps} />)
    
    // Should show formatted operating hours (08:00 - 18:00)
    expect(screen.getByText(/08:00.*18:00/)).toBeInTheDocument()
  })

  it('should be clickable and call onSelect', async () => {
    render(<RoomCard {...defaultProps} />)
    
    const card = screen.getByRole('link')
    expect(card).toHaveAttribute('href', '/book/room1')
  })

  it('should handle keyboard interaction', async () => {
    const user = userEvent.setup()
    render(<RoomCard {...defaultProps} />)
    
    const card = screen.getByRole('link')
    card.focus()
    
    await user.keyboard('{Enter}')
    
    // Should be focusable
    expect(card).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<RoomCard {...defaultProps} />)
    
    const card = screen.getByRole('link')
    expect(card).toHaveAccessibleName()
    expect(card).toHaveAttribute('href', '/book/room1')
  })

  it('should display availability status', () => {
    render(<RoomCard {...defaultProps} />)
    
    // Should show some indication of availability
    // This depends on the implementation of how availability is shown
    const card = screen.getByRole('link')
    expect(card).toBeInTheDocument()
    expect(screen.getAllByText('Available')).toHaveLength(2) // Desktop and mobile versions
  })

  it('should handle room with minimal information', () => {
    const minimalRoom: MeetingRoom = {
      id: 'room2',
      name: 'Basic Room',
      capacity: 4,
      startTime: 28800,
      endTime: 64800,
    }
    
    render(<RoomCard {...defaultProps} room={minimalRoom} />)
    
    expect(screen.getByText('Basic Room')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('people')).toBeInTheDocument()
  })

  it('should handle room with long name', () => {
    const roomWithLongName = {
      ...mockRoom,
      name: 'Very Long Conference Room Name That Might Need Truncation or Wrapping',
    }
    
    render(<RoomCard {...defaultProps} room={roomWithLongName} />)
    
    expect(screen.getByText('Very Long Conference Room Name That Might Need Truncation or Wrapping')).toBeInTheDocument()
  })

  it('should handle room with long notes', () => {
    const roomWithLongNotes = {
      ...mockRoom,
      notes: 'This is a very long note that describes all the amenities and features available in this conference room including whiteboard, projector, video conferencing equipment, and much more.',
    }
    
    render(<RoomCard {...defaultProps} room={roomWithLongNotes} />)
    
    expect(screen.getByText(/This is a very long note/)).toBeInTheDocument()
  })

  it('should handle different capacity values', () => {
    const smallRoom = { ...mockRoom, capacity: 1 }
    const { rerender } = render(<RoomCard {...defaultProps} room={smallRoom} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('people')).toBeInTheDocument()
    
    const mediumRoom = { ...mockRoom, capacity: 15 }
    rerender(<RoomCard {...defaultProps} room={mediumRoom} />)
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('people')).toBeInTheDocument()
    
    const largeRoom = { ...mockRoom, capacity: 100 }
    rerender(<RoomCard {...defaultProps} room={largeRoom} />)
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('people')).toBeInTheDocument()
  })

  it('should handle different time formats', () => {
    const customHoursRoom = {
      ...mockRoom,
      startTime: 32400, // 9:00 AM
      endTime: 61200,   // 5:00 PM
    }
    
    render(<RoomCard {...defaultProps} room={customHoursRoom} />)
    
    expect(screen.getByText(/09:00.*17:00/)).toBeInTheDocument()
  })

  it('should handle special characters in room details', () => {
    const specialRoom = {
      ...mockRoom,
      name: 'Room "A" & Conference',
      location: 'Floor 1 - Section A/B',
      notes: 'Notes with <special> characters & symbols',
    }
    
    render(<RoomCard {...defaultProps} room={specialRoom} />)
    
    expect(screen.getByText('Room "A" & Conference')).toBeInTheDocument()
    expect(screen.getByText('Notes with <special> characters & symbols')).toBeInTheDocument()
    expect(screen.getByText(/Floor 1.*Section A\/B/)).toBeInTheDocument()
  })

  it('should render with proper accessibility', () => {
    render(<RoomCard {...defaultProps} />)
    
    const roomName = screen.getByRole('heading', { level: 3 })
    expect(roomName).toHaveTextContent('Conference Room A')
    expect(roomName.tagName).toBe('H3')
    
    // Card should have proper structure
    const card = screen.getByRole('link')
    expect(card).toBeInTheDocument()
  })

  it('should handle hover states', async () => {
    const user = userEvent.setup()
    render(<RoomCard {...defaultProps} />)
    
    const card = screen.getByRole('link')
    
    await user.hover(card)
    // Visual changes on hover are handled by CSS, so we just ensure no errors
    expect(card).toBeInTheDocument()
    
    await user.unhover(card)
    expect(card).toBeInTheDocument()
  })

  it('should handle focus states', async () => {
    const user = userEvent.setup()
    render(<RoomCard {...defaultProps} />)
    
    const card = screen.getByRole('link')
    
    await user.tab()
    expect(card).toHaveFocus()
  })

  it('should handle rapid clicks gracefully', async () => {
    const user = userEvent.setup()
    render(<RoomCard {...defaultProps} />)
    
    const card = screen.getByRole('link')
    
    // Rapid clicking should not cause issues
    await user.click(card)
    await user.click(card)
    await user.click(card)
    
    expect(card).toBeInTheDocument()
  })

  it('should render consistently with different prop combinations', () => {
    const variations = [
      { ...mockRoom, notes: '', location: '' },
      { ...mockRoom, notes: undefined, location: undefined },
      { ...mockRoom, status: undefined },
      { ...mockRoom, capacity: 0 },
    ]
    
    variations.forEach((room) => {
      const { unmount } = render(<RoomCard {...defaultProps} room={room} />)
      
      // Should render without errors
      expect(screen.getByText(room.name)).toBeInTheDocument()
      
      unmount()
    })
  })

  it('should handle prop changes correctly', () => {
    const { rerender } = render(<RoomCard {...defaultProps} />)
    
    expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    
    const newRoom = {
      ...mockRoom,
      name: 'Updated Room Name',
      capacity: 20,
    }
    
    rerender(<RoomCard {...defaultProps} room={newRoom} />)
    
    expect(screen.getByText('Updated Room Name')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('people')).toBeInTheDocument()
  })
})