# Maximum Meeting Hours Configuration

This document explains how to configure and use the maximum meeting duration feature in the room booking system.

## Overview

The system now supports configurable maximum meeting durations with two levels of control:

1. **Global Setting**: A default maximum duration that applies to all rooms
2. **Room-Specific Override**: Individual room settings that can override the global default

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

## How It Works

### Priority System

1. **Room-specific limit**: If a room has `maxMeetingHours` set, this value is used
2. **Global default**: If no room-specific limit is set, the `MAX_MEETING_HOURS` environment variable is used

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
3. **Return an error** if the duration exceeds the maximum allowed time

#### Example API Response

```json
{
  "error": "Meeting duration exceeds the maximum allowed time of 4 hours for this room",
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

## Troubleshooting

### Common Issues

1. **"Meeting duration exceeds maximum" error**
   - Check the room's `maxMeetingHours` field in Airtable
   - Verify the `MAX_MEETING_HOURS` environment variable
   - Ensure the booking duration is within the allowed range

2. **Room not found error**
   - Verify the room ID is correct
   - Check that the room exists in Airtable

3. **Unexpected validation behavior**
   - Check that the `maxMeetingHours` field is a number in Airtable
   - Verify the environment variable is set correctly

### Debug Information

The system logs the following information for debugging:

- Room ID being validated
- Applied maximum hours (room-specific or global)
- Actual booking duration
- Validation result

## Best Practices

1. **Set reasonable defaults**: Use the global setting for most rooms
2. **Use custom limits sparingly**: Only override for rooms with specific requirements
3. **Document your limits**: Keep track of which rooms have custom limits
4. **Test thoroughly**: Verify validation works as expected in your environment
5. **Monitor usage**: Track how often the limits are hit to optimize settings