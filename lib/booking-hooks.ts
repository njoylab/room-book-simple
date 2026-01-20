import { MeetingRoom, Booking, User } from './types';
import { CreateBookingData } from './validation';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface BookingHookContext {
  user: User;
  room: MeetingRoom;
  existingBookings?: Booking[];
}

export interface BookingHook {
  validateBooking?: (
    booking: CreateBookingData,
    context: BookingHookContext
  ) => Promise<ValidationResult> | ValidationResult;

  beforeCreate?: (
    booking: CreateBookingData,
    context: BookingHookContext
  ) => Promise<CreateBookingData> | CreateBookingData;

  afterCreate?: (
    booking: Booking,
    context: BookingHookContext
  ) => Promise<void> | void;

  beforeUpdate?: (
    bookingId: string,
    updates: Partial<Booking>,
    context: BookingHookContext
  ) => Promise<Partial<Booking>> | Partial<Booking>;

  afterUpdate?: (
    booking: Booking,
    context: BookingHookContext
  ) => Promise<void> | void;
}

class BookingHooksManager {
  private hooks: BookingHook[] = [];
  private loaded = false;

  async loadHooks(): Promise<void> {
    if (this.loaded) return;

    try {
      // Dynamic import with error handling - file may not exist
      const customHooks = await import('../custom/booking-hooks').catch(() => null);
      if (customHooks) {
        const defaultHook = customHooks.default;
        if (defaultHook) {
          this.hooks.push(defaultHook);
        }
        if (customHooks.hooks && Array.isArray(customHooks.hooks)) {
          this.hooks.push(...customHooks.hooks);
        }
      }
    } catch {
      // No custom hooks or import error - this is fine
    }

    this.loaded = true;
  }

  async validateBooking(
    booking: CreateBookingData,
    context: BookingHookContext
  ): Promise<ValidationResult> {
    await this.loadHooks();

    for (const hook of this.hooks) {
      if (hook.validateBooking) {
        const result = await hook.validateBooking(booking, context);
        if (!result.valid) {
          return result;
        }
      }
    }

    return { valid: true };
  }

  async beforeCreate(
    booking: CreateBookingData,
    context: BookingHookContext
  ): Promise<CreateBookingData> {
    await this.loadHooks();

    let modifiedBooking = { ...booking };

    for (const hook of this.hooks) {
      if (hook.beforeCreate) {
        modifiedBooking = await hook.beforeCreate(modifiedBooking, context);
      }
    }

    return modifiedBooking;
  }

  async afterCreate(
    booking: Booking,
    context: BookingHookContext
  ): Promise<void> {
    await this.loadHooks();

    for (const hook of this.hooks) {
      if (hook.afterCreate) {
        await hook.afterCreate(booking, context);
      }
    }
  }

  async beforeUpdate(
    bookingId: string,
    updates: Partial<Booking>,
    context: BookingHookContext
  ): Promise<Partial<Booking>> {
    await this.loadHooks();

    let modifiedUpdates = { ...updates };

    for (const hook of this.hooks) {
      if (hook.beforeUpdate) {
        modifiedUpdates = await hook.beforeUpdate(bookingId, modifiedUpdates, context);
      }
    }

    return modifiedUpdates;
  }

  async afterUpdate(
    booking: Booking,
    context: BookingHookContext
  ): Promise<void> {
    await this.loadHooks();

    for (const hook of this.hooks) {
      if (hook.afterUpdate) {
        await hook.afterUpdate(booking, context);
      }
    }
  }
}

export const bookingHooks = new BookingHooksManager();
