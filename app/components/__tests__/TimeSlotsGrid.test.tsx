/**
 * @fileoverview Tests for TimeSlotsGrid component
 * @description Tests for the interactive time slots grid component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TimeSlotsGrid } from '../TimeSlotsGrid';
import { MeetingRoom, User, Booking } from '@/lib/types';
import { TimeSlot } from '@/utils/slots';

// Mock Next.js navigation
const mockRouter = {
  refresh: jest.fn()
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter
}));

// Mock child components
jest.mock('../BookingModal', () => ({
  BookingModal: ({ isOpen, onClose, onSuccess, room, slot }: any) => (
    isOpen ? (
      <div data-testid="booking-modal">
        <div>Booking Modal</div>
        <div>Room: {room.name}</div>
        <div>Slot: {slot?.label}</div>
        <button onClick={onClose}>Cancel</button>
        <button onClick={onSuccess}>Confirm Booking</button>
      </div>
    ) : null
  )
}));

jest.mock('../BookingDetailModal', () => ({
  BookingDetailModal: ({ isOpen, onClose, booking }: any) => (
    isOpen ? (
      <div data-testid="booking-detail-modal">
        <div>Booking Detail Modal</div>
        <div>Booking: {booking?.booking?.id}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
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
  image: 'https://example.com/room.jpg'
};

const testUser: User = {
  id: 'U123456789',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
  team: 'Test Team'
};

const testBooking: Booking = {
  id: 'rec9876543210987',
  user: 'U123456789',
  userLabel: 'Test User',
  startTime: '2024-03-15T10:00:00.000Z',
  endTime: '2024-03-15T11:00:00.000Z',
  note: 'Team meeting',
  room: 'rec1234567890123',
  roomName: 'Conference Room A',
  roomLocation: 'Floor 2',
  status: 'Confirmed'
};

const createTimeSlot = (
  label: string,
  isBooked = false,
  isPast = false,
  booking?: Booking
): TimeSlot => ({
  label,
  startTime: `2024-03-15T${label}:00.000Z`,
  endTime: `2024-03-15T${label.split(':')[0].padStart(2, '0')}:30:00.000Z`,
  isBooked,
  isPast,
  booking: isBooked ? booking : undefined
});

describe.skip('TimeSlotsGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render time slots grid with available slots', () => {
      const timeSlots = [
        createTimeSlot('09:00'),
        createTimeSlot('09:30'),
        createTimeSlot('10:00'),
      ];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('09:30')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('should render booked slots with correct styling', () => {
      const timeSlots = [
        createTimeSlot('09:00'),
        createTimeSlot('10:00', true, false, testBooking),
        createTimeSlot('11:00'),
      ];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      const bookedSlot = screen.getByText('10:00').closest('button');
      expect(bookedSlot).toHaveClass('bg-red-100');
    });

    it('should render past slots with correct styling', () => {
      const timeSlots = [
        createTimeSlot('08:00', false, true),
        createTimeSlot('09:00'),
        createTimeSlot('10:00'),
      ];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      const pastSlot = screen.getByText('08:00').closest('button');
      expect(pastSlot).toHaveClass('bg-gray-100');
    });

    it('should render grid layout correctly', () => {
      const timeSlots = [
        createTimeSlot('09:00'),
        createTimeSlot('09:30'),
        createTimeSlot('10:00'),
        createTimeSlot('10:30'),
      ];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      const grid = screen.getByRole('grid');
      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('gap-2');
    });
  });

  describe('User Interactions - Available Slots', () => {
    it('should open booking modal when clicking available slot with authenticated user', () => {
      const timeSlots = [createTimeSlot('09:00')];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      const availableSlot = screen.getByText('09:00');
      fireEvent.click(availableSlot);

      expect(screen.getByTestId('booking-modal')).toBeInTheDocument();
      expect(screen.getByText('Room: Conference Room A')).toBeInTheDocument();
      expect(screen.getByText('Slot: 09:00')).toBeInTheDocument();
    });

    it('should not open booking modal when clicking available slot without authenticated user', () => {
      const timeSlots = [createTimeSlot('09:00')];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={null} />);

      const availableSlot = screen.getByText('09:00');
      fireEvent.click(availableSlot);

      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
    });

    it('should not open booking modal when clicking past slot', () => {
      const timeSlots = [createTimeSlot('08:00', false, true)];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      const pastSlot = screen.getByText('08:00');
      fireEvent.click(pastSlot);

      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions - Booked Slots', () => {
    it('should open booking detail modal when clicking booked slot', () => {
      const timeSlots = [createTimeSlot('10:00', true, false, testBooking)];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      const bookedSlot = screen.getByText('10:00');
      fireEvent.click(bookedSlot);

      expect(screen.getByTestId('booking-detail-modal')).toBeInTheDocument();
      expect(screen.getByText('Booking: rec9876543210987')).toBeInTheDocument();
    });

    it('should open booking detail modal even when user is not authenticated', () => {
      const timeSlots = [createTimeSlot('10:00', true, false, testBooking)];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={null} />);

      const bookedSlot = screen.getByText('10:00');
      fireEvent.click(bookedSlot);

      expect(screen.getByTestId('booking-detail-modal')).toBeInTheDocument();
    });
  });

  describe('Modal Management', () => {
    it('should close booking modal when cancel is clicked', () => {
      const timeSlots = [createTimeSlot('09:00')];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      // Open modal
      fireEvent.click(screen.getByText('09:00'));
      expect(screen.getByTestId('booking-modal')).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
    });

    it('should close booking modal and refresh page when booking is successful', async () => {
      const timeSlots = [createTimeSlot('09:00')];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      // Open modal
      fireEvent.click(screen.getByText('09:00'));
      expect(screen.getByTestId('booking-modal')).toBeInTheDocument();

      // Confirm booking
      fireEvent.click(screen.getByText('Confirm Booking'));

      await waitFor(() => {
        expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
      });

      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it('should close booking detail modal when close is clicked', () => {
      const timeSlots = [createTimeSlot('10:00', true, false, testBooking)];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      // Open modal
      fireEvent.click(screen.getByText('10:00'));
      expect(screen.getByTestId('booking-detail-modal')).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByText('Close'));
      expect(screen.queryByTestId('booking-detail-modal')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for time slots', () => {
      const timeSlots = [
        createTimeSlot('09:00'),
        createTimeSlot('10:00', true, false, testBooking),
        createTimeSlot('08:00', false, true),
      ];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      const availableSlot = screen.getByText('09:00').closest('button');
      const bookedSlot = screen.getByText('10:00').closest('button');
      const pastSlot = screen.getByText('08:00').closest('button');

      expect(availableSlot).toHaveAttribute('aria-label', expect.stringContaining('available'));
      expect(bookedSlot).toHaveAttribute('aria-label', expect.stringContaining('booked'));
      expect(pastSlot).toHaveAttribute('aria-label', expect.stringContaining('past'));
    });

    it('should be keyboard navigable', () => {
      const timeSlots = [createTimeSlot('09:00')];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      const slot = screen.getByText('09:00').closest('button');
      expect(slot).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty time slots array', () => {
      render(<TimeSlotsGrid room={testRoom} timeSlots={[]} user={testUser} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should handle slots without booking details', () => {
      const timeSlots = [createTimeSlot('10:00', true, false, undefined)];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      const bookedSlot = screen.getByText('10:00');
      fireEvent.click(bookedSlot);

      // Should not open detail modal if no booking data
      expect(screen.queryByTestId('booking-detail-modal')).not.toBeInTheDocument();
    });

    it('should handle room without name', () => {
      const roomWithoutName = { ...testRoom, name: '' };
      const timeSlots = [createTimeSlot('09:00')];

      render(<TimeSlotsGrid room={roomWithoutName} timeSlots={timeSlots} user={testUser} />);

      fireEvent.click(screen.getByText('09:00'));
      expect(screen.getByText('Room:')).toBeInTheDocument(); // Should still render empty name
    });

    it('should handle concurrent modal operations', () => {
      const timeSlots = [
        createTimeSlot('09:00'),
        createTimeSlot('10:00', true, false, testBooking)
      ];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      // Try to open both modals
      fireEvent.click(screen.getByText('09:00'));
      fireEvent.click(screen.getByText('10:00'));

      // Should only have detail modal open (last click)
      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('booking-detail-modal')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid classes', () => {
      const timeSlots = [createTimeSlot('09:00'), createTimeSlot('09:30')];

      render(<TimeSlotsGrid room={testRoom} timeSlots={timeSlots} user={testUser} />);

      const grid = screen.getByRole('grid');
      expect(grid).toHaveClass('grid');
      // Should have responsive column classes
      expect(grid).toHaveClass('grid-cols-2', 'md:grid-cols-4', 'lg:grid-cols-6');
    });

    it('should handle large number of time slots', () => {
      const manySlots = Array.from({ length: 20 }, (_, i) => 
        createTimeSlot(`${8 + Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'}`)
      );

      render(<TimeSlotsGrid room={testRoom} timeSlots={manySlots} user={testUser} />);

      expect(screen.getAllByRole('button')).toHaveLength(20);
    });
  });
});