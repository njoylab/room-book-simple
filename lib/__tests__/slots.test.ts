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
      
      // Calculate expected start time (8:00 AM UTC on the given date)
      const expectedStart = new Date(date);
      expectedStart.setUTCHours(8, 0, 0, 0);
      const expectedEnd = new Date(expectedStart);
      expectedEnd.setUTCMinutes(30);
      
      expect(slots[0].startTime).toBe(expectedStart.toISOString());
      expect(slots[0].endTime).toBe(expectedEnd.toISOString());
      expect(slots[0].isBooked).toBe(false);
    });

    it('should mark slots as booked when there are conflicts', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      
      // Create booking times in UTC (9:00-10:00 AM)
      const bookingStart = new Date(date);
      bookingStart.setUTCHours(9, 0, 0, 0);
      const bookingEnd = new Date(date);
      bookingEnd.setUTCHours(10, 0, 0, 0);
      
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
    it('should format time correctly in local timezone', () => {
      // formatSlotTime converts UTC to local timezone
      const result1 = formatSlotTime('2024-01-01T08:00:00.000Z');
      const result2 = formatSlotTime('2024-01-01T14:30:00.000Z');
      const result3 = formatSlotTime('2024-01-01T23:45:00.000Z');

      // Verify format is HH:MM
      expect(result1).toMatch(/^\d{2}:\d{2}$/);
      expect(result2).toMatch(/^\d{2}:\d{2}$/);
      expect(result3).toMatch(/^\d{2}:\d{2}$/);

      // Verify the times are converted (not raw UTC)
      // We can't test exact values since they depend on the test runner's timezone
      // But we can verify that the function works by checking that times are formatted
      const date1 = new Date('2024-01-01T08:00:00.000Z');
      const expectedHours = date1.getHours().toString().padStart(2, '0');
      const expectedMinutes = date1.getMinutes().toString().padStart(2, '0');
      expect(result1).toBe(`${expectedHours}:${expectedMinutes}`);
    });
  });
});
