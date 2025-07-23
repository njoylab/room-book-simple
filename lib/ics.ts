/**
 * @fileoverview ICS (iCalendar) file generation utility
 * @description Generates ICS files for calendar events from booking data
 */

import { Booking } from '@/lib/types';

/**
 * Format a date for ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape special characters in ICS text fields
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Generate ICS file content for a single booking
 */
export function generateICSForBooking(
  booking: Booking,
  roomName: string,
  roomLocation?: string
): string {
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);
  const now = new Date();

  const uid = `${booking.id}@room-book-simple`;
  const dtstamp = formatICSDate(now);
  const dtstart = formatICSDate(startDate);
  const dtend = formatICSDate(endDate);

  const summary = escapeICSText(`Meeting Room: ${roomName}`);
  const description = booking.note
    ? escapeICSText(`Booked by: ${booking.userLabel}\nNote: ${booking.note}`)
    : escapeICSText(`Booked by: ${booking.userLabel}`);

  const location = roomLocation ? escapeICSText(`${roomName} - ${roomLocation}`) : escapeICSText(roomName);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Room Book Simple//Meeting Room Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `ORGANIZER:CN=${escapeICSText(booking.userLabel)}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

/**
 * Generate Google Calendar URL for a booking
 */
export function generateGoogleCalendarUrl(
  booking: Booking,
  roomName: string,
  roomLocation?: string
): string {
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);

  // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
  const startFormatted = formatICSDate(startDate);
  const endFormatted = formatICSDate(endDate);

  const title = `Meeting Room: ${roomName}`;
  const details = booking.note
    ? `Booked by: ${booking.userLabel}\nNote: ${booking.note}`
    : `Booked by: ${booking.userLabel}`;

  const location = roomLocation
    ? `${roomName} - ${roomLocation}`
    : roomName;

  const dates = `${startFormatted}/${endFormatted}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: dates,
    details: details,
    location: location
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook calendar URL for a booking
 */
export function generateOutlookCalendarUrl(
  booking: Booking,
  roomName: string,
  roomLocation?: string
): string {
  const startDate = new Date(booking.startTime).toISOString();
  const endDate = new Date(booking.endTime).toISOString();

  const subject = `Meeting Room: ${roomName}`;
  const body = booking.note
    ? `Booked by: ${booking.userLabel}\nNote: ${booking.note}`
    : `Booked by: ${booking.userLabel}`;

  const location = roomLocation
    ? `${roomName} - ${roomLocation}`
    : roomName;

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: subject,
    startdt: startDate,
    enddt: endDate,
    body: body,
    location: location
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}