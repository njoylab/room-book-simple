/**
 * @fileoverview Date and time utility functions for the room booking application
 * @description Provides utility functions for formatting, parsing, and manipulating
 * dates and times used throughout the application for consistent date handling.
 */

/**
 * Formats a time value in seconds to HH:MM format in the user's local timezone
 * @param {number} time - Time in seconds from midnight UTC (e.g., 28800 for 8:00 AM UTC)
 * @param {boolean} [convertFromUTC=false] - Whether to convert from UTC to local timezone
 * @returns {string} Formatted time string in HH:MM format (e.g., "08:00", "14:30")
 * @description Converts seconds since midnight UTC to a human-readable time format
 * in the user's local timezone. Useful for displaying room operating hours and time slot labels.
 * @example
 * ```typescript
 * // If user is in UTC+1 timezone:
 * formatTime(28800); // Returns "09:00" (8:00 UTC = 9:00 local)
 * formatTime(52200); // Returns "15:30" (14:30 UTC = 15:30 local)
 * ```
 */
export function formatTime(time: number, convertFromUTC: boolean = false, anchorDate?: Date) {
    if (!convertFromUTC) {
        // Simple conversion without timezone adjustment
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Convert UTC time (seconds from midnight) to local timezone
    // Anchor to the provided date or to today to respect DST offsets
    const anchor = anchorDate ?? new Date();
    const utcDate = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 0, 0, 0));
    utcDate.setUTCSeconds(time); // add seconds from midnight UTC

    // Format in local timezone using the anchor day's offset (DST-aware)
    const hours = utcDate.getHours();
    const minutes = utcDate.getMinutes();
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

/**
 * Gets the name of a day of the week from its numeric index
 * @param {number} dayIndex - Day index (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @param {string} [locale='en-US'] - Locale string for day name formatting
 * @returns {string} The name of the day in the specified locale
 * @description Converts a numeric day index to its corresponding day name.
 * Uses native Date API for internationalization support.
 * @example
 * ```typescript
 * getDayName(0);           // Returns "Sunday"
 * getDayName(1);           // Returns "Monday"
 * getDayName(5, 'it-IT');  // Returns "venerdì"
 * ```
 */
export function getDayName(dayIndex: number, locale = 'en-US'): string {
    // Normalize and coerce to integer day index (0-6)
    const idx = ((Number(dayIndex) % 7) + 7) % 7;
    // Create a date that falls on the desired day (using Jan 5, 2025 as Sunday base)
    const date = new Date(2025, 0, 5 + idx);
    return date.toLocaleDateString(locale, { weekday: 'long' });
}

/**
 * Formats an array of blocked day indices into a comma-separated string of day names
 * @param {number[]} blockedDays - Array of day indices (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @param {string} [locale='en-US'] - Locale string for day name formatting
 * @returns {string} Comma-separated list of day names
 * @description Converts an array of numeric day indices to a human-readable
 * comma-separated list of day names in the specified locale.
 * @example
 * ```typescript
 * formatBlockedDays([0, 6]);        // Returns "Sunday, Saturday"
 * formatBlockedDays([1, 3, 5]);     // Returns "Monday, Wednesday, Friday"
 * formatBlockedDays([0, 6], 'it-IT'); // Returns "domenica, sabato"
 * ```
 */
export function formatBlockedDays(blockedDays: number[], locale = 'en-US'): string {
    return blockedDays
        .map(day => ((Number(day) % 7) + 7) % 7)
        .map(day => getDayName(day, locale))
        .join(', ');
}
