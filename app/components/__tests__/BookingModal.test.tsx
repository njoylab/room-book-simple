/**
 * @fileoverview Tests for BookingModal component
 * @description Tests for the room booking modal component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingModal } from '../BookingModal';
import { MeetingRoom } from '@/lib/types';
import { TimeSlot } from '@/utils/slots';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

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

const testSlot: TimeSlot = {
  label: '09:00',
  startTime: '2024-03-15T09:00:00.000Z',
  endTime: '2024-03-15T09:30:00.000Z',
  isBooked: false,
  isPast: false
};

describe.skip('BookingModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Rendering', () => {
    it('should render modal when open', () => {
      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          initialDate="2024-03-15"
        />
      );

      expect(screen.getByText('Book Conference Room A')).toBeInTheDocument();
      expect(screen.getByText('09:00 - 09:30')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /note/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /book room/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <BookingModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      expect(screen.queryByText('Book Conference Room A')).not.toBeInTheDocument();
    });

    it('should display room information correctly', () => {
      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
      expect(screen.getByText('Floor 2')).toBeInTheDocument();
      expect(screen.getByText('Capacity: 10')).toBeInTheDocument();
    });

    it('should display slot time information', () => {
      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      expect(screen.getByText('09:00 - 09:30')).toBeInTheDocument();
      expect(screen.getByText(/March 15, 2024/)).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should allow entering a note', () => {
      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      const noteInput = screen.getByRole('textbox', { name: /note/i });
      fireEvent.change(noteInput, { target: { value: 'Team standup meeting' } });

      expect(noteInput).toHaveValue('Team standup meeting');
    });

    it('should close modal when cancel is clicked', () => {
      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when overlay is clicked', () => {
      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      // Click the modal overlay
      const overlay = screen.getByRole('dialog').parentElement;
      fireEvent.click(overlay!);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal when modal content is clicked', () => {
      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      // Click inside the modal content
      fireEvent.click(screen.getByRole('dialog'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Booking Submission', () => {
    it('should submit booking successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          id: 'rec123456789',
          user: 'U123456789',
          userLabel: 'Test User',
          startTime: '2024-03-15T09:00:00.000Z',
          endTime: '2024-03-15T09:30:00.000Z',
          note: 'Team meeting',
          room: 'rec1234567890123'
        })
      });

      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      // Fill in the note
      const noteInput = screen.getByRole('textbox', { name: /note/i });
      fireEvent.change(noteInput, { target: { value: 'Team meeting' } });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /book room/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: 'rec1234567890123',
            startTime: '2024-03-15T09:00:00.000Z',
            endTime: '2024-03-15T09:30:00.000Z',
            note: 'Team meeting'
          })
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should submit booking without note', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });

      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /book room/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: 'rec1234567890123',
            startTime: '2024-03-15T09:00:00.000Z',
            endTime: '2024-03-15T09:30:00.000Z',
            note: ''
          })
        });
      });
    });

    it('should show loading state during submission', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(pendingPromise);

      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /book room/i }));

      // Should show loading state
      expect(screen.getByText('Booking...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /booking/i })).toBeDisabled();

      // Resolve the promise
      resolvePromise!({ ok: true, json: () => Promise.resolve({}) });

      await waitFor(() => {
        expect(screen.queryByText('Booking...')).not.toBeInTheDocument();
      });
    });

    it('should handle booking errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Room is already booked for this time' })
      });

      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /book room/i }));

      await waitFor(() => {
        expect(screen.getByText('Room is already booked for this time')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /book room/i }));

      await waitFor(() => {
        expect(screen.getByText('An error occurred while booking the room')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should clear error when retrying', async () => {
      // First request fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' })
      });

      // Second request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      // First attempt
      fireEvent.click(screen.getByRole('button', { name: /book room/i }));

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });

      // Second attempt
      fireEvent.click(screen.getByRole('button', { name: /book room/i }));

      await waitFor(() => {
        expect(screen.queryByText('Server error')).not.toBeInTheDocument();
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      expect(screen.getByRole('textbox', { name: /note/i })).toHaveAttribute('aria-describedby');
    });

    it('should trap focus within modal', () => {
      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      const modal = screen.getByRole('dialog');
      const focusableElements = modal.querySelectorAll('button, input, textarea, [tabindex]:not([tabindex="-1"])');
      
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('should close modal on Escape key', () => {
      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle room without location', () => {
      const roomWithoutLocation = { ...testRoom, location: '' };

      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={roomWithoutLocation}
          slot={testSlot}
        />
      );

      expect(screen.queryByText('Floor 2')).not.toBeInTheDocument();
    });

    it('should handle room without notes', () => {
      const roomWithoutNotes = { ...testRoom, notes: '' };

      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={roomWithoutNotes}
          slot={testSlot}
        />
      );

      // Should still render without errors
      expect(screen.getByText('Book Conference Room A')).toBeInTheDocument();
    });

    it('should handle very long notes', () => {
      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      const longNote = 'A'.repeat(1000);
      const noteInput = screen.getByRole('textbox', { name: /note/i });
      fireEvent.change(noteInput, { target: { value: longNote } });

      expect(noteInput).toHaveValue(longNote);
    });

    it('should prevent double submission', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });

      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={testSlot}
        />
      );

      const submitButton = screen.getByRole('button', { name: /book room/i });
      
      // Double click
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle null/undefined props gracefully', () => {
      render(
        <BookingModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          room={testRoom}
          slot={null as any}
        />
      );

      // Should render without crashing
      expect(screen.getByText('Book Conference Room A')).toBeInTheDocument();
    });
  });
});