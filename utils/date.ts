/**
 * @fileoverview Date and time utility functions for the room booking application
 * @description Provides utility functions for formatting, parsing, and manipulating
 * dates and times used throughout the application for consistent date handling.
 */

/**
 * Formats a time value in seconds to HH:MM format
 * @param {number} time - Time in seconds from midnight (e.g., 28800 for 8:00 AM)
 * @returns {string} Formatted time string in HH:MM format (e.g., "08:00", "14:30")
 * @description Converts seconds since midnight to a human-readable time format.
 * Useful for displaying room operating hours and time slot labels.
 * @example
 * ```typescript
 * formatTime(28800); // Returns "08:00" (8:00 AM)
 * formatTime(52200); // Returns "14:30" (2:30 PM)
 * ```
 */
export function formatTime(time: number) {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Formats a Date object to YYYY-MM-DD string format
 * @param {Date} date - The date to format
 * @returns {string} Date string in YYYY-MM-DD format (ISO date format)
 * @description Converts a Date object to a standardized date string format
 * suitable for API requests, database storage, and HTML date inputs.
 * @example
 * ```typescript
 * formatDate(new Date('2024-03-15T10:30:00Z')); // Returns "2024-03-15"
 * ```
 */
export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Parses a date string (YYYY-MM-DD) to a Date object at midnight UTC
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object set to midnight UTC for the given date
 * @description Creates a Date object from a date string, ensuring consistent
 * timezone handling by setting the time to midnight UTC. This prevents
 * timezone-related issues when working with date-only values.
 * @example
 * ```typescript
 * parseDate("2024-03-15"); // Returns Date object for 2024-03-15T00:00:00.000Z
 * ```
 */
export function parseDate(dateString: string): Date {
    return new Date(dateString + 'T00:00:00.000Z');
}

/**
 * Adds a specified number of days to a date
 * @param {Date} date - The base date to add days to
 * @param {number} days - Number of days to add (can be negative to subtract)
 * @returns {Date} New Date object with the specified number of days added
 * @description Creates a new Date object by adding the specified number of days
 * to the input date. The original date object is not modified.
 * @example
 * ```typescript
 * const today = new Date('2024-03-15');
 * addDays(today, 7);  // Returns date for 2024-03-22
 * addDays(today, -3); // Returns date for 2024-03-12
 * ```
 */
export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Formats a date for user-friendly display with relative terms
 * @param {Date} date - The date to format for display
 * @param {string} [locale] - Optional locale string (e.g., 'en-US', 'it-IT', 'de-DE')
 * @returns {string} Human-readable date string (e.g., "Today", "Tomorrow", or full date)
 * @description Converts a date to a user-friendly display format, using relative
 * terms like "Today", "Tomorrow", "Yesterday" when appropriate, and falling back
 * to a full date format for other dates. Uses the specified locale or browser default.
 * @example
 * ```typescript
 * const today = new Date();
 * formatDisplayDate(today);                    // Returns "Today"
 * formatDisplayDate(addDays(today, 1));        // Returns "Tomorrow"
 * formatDisplayDate(addDays(today, -1));       // Returns "Yesterday"
 * formatDisplayDate(addDays(today, 7));        // Returns "Friday, March 22, 2024"
 * formatDisplayDate(addDays(today, 7), 'it-IT'); // Returns "venerdì 22 marzo 2024"
 * ```
 */
export function formatDisplayDate(date: Date, locale: string = 'en-US'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    const tomorrow = addDays(today, 1);
    const yesterday = addDays(today, -1);

    if (formatDate(date) === formatDate(today)) {
        return 'Today';
    } else if (formatDate(date) === formatDate(tomorrow)) {
        return 'Tomorrow';
    } else if (formatDate(date) === formatDate(yesterday)) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}