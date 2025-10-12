/**
 * @fileoverview Tests for ICS (iCalendar) file generation utility
 */

import { generateGoogleCalendarUrl, generateICSForBooking, generateOutlookCalendarUrl } from '../ics';
import { BOOKING_STATUS } from '../types';

describe('ICS Utility Functions', () => {
  const mockBooking = {
    id: 'rec123456789',
    userLabel: 'John Doe',
    user: 'U123456789',
    startTime: '2024-01-15T10:00:00.000Z',
    endTime: '2024-01-15T11:00:00.000Z',
    room: 'recROOM123456',
    status: BOOKING_STATUS.CONFIRMED,
    note: 'Team meeting about project X',
  };

  const mockBookingWithoutNote = {
    id: 'rec123456789',
    userLabel: 'John Doe',
    user: 'U123456789',
    startTime: '2024-01-15T10:00:00.000Z',
    endTime: '2024-01-15T11:00:00.000Z',
    room: 'recROOM123456',
    status: BOOKING_STATUS.CONFIRMED,
  };

  const roomName = 'Conference Room A';
  const roomLocation = 'Building 1, Floor 2';

  describe('generateICSForBooking', () => {
    it('should generate valid ICS content with all fields', () => {
      const icsContent = generateICSForBooking(mockBooking, roomName, roomLocation);

      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('END:VCALENDAR');
      expect(icsContent).toContain('BEGIN:VEVENT');
      expect(icsContent).toContain('END:VEVENT');
      expect(icsContent).toContain('VERSION:2.0');
      expect(icsContent).toContain('PRODID:-//Room Book Simple//Meeting Room Booking//EN');

      // Check for booking-specific content
      expect(icsContent).toContain('SUMMARY:Meeting Room: Conference Room A');
      expect(icsContent).toContain('DESCRIPTION:Booked by: John Doe\\nNote: Team meeting about project X');
      expect(icsContent).toContain('LOCATION:Conference Room A - Building 1\\, Floor 2');
      expect(icsContent).toContain('ORGANIZER:CN=John Doe');
      expect(icsContent).toContain('STATUS:CONFIRMED');

      // Check datetime format (UTC with Z suffix)
      expect(icsContent).toMatch(/DTSTART:\d{8}T\d{6}Z/);
      expect(icsContent).toMatch(/DTEND:\d{8}T\d{6}Z/);
    });

    it('should generate ICS content without note when note is not provided', () => {
      const icsContent = generateICSForBooking(mockBookingWithoutNote, roomName, roomLocation);

      expect(icsContent).toContain('DESCRIPTION:Booked by: John Doe');
      expect(icsContent).not.toContain('\\nNote:');
    });

    it('should handle room without location', () => {
      const icsContent = generateICSForBooking(mockBooking, roomName);

      expect(icsContent).toContain('LOCATION:Conference Room A');
      expect(icsContent).not.toContain(' - ');
    });

    it('should properly escape special characters in ICS fields', () => {
      const bookingWithSpecialChars = {
        ...mockBooking,
        userLabel: 'John; Doe, Jr.',
        note: 'Meeting with\nmulti-line\rnote; and, commas',
      };

      const roomWithSpecialChars = 'Room; With, Special\nCharacters';

      const icsContent = generateICSForBooking(bookingWithSpecialChars, roomWithSpecialChars);

      expect(icsContent).toContain('ORGANIZER:CN=John\\; Doe\\, Jr.');
      expect(icsContent).toContain('DESCRIPTION:Booked by: John\\; Doe\\, Jr.\\nNote: Meeting with\\nmulti-linenote\\; and\\, commas');
      expect(icsContent).toContain('SUMMARY:Meeting Room: Room\\; With\\, Special\\nCharacters');
    });

    it('should include proper UID for the event', () => {
      const icsContent = generateICSForBooking(mockBooking, roomName, roomLocation);

      expect(icsContent).toContain('UID:rec123456789@room-book-simple');
    });

    it('should include proper calendar method and transparency', () => {
      const icsContent = generateICSForBooking(mockBooking, roomName, roomLocation);

      expect(icsContent).toContain('METHOD:PUBLISH');
      expect(icsContent).toContain('TRANSP:OPAQUE');
      expect(icsContent).toContain('CALSCALE:GREGORIAN');
    });
  });

  describe('generateGoogleCalendarUrl', () => {
    it('should generate valid Google Calendar URL with all parameters', () => {
      const googleUrl = generateGoogleCalendarUrl(mockBooking, roomName, roomLocation);

      expect(googleUrl).toContain('https://calendar.google.com/calendar/render?');
      expect(googleUrl).toContain('action=TEMPLATE');
      expect(googleUrl).toContain('text=Meeting+Room%3A+Conference+Room+A');
      // Dates use UTC format with Z suffix
      expect(googleUrl).toMatch(/dates=\d{8}T\d{6}Z%2F\d{8}T\d{6}Z/);
      expect(googleUrl).toContain('details=Booked+by%3A+John+Doe%0ANote%3A+Team+meeting+about+project+X');
      expect(googleUrl).toContain('location=Conference+Room+A+-+Building+1%2C+Floor+2');
    });

    it('should generate URL without note when note is not provided', () => {
      const googleUrl = generateGoogleCalendarUrl(mockBookingWithoutNote, roomName, roomLocation);

      expect(googleUrl).toContain('details=Booked+by%3A+John+Doe');
      expect(googleUrl).not.toContain('Note%3A');
    });

    it('should handle room without location', () => {
      const googleUrl = generateGoogleCalendarUrl(mockBooking, roomName);

      expect(googleUrl).toContain('location=Conference+Room+A');
      expect(googleUrl).not.toContain('+-+');
    });

    it('should properly encode special characters for URLs', () => {
      const bookingWithSpecialChars = {
        ...mockBooking,
        userLabel: 'John & Jane Doe',
        note: 'Meeting @ 10:00 AM',
      };

      const googleUrl = generateGoogleCalendarUrl(bookingWithSpecialChars, 'Room #1');

      expect(googleUrl).toContain('text=Meeting+Room%3A+Room+%231');
      expect(googleUrl).toContain('details=Booked+by%3A+John+%26+Jane+Doe%0ANote%3A+Meeting+%40+10%3A00+AM');
    });
  });

  describe('generateOutlookCalendarUrl', () => {
    it('should generate valid Outlook Calendar URL with all parameters', () => {
      const outlookUrl = generateOutlookCalendarUrl(mockBooking, roomName, roomLocation);

      expect(outlookUrl).toContain('https://outlook.live.com/calendar/0/deeplink/compose?');
      expect(outlookUrl).toContain('path=%2Fcalendar%2Faction%2Fcompose');
      expect(outlookUrl).toContain('rru=addevent');
      expect(outlookUrl).toContain('subject=Meeting+Room%3A+Conference+Room+A');
      expect(outlookUrl).toContain('startdt=2024-01-15T10%3A00%3A00.000Z');
      expect(outlookUrl).toContain('enddt=2024-01-15T11%3A00%3A00.000Z');
      expect(outlookUrl).toContain('body=Booked+by%3A+John+Doe%0ANote%3A+Team+meeting+about+project+X');
      expect(outlookUrl).toContain('location=Conference+Room+A+-+Building+1%2C+Floor+2');
    });

    it('should generate URL without note when note is not provided', () => {
      const outlookUrl = generateOutlookCalendarUrl(mockBookingWithoutNote, roomName, roomLocation);

      expect(outlookUrl).toContain('body=Booked+by%3A+John+Doe');
      expect(outlookUrl).not.toContain('Note%3A');
    });

    it('should handle room without location', () => {
      const outlookUrl = generateOutlookCalendarUrl(mockBooking, roomName);

      expect(outlookUrl).toContain('location=Conference+Room+A');
      expect(outlookUrl).not.toContain('+-+');
    });

    it('should use ISO datetime format for Outlook', () => {
      const outlookUrl = generateOutlookCalendarUrl(mockBooking, roomName, roomLocation);

      // Outlook expects ISO format with colons and dashes
      expect(outlookUrl).toContain('startdt=2024-01-15T10%3A00%3A00.000Z');
      expect(outlookUrl).toContain('enddt=2024-01-15T11%3A00%3A00.000Z');
    });

    it('should properly encode special characters for URLs', () => {
      const bookingWithSpecialChars = {
        ...mockBooking,
        userLabel: 'John & Jane Doe',
        note: 'Meeting @ 10:00 AM',
      };

      const outlookUrl = generateOutlookCalendarUrl(bookingWithSpecialChars, 'Room #1');

      expect(outlookUrl).toContain('subject=Meeting+Room%3A+Room+%231');
      expect(outlookUrl).toContain('body=Booked+by%3A+John+%26+Jane+Doe%0ANote%3A+Meeting+%40+10%3A00+AM');
    });
  });

  describe('Date and Time Formatting', () => {
    it('should handle different timezone dates correctly', () => {
      // Test with different timezone
      const bookingUTC = {
        ...mockBooking,
        startTime: '2024-06-15T14:30:00.000Z',
        endTime: '2024-06-15T15:30:00.000Z',
      };

      const icsContent = generateICSForBooking(bookingUTC, roomName);
      // Uses UTC format with Z suffix
      expect(icsContent).toMatch(/DTSTART:\d{8}T\d{6}Z/);
      expect(icsContent).toMatch(/DTEND:\d{8}T\d{6}Z/);

      const googleUrl = generateGoogleCalendarUrl(bookingUTC, roomName);
      // Google Calendar URL also uses UTC format
      expect(googleUrl).toMatch(/dates=\d{8}T\d{6}Z%2F\d{8}T\d{6}Z/);

      const outlookUrl = generateOutlookCalendarUrl(bookingUTC, roomName);
      // Outlook still uses ISO format with Z
      expect(outlookUrl).toContain('startdt=2024-06-15T14%3A30%3A00.000Z');
      expect(outlookUrl).toContain('enddt=2024-06-15T15%3A30%3A00.000Z');
    });

    it('should handle edge case times (midnight, end of day)', () => {
      const midnightBooking = {
        ...mockBooking,
        startTime: '2024-01-15T00:00:00.000Z',
        endTime: '2024-01-15T23:59:59.000Z',
      };

      const icsContent = generateICSForBooking(midnightBooking, roomName);
      // Uses UTC format with Z suffix
      expect(icsContent).toMatch(/DTSTART:\d{8}T\d{6}Z/);
      expect(icsContent).toMatch(/DTEND:\d{8}T\d{6}Z/);
    });
  });
});
