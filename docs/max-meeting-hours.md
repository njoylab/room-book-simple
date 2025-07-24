# Maximum Meeting Hours Configuration

This document explains how to configure and use the maximum meeting duration feature in the room booking system.

## Overview

The system now supports comprehensive booking validation with multiple levels of control:

1. **Maximum Meeting Duration**: Configurable limits on how long meetings can last
   - **Global Setting**: A default maximum duration that applies to all rooms
   - **Room-Specific Override**: Individual room settings that can override the global default

2. **Operating Hours Validation**: Ensures bookings are within each room's operating hours
   - **Standard Hours**: 8 AM to 6 PM (configurable per room)
   - **Extended Hours**: Support for rooms operating past midnight
   - **24-Hour Rooms**: Support for rooms that operate around the clock

## Environment Variable Configuration

### Global Maximum Meeting Hours

Set the `MAX_MEETING_HOURS` environment variable to define the default maximum duration for all meetings:

```bash
# In your .env file
MAX_MEETING_HOURS=8  # Default: 8 hours (1-24 range)
```

**Valid values**: 1-24 hours
**Default**: 8 hours

## Airtable Configuration

### Adding Room-Specific Limits

To set a custom maximum duration for a specific room, add a `maxMeetingHours` field to your meeting rooms table in Airtable:

1. **Open your Airtable base**
2. **Navigate to your Meeting Rooms table**
3. **Add a new field**:
   - **Field name**: `maxMeetingHours`
   - **Field type**: Number
   - **Description**: Maximum meeting duration in hours for this room

### Example Room Configuration

| Field | Value | Description |
|-------|-------|-------------|
| `name` | "Conference Room A" | Room name |
| `capacity` | 10 | Maximum capacity |
| `startTime` | 28800 | Opening time (8:00 AM) |
| `endTime` | 64800 | Closing time (6:00 PM) |
| `maxMeetingHours` | 4 | **Custom limit: 4 hours** |

## Operating Hours Configuration

### Room Operating Hours

Each room has configurable operating hours defined by `startTime` and `endTime` fields in Airtable:

- **`startTime`**: Opening time in seconds from midnight (e.g., 28800 = 8:00 AM)
- **`endTime`**: Closing time in seconds from midnight (e.g., 64800 = 6:00 PM)

### Supported Operating Hour Patterns

1. **Standard Hours** (e.g., 8 AM - 6 PM)
   - `startTime`: 28800 (8:00 AM)
   - `endTime`: 64800 (6:00 PM)

2. **Extended Hours** (e.g., 6 PM - 1 AM next day)
   - `startTime`: 64800 (6:00 PM)
   - `endTime`: 3600 (1:00 AM next day)

3. **24-Hour Operation**
   - `startTime`: 0 (12:00 AM)
   - `endTime`: 86400 (12:00 AM next day)

### Example Operating Hour Configurations

| Room Type | startTime | endTime | Description |
|-----------|-----------|---------|-------------|
| Standard Office | 28800 | 64800 | 8:00 AM - 6:00 PM |
| Evening Room | 64800 | 3600 | 6:00 PM - 1:00 AM |
| 24-Hour Room | 0 | 86400 | Always open |
| Night Shift | 64800 | 28800 | 6:00 PM - 8:00 AM |

## How It Works

### Priority System

1. **Room-specific limit**: If a room has `maxMeetingHours` set, this value is used
2. **Global default**: If no room-specific limit is set, the `MAX_MEETING_HOURS` environment variable is used

### Validation Process

When creating a booking, the system performs two key validations:

1. **Duration Validation**: Checks if the meeting duration exceeds the maximum allowed hours
2. **Operating Hours Validation**: Ensures the booking is within the room's operating hours

### Validation Examples

```typescript
// Room with custom limit (4 hours)
const roomWithCustomLimit = {
  id: 'room1',
  name: 'Small Meeting Room',
  maxMeetingHours: 4
};

// Room without custom limit (uses global default of 8 hours)
const roomWithDefaultLimit = {
  id: 'room2',
  name: 'Large Conference Room'
  // maxMeetingHours: undefined
};
```

### API Behavior

When creating a booking, the system will:

1. **Check the room's configuration** for a custom `maxMeetingHours` value
2. **Validate the booking duration** against the applicable limit
3. **Validate the booking is within operating hours** for the specific room
4. **Return an error** if either validation fails

#### Example API Responses

**Duration Validation Error:**
```json
{
  "error": "Meeting duration exceeds the maximum allowed time of 4 hours for this room",
  "type": "VALIDATION_ERROR"
}
```

**Operating Hours Validation Error:**
```json
{
  "error": "Booking must be within the room's operating hours (08:00 - 18:00)",
  "type": "VALIDATION_ERROR"
}
```

## Use Cases

### Scenario 1: Short Meeting Rooms
- **Room**: Small huddle room
- **Custom limit**: 2 hours
- **Use case**: Quick team meetings, 1-on-1s

### Scenario 2: Training Rooms
- **Room**: Large training room
- **Custom limit**: 6 hours
- **Use case**: Training sessions, workshops

### Scenario 3: Standard Rooms
- **Room**: Regular conference room
- **Custom limit**: None (uses global default)
- **Use case**: Standard meetings, presentations

### Scenario 4: Evening Rooms
- **Room**: Evening meeting room
- **Operating hours**: 6:00 PM - 1:00 AM
- **Use case**: After-hours meetings, team events

### Scenario 5: 24-Hour Rooms
- **Room**: Always-available room
- **Operating hours**: 24/7
- **Use case**: Emergency meetings, global teams, shift work

## Migration Guide

### For Existing Rooms

1. **No action required**: Existing rooms will automatically use the global `MAX_MEETING_HOURS` setting
2. **Optional customization**: Add `maxMeetingHours` field to specific rooms as needed

### For New Rooms

1. **Set global default**: Configure `MAX_MEETING_HOURS` in your environment
2. **Add custom limits**: Set `maxMeetingHours` for rooms that need different limits

## Testing

### Environment Variable Test

```bash
# Test with 4-hour global limit
MAX_MEETING_HOURS=4 npm test

# Test with 12-hour global limit
MAX_MEETING_HOURS=12 npm test
```

### Room-Specific Test

```typescript
// Test room with custom limit
const testRoom = {
  id: 'test-room',
  name: 'Test Room',
  maxMeetingHours: 2
};

// This should pass (1 hour meeting)
const validBooking = {
  startTime: '2024-01-01T09:00:00.000Z',
  endTime: '2024-01-01T10:00:00.000Z'
};

// This should fail (3 hour meeting)
const invalidBooking = {
  startTime: '2024-01-01T09:00:00.000Z',
  endTime: '2024-01-01T12:00:00.000Z'
};
```

### Operating Hours Test

```typescript
// Test room with standard hours (8 AM - 6 PM)
const standardRoom = {
  id: 'standard-room',
  name: 'Standard Room',
  startTime: 28800, // 8:00 AM
  endTime: 64800    // 6:00 PM
};

// This should pass (within operating hours)
const validBooking = {
  startTime: '2024-01-01T09:00:00.000Z', // 9:00 AM
  endTime: '2024-01-01T10:00:00.000Z'    // 10:00 AM
};

// This should fail (before opening time)
const invalidBooking = {
  startTime: '2024-01-01T07:00:00.000Z', // 7:00 AM
  endTime: '2024-01-01T08:00:00.000Z'    // 8:00 AM
};
```

## Troubleshooting

### Common Issues

1. **"Meeting duration exceeds maximum" error**
   - Check the room's `maxMeetingHours` field in Airtable
   - Verify the `MAX_MEETING_HOURS` environment variable
   - Ensure the booking duration is within the allowed range

2. **"Booking must be within operating hours" error**
   - Check the room's `startTime` and `endTime` fields in Airtable
   - Verify the booking times are within the room's operating hours
   - For rooms operating past midnight, ensure proper time configuration

3. **Room not found error**
   - Verify the room ID is correct
   - Check that the room exists in Airtable

4. **Unexpected validation behavior**
   - Check that the `maxMeetingHours` field is a number in Airtable
   - Verify the environment variable is set correctly
   - Ensure `startTime` and `endTime` are properly configured in seconds from midnight

### Debug Information

The system logs the following information for debugging:

- Room ID being validated
- Applied maximum hours (room-specific or global)
- Actual booking duration
- Room operating hours (startTime/endTime)
- Booking start and end times
- Validation results for both duration and operating hours

## Best Practices

1. **Set reasonable defaults**: Use the global setting for most rooms
2. **Use custom limits sparingly**: Only override for rooms with specific requirements
3. **Configure operating hours appropriately**: Set realistic operating hours for each room type
4. **Document your configuration**: Keep track of which rooms have custom limits and operating hours
5. **Test thoroughly**: Verify both duration and operating hours validation work as expected
6. **Monitor usage**: Track how often limits are hit to optimize settings
7. **Consider time zones**: Ensure operating hours are configured for the correct time zone