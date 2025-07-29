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
      
      // Calculate expected start time (8:00 AM on the given date in local timezone)
      const expectedStart = new Date(date);
      expectedStart.setHours(8, 0, 0, 0);
      const expectedEnd = new Date(expectedStart);
      expectedEnd.setMinutes(30);
      
      expect(slots[0].startTime).toBe(expectedStart.toISOString());
      expect(slots[0].endTime).toBe(expectedEnd.toISOString());
      expect(slots[0].isBooked).toBe(false);
    });

    it('should mark slots as booked when there are conflicts', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      
      // Create booking times in local timezone (9:00-10:00 AM)
      const bookingStart = new Date(date);
      bookingStart.setHours(9, 0, 0, 0);
      const bookingEnd = new Date(date);
      bookingEnd.setHours(10, 0, 0, 0);
      
      const conflictingBooking = {
        id: 'booking-1',
        roomId: 'test-room',
        startTime: bookingStart.toISOString(),
        endTime: bookingEnd.toISOString(),
        userLabel: 'Test User',
        note: 'Test booking',
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      const slots = generateTimeSlots(mockRoom, date, [conflictingBooking]);

      // Find the conflicting slots (9:00-10:00)
      const conflictingSlots = slots.filter(slot => 
        slot.startTime >= bookingStart.toISOString() && 
        slot.endTime <= bookingEnd.toISOString()
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