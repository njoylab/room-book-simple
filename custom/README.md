# Custom Booking Hooks

This directory contains custom booking logic that can be tailored to specific installations without modifying the core codebase.

## Setup

1. Edit `booking-hooks.ts` to add your custom hooks (it starts empty)
2. Optionally reference `booking-hooks.example.ts` for examples
3. The system will automatically load and use your custom hooks

## Available Hooks

### `validateBooking`
- **Purpose**: Custom validation logic for booking creation
- **Parameters**: `booking` data, `context` (user, room, existing bookings)
- **Return**: `{ valid: boolean, error?: string }`
- **Use cases**: Business rules, user restrictions, time-based rules

### `beforeCreate`
- **Purpose**: Modify booking data before saving to database
- **Parameters**: `booking` data, `context`
- **Return**: Modified `booking` data
- **Use cases**: Auto-fill fields, adjust times, add prefixes

### `afterCreate`
- **Purpose**: Execute actions after booking creation
- **Parameters**: Created `booking`, `context`
- **Return**: `void`
- **Use cases**: Notifications, logging, integrations

### `beforeUpdate`
- **Purpose**: Modify booking updates before saving
- **Parameters**: `bookingId`, `updates`, `context`
- **Return**: Modified `updates`
- **Use cases**: Add audit trails, modify cancellation logic

### `afterUpdate`
- **Purpose**: Execute actions after booking updates
- **Parameters**: Updated `booking`, `context`
- **Return**: `void`
- **Use cases**: Notifications, cleanup, logging

## Context Object

Each hook receives a context object with:
- `user`: Current authenticated user
- `room`: Room being booked
- `existingBookings`: Array of existing bookings (optional)

## Example Use Cases

- **Weekend restrictions**: Prevent bookings on weekends
- **User-based limits**: Different booking limits for different user types
- **Room-specific rules**: Executive rooms only for managers
- **Auto-extensions**: Extend short meetings to minimum duration
- **Audit logging**: Log all booking activities
- **Notifications**: Send alerts for long meetings or cancellations
- **Integration**: Sync with external calendar systems

## File Structure

```
custom/
├── README.md                 # This file
├── booking-hooks.example.ts  # Example implementation
└── booking-hooks.ts          # Your custom implementation
```

## Notes

- Keep `booking-hooks.ts` as a no-op if you don't need custom logic
- Multiple hooks can be exported as an array if needed
- Hooks are executed in the order they are defined
- All hooks are optional - implement only what you need
- Hooks support both async and sync implementations
