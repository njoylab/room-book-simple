import { generateTimeSlots, formatSlotTime } from '@/utils/slots';
import { MeetingRoom } from '@/lib/types';

describe('Slots Utilities', () => {
  const mockRoom: MeetingRoom = {
    id: 'test-room',
    name: 'Test Room',
    capacity: 10,
    startTime: 28800, // 8:00 AM
    endTime: 64800,   // 6:00 PM
    status: 'Available',
    notes: 'Test room',
    image: null,
    maxMeetingHours: 2 // 2 hours max
  };

  const mockBookings = [];

  describe('generateTimeSlots', () => {
    it('should generate time slots for a room', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const slots = generateTimeSlots(mockRoom, date, mockBookings);

      expect(slots).toHaveLength(20); // 10 hours * 2 slots per hour
      expect(slots[0].startTime).toBe('2024-01-01T08:00:00.000Z');
      expect(slots[0].endTime).toBe('2024-01-01T08:30:00.000Z');
      expect(slots[0].isBooked).toBe(false);
    });

    it('should mark slots as booked when there are conflicts', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const conflictingBooking = {
        id: 'booking-1',
        roomId: 'test-room',
        startTime: '2024-01-01T09:00:00.000Z',
        endTime: '2024-01-01T10:00:00.000Z',
        userLabel: 'Test User',
        note: 'Test booking',
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      const slots = generateTimeSlots(mockRoom, date, [conflictingBooking]);

      // Find the conflicting slots (9:00-10:00)
      const conflictingSlots = slots.filter(slot => 
        slot.startTime >= '2024-01-01T09:00:00.000Z' && 
        slot.endTime <= '2024-01-01T10:00:00.000Z'
      );

      expect(conflictingSlots).toHaveLength(2); // 9:00-9:30 and 9:30-10:00
      conflictingSlots.forEach(slot => {
        expect(slot.isBooked).toBe(true);
        expect(slot.booking).toBe(conflictingBooking);
      });
    });
  });

  describe('formatSlotTime', () => {
    it('should format time correctly', () => {
      expect(formatSlotTime('2024-01-01T08:00:00.000Z')).toBe('08:00');
      expect(formatSlotTime('2024-01-01T14:30:00.000Z')).toBe('14:30');
      expect(formatSlotTime('2024-01-01T23:45:00.000Z')).toBe('23:45');
    });
  });
});