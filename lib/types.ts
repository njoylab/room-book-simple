/**
 * @fileoverview Type definitions for the room booking application
 * @description This file contains all the core TypeScript interfaces and constants
 * used throughout the application for type safety and consistency.
 */

/**
 * Represents a meeting room with all its properties and configuration
 * @interface MeetingRoom
 */
export interface MeetingRoom {
  /** Unique identifier for the meeting room */
  id: string;
  /** Display name of the meeting room */
  name: string;
  /** Maximum number of people the room can accommodate */
  capacity: number;
  /** Optional additional notes or description about the room */
  notes?: string;
  /** Physical location or address of the room */
  location?: string;
  /** Current operational status of the room (e.g., "Available", "Unavailable") */
  status?: string;
  /** Default opening time in seconds from midnight (e.g., 30600 = 8:30 AM) */
  startTime: number;
  /** Default closing time in seconds from midnight (e.g., 64800 = 6:00 PM) */
  endTime: number;
  /** URL or path to the room's image */
  image: AirtableImage | null;
}

/**
 * Represents an image object as returned by Airtable's API.
 * Includes metadata about the image and its available thumbnail sizes.
 * 
 * @interface AirtableImage
 * @property {string} id - Unique identifier for the image.
 * @property {string} type - MIME type of the image (e.g., "image/png").
 * @property {number} size - Size of the image in bytes.
 * @property {string} url - Direct URL to access the image.
 * @property {string} filename - Original filename of the image.
 * @property {string} name - Name of the image (may be same as filename).
 * @property {number} width - Width of the image in pixels.
 * @property {number} height - Height of the image in pixels.
 * @property {Object} thumbnails - Object containing different thumbnail sizes.
 * @property {AirtableImage} thumbnails.small - Small thumbnail version of the image.
 * @property {AirtableImage} thumbnails.large - Large thumbnail version of the image.
 * @property {AirtableImage} thumbnails.full - Full-size thumbnail version of the image.
 */
export interface AirtableImage {
  id: string;
  type: string;
  size: number;
  url: string;
  filename: string;
  name: string;
  width: number;
  height: number;
  thumbnails: {
    small: AirtableImage;
    large: AirtableImage;
    full: AirtableImage;
  };
}

/**
 * Represents a room booking with all associated details
 * @interface Booking
 */
export interface Booking {
  /** Unique identifier for the booking */
  id: string;
  /** Display label for the user (e.g., full name) */
  userLabel: string;
  /** User identifier who made the booking */
  user: string;
  /** ISO 8601 timestamp when the booking starts */
  startTime: string;
  /** ISO 8601 timestamp when the booking ends */
  endTime: string;
  /** Optional note or description for the booking */
  note?: string;
  /** Identifier of the room being booked */
  room: string;
  /** Room name */
  roomName: string;
  /** Room location */
  roomLocation?: string;
  /** Current status of the booking (Confirmed, Cancelled, etc.) */
  status?: string;
}

/**
 * Constants for booking status values
 * @description Provides type-safe constants for booking statuses to ensure consistency
 * across the application and prevent typos in status strings.
 */
export const BOOKING_STATUS = {
  /** Booking is confirmed and active */
  CONFIRMED: 'Confirmed',
  /** Booking has been cancelled */
  CANCELLED: 'Cancelled',
} as const;

/**
 * Represents a user in the system
 * @interface User
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  /** Full display name of the user */
  name: string;
  /** URL or path to the user's profile image */
  image: string;
  /** Team or department the user belongs to */
  team: string;
}
