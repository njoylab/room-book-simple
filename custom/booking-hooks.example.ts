import { BookingHook, ValidationResult, BookingHookContext } from '../lib/booking-hooks';
import { CreateBookingData } from '../lib/validation';
import { Booking } from '../lib/types';

/**
 * Example custom booking hook implementation
 *
 * Copy this file to `booking-hooks.ts` in the same directory and customize as needed.
 * The system will automatically load and use your custom hooks.
 */

const exampleHook: BookingHook = {
  /**
   * Custom validation logic for bookings
   * Return { valid: false, error: "message" } to reject a booking
   */
  async validateBooking(booking: CreateBookingData, context: BookingHookContext): Promise<ValidationResult> {
    // Example: Prevent bookings on weekends
    const bookingDate = new Date(booking.startTime);
    const dayOfWeek = bookingDate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        valid: false,
        error: "Bookings are not allowed on weekends"
      };
    }

    // Example: Limit booking duration for certain users
    const duration = new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime();
    const durationHours = duration / (1000 * 60 * 60);

    if (context.user.email.includes('intern') && durationHours > 2) {
      return {
        valid: false,
        error: "Interns can only book rooms for a maximum of 2 hours"
      };
    }

    // Example: Room-specific restrictions
    if (context.room.name.includes('Executive') && !context.user.email.includes('manager')) {
      return {
        valid: false,
        error: "Executive rooms can only be booked by managers"
      };
    }

    return { valid: true };
  },

  /**
   * Modify booking data before it's saved to the database
   */
  async beforeCreate(booking: CreateBookingData, context: BookingHookContext): Promise<CreateBookingData> {
    // Example: Add automatic note prefix for certain users
    let modifiedBooking = { ...booking };

    if (context.user.team === 'Sales') {
      modifiedBooking.note = `[Sales Team] ${modifiedBooking.note || ''}`.trim();
    }

    // Example: Auto-extend short meetings
    const duration = new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime();
    const durationMinutes = duration / (1000 * 60);

    if (durationMinutes < 30) {
      const startTime = new Date(booking.startTime);
      const extendedEndTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      modifiedBooking.endTime = extendedEndTime.toISOString();
    }

    return modifiedBooking;
  },

  /**
   * Execute actions after a booking is created
   */
  async afterCreate(booking: Booking, context: BookingHookContext): Promise<void> {
    // Example: Send notification to team lead for long meetings
    const duration = new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime();
    const durationHours = duration / (1000 * 60 * 60);

    if (durationHours > 4) {
      console.log(`Long meeting alert: ${context.user.name} booked ${context.room.name} for ${durationHours} hours`);
      // Here you could send an email, Slack message, etc.
    }

    // Example: Log all bookings for audit purposes
    console.log(`Booking created: User ${context.user.email} booked ${context.room.name} from ${booking.startTime} to ${booking.endTime}`);
  },

  /**
   * Modify booking updates before they're saved
   */
  async beforeUpdate(bookingId: string, updates: Partial<Booking>, context: BookingHookContext): Promise<Partial<Booking>> {
    // Example: Add timestamp to notes when booking is cancelled
    if (updates.status === 'Cancelled') {
      const currentNote = updates.note || '';
      const timestamp = new Date().toISOString();
      updates.note = `${currentNote} [Cancelled at ${timestamp}]`.trim();
    }

    return updates;
  },

  /**
   * Execute actions after a booking is updated
   */
  async afterUpdate(booking: Booking, context: BookingHookContext): Promise<void> {
    // Example: Log booking cancellations
    if (booking.status === 'Cancelled') {
      console.log(`Booking cancelled: ${context.user.email} cancelled booking for ${context.room?.name || 'unknown room'}`);
    }
  }
};

// Export as default - this will be automatically loaded by the system
export default exampleHook;

// Alternative: export multiple hooks as an array
// export const hooks: BookingHook[] = [exampleHook, anotherHook];