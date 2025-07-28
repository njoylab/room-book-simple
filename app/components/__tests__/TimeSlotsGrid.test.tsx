/**
 * @fileoverview Tests for TimeSlotsGrid component
 * @description Tests for the time slots grid component including slot interactions,
 * booking modal integration, and user authentication handling.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TimeSlotsGrid } from '../TimeSlotsGrid';
import { MeetingRoom, User } from '@/lib/types';
import { TimeSlot } from '@/utils/slots';

// Mock Next.js router
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock components
jest.mock('../BookingModal', () => ({
  BookingModal: ({ isOpen, onClose, onSuccess, room, initialDate, preselectedSlot }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="booking-modal">
        <button onClick={onClose}>Close Booking</button>
        <button onClick={onSuccess}>Confirm Booking</button>
        <div>Book {room.name}</div>
        <div>Date: {initialDate}</div>
        {preselectedSlot && <div>Slot: {preselectedSlot.startTime}</div>}
      </div>
    );
  },
}));

jest.mock('../BookingDetailModal', () => ({
  BookingDetailModal: ({ isOpen, onClose, booking }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="booking-detail-modal">
        <button onClick={onClose}>Close Details</button>
        <div>Booking Details</div>
        <div>User: {booking?.booking?.userLabel}</div>
      </div>
    );
  },
}));

// Test data
const testRoom: MeetingRoom = {
  id: 'rec1234567890123',
  name: 'Conference Room A',
  capacity: 10,
  notes: 'Has projector',
  location: 'Floor 2',
  status: 'Available',
  startTime: 28800, // 8:00 AM
  endTime: 64800,   // 6:00 PM
  image: null
};

const testUser: User = {
  id: 'U1234567890',
  name: 'John Doe',
  image: 'https://example.com/avatar.jpg',
  team: 'Engineering'
};

const createTimeSlot = (overrides: Partial<TimeSlot> = {}): TimeSlot => ({
  label: '09:00',
  startTime: '2024-03-15T09:00:00.000Z',
  endTime: '2024-03-15T09:30:00.000Z',
  isBooked: false,
  isPast: false,
  ...overrides
});

const createBookedSlot = (overrides: Partial<TimeSlot> = {}): TimeSlot => ({
  label: '10:00',
  startTime: '2024-03-15T10:00:00.000Z',
  endTime: '2024-03-15T10:30:00.000Z',
  isBooked: true,
  isPast: false,
  booking: {
    id: 'rec1234567890123',
    userLabel: 'Jane Smith',
    user: 'U0987654321',
    startTime: '2024-03-15T10:00:00.000Z',
    endTime: '2024-03-15T10:30:00.000Z',
    note: 'Team meeting',
    room: 'rec1234567890123',
    roomName: 'Conference Room A',
    roomLocation: 'Floor 2',
    status: 'Confirmed'
  },
  ...overrides
});

describe('TimeSlotsGrid', () => {
  const defaultProps = {
    room: testRoom,
    timeSlots: [createTimeSlot(), createBookedSlot()],
    user: testUser,
    isUnavailable: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render time slots grid with available and booked slots', () => {
      render(<TimeSlotsGrid {...defaultProps} />);

      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Booked')).toBeInTheDocument();
    });

    it('should display room name in the grid header', () => {
      render(<TimeSlotsGrid {...defaultProps} />);

      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    it('should show unavailable status when room is unavailable', () => {
      render(<TimeSlotsGrid {...defaultProps} isUnavailable={true} />);

      expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });

    it('should render past slots with appropriate styling', () => {
      const pastSlot = createTimeSlot({
        label: '08:00',
        startTime: '2024-03-15T08:00:00.000Z',
        endTime: '2024-03-15T08:30:00.000Z',
        isPast: true
      });

      render(<TimeSlotsGrid {...defaultProps} timeSlots={[pastSlot]} />);

      expect(screen.getByText('08:00')).toBeInTheDocument();
      expect(screen.getByText('Past')).toBeInTheDocument();
    });
  });

  describe('Slot Interactions', () => {
    it('should open booking modal when clicking available slot', () => {
      render(<TimeSlotsGrid {...defaultProps} />);

      const availableSlot = screen.getByText('09:00').closest('button');
      fireEvent.click(availableSlot!);

      expect(screen.getByTestId('booking-modal')).toBeInTheDocument();
      expect(screen.getByText('Book Conference Room A')).toBeInTheDocument();
    });

    it('should open booking detail modal when clicking booked slot', () => {
      render(<TimeSlotsGrid {...defaultProps} />);

      const bookedSlot = screen.getByText('10:00').closest('button');
      fireEvent.click(bookedSlot!);

      expect(screen.getByTestId('booking-detail-modal')).toBeInTheDocument();
      expect(screen.getByText('Booking Details')).toBeInTheDocument();
      expect(screen.getByText('User: Jane Smith')).toBeInTheDocument();
    });

    it('should not open any modal when clicking past slot', () => {
      const pastSlot = createTimeSlot({
        label: '08:00',
        startTime: '2024-03-15T08:00:00.000Z',
        endTime: '2024-03-15T08:30:00.000Z',
        isPast: true
      });

      render(<TimeSlotsGrid {...defaultProps} timeSlots={[pastSlot]} />);

      const pastSlotButton = screen.getByText('08:00').closest('button');
      fireEvent.click(pastSlotButton!);

      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('booking-detail-modal')).not.toBeInTheDocument();
    });

    it('should not open booking modal when room is unavailable', () => {
      render(<TimeSlotsGrid {...defaultProps} isUnavailable={true} />);

      const availableSlot = screen.getByText('09:00').closest('button');
      fireEvent.click(availableSlot!);

      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
    });
  });

  describe('Authentication Handling', () => {
    it('should show login notification when clicking available slot without user', () => {
      render(<TimeSlotsGrid {...defaultProps} user={null} />);

      const availableSlot = screen.getByText('09:00').closest('button');
      fireEvent.click(availableSlot!);

      expect(screen.getByText('Please log in to book a room')).toBeInTheDocument();
    });

    it('should hide login notification after 4 seconds', async () => {
      jest.useFakeTimers();
      render(<TimeSlotsGrid {...defaultProps} user={null} />);

      const availableSlot = screen.getByText('09:00').closest('button');
      fireEvent.click(availableSlot!);

      expect(screen.getByText('Please log in to book a room')).toBeInTheDocument();

      jest.advanceTimersByTime(4000);

      await waitFor(() => {
        expect(screen.queryByText('Please log in to book a room')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should allow viewing booking details without authentication', () => {
      render(<TimeSlotsGrid {...defaultProps} user={null} />);

      const bookedSlot = screen.getByText('10:00').closest('button');
      fireEvent.click(bookedSlot!);

      expect(screen.getByTestId('booking-detail-modal')).toBeInTheDocument();
    });
  });

  describe('Modal Integration', () => {
    it('should close booking modal when close button is clicked', () => {
      render(<TimeSlotsGrid {...defaultProps} />);

      const availableSlot = screen.getByText('09:00').closest('button');
      fireEvent.click(availableSlot!);

      expect(screen.getByTestId('booking-modal')).toBeInTheDocument();

      const closeButton = screen.getByText('Close Booking');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
    });

    it('should close booking detail modal when close button is clicked', () => {
      render(<TimeSlotsGrid {...defaultProps} />);

      const bookedSlot = screen.getByText('10:00').closest('button');
      fireEvent.click(bookedSlot!);

      expect(screen.getByTestId('booking-detail-modal')).toBeInTheDocument();

      const closeButton = screen.getByText('Close Details');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('booking-detail-modal')).not.toBeInTheDocument();
    });

    it('should refresh page after successful booking', () => {
      render(<TimeSlotsGrid {...defaultProps} />);

      const availableSlot = screen.getByText('09:00').closest('button');
      fireEvent.click(availableSlot!);

      const confirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(confirmButton);

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should close booking modal after successful booking', () => {
      render(<TimeSlotsGrid {...defaultProps} />);

      const availableSlot = screen.getByText('09:00').closest('button');
      fireEvent.click(availableSlot!);

      const confirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(confirmButton);

      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for slot buttons', () => {
      render(<TimeSlotsGrid {...defaultProps} />);

      const availableSlot = screen.getByText('09:00').closest('button');
      expect(availableSlot).toHaveAttribute('aria-label', expect.stringContaining('09:00'));
      expect(availableSlot).toHaveAttribute('aria-label', expect.stringContaining('Available'));
    });

    it('should have proper ARIA labels for booked slots', () => {
      render(<TimeSlotsGrid {...defaultProps} />);

      const bookedSlot = screen.getByText('10:00').closest('button');
      expect(bookedSlot).toHaveAttribute('aria-label', expect.stringContaining('10:00'));
      expect(bookedSlot).toHaveAttribute('aria-label', expect.stringContaining('Booked'));
    });

    it('should be keyboard navigable', () => {
      render(<TimeSlotsGrid {...defaultProps} />);

      const availableSlot = screen.getByText('09:00').closest('button');
      availableSlot?.focus();
      
      expect(availableSlot).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty time slots array', () => {
      render(<TimeSlotsGrid {...defaultProps} timeSlots={[]} />);

      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
      expect(screen.queryByText('09:00')).not.toBeInTheDocument();
    });

    it('should handle room without location', () => {
      const roomWithoutLocation = { ...testRoom, location: undefined };
      render(<TimeSlotsGrid {...defaultProps} room={roomWithoutLocation} />);

      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    it('should handle booking without note', () => {
      const bookingWithoutNote = createBookedSlot({
        booking: {
          id: 'rec1234567890123',
          userLabel: 'Jane Smith',
          user: 'U0987654321',
          startTime: '2024-03-15T10:00:00.000Z',
          endTime: '2024-03-15T10:30:00.000Z',
          room: 'rec1234567890123',
          roomName: 'Conference Room A',
          roomLocation: 'Floor 2',
          status: 'Confirmed'
        }
      });

      render(<TimeSlotsGrid {...defaultProps} timeSlots={[bookingWithoutNote]} />);

      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });
});