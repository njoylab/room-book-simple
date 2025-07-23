# API Reference

This document provides a complete reference for all API endpoints in the Meeting Room Booking System.

## Authentication Endpoints

### GET /api/auth/user
Get current authenticated user information.

**Response:**
```json
{
  "user": {
    "id": "U1234567890",
    "name": "John Doe",
    "image": "https://avatars.slack-edge.com/...",
    "team": "T1234567890"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `500 Internal Server Error` - Server error

### POST /api/auth/logout
Log out the current user and clear session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/slack
Initiate Slack OAuth flow. Redirects to Slack for authentication.

**Query Parameters:**
- `redirect_uri` (optional) - Custom redirect URI

**Response:** Redirects to Slack OAuth

## Room Management Endpoints

### GET /api/rooms
Get all meeting rooms.

**Response:**
```json
{
  "rooms": [
    {
      "id": "rec1234567890",
      "name": "Conference Room A",
      "capacity": 10,
      "notes": "Main conference room",
      "location": "Floor 1",
      "status": "Available",
      "startTime": 28800,
      "endTime": 64800
    }
  ]
}
```

**Error Responses:**
- `500 Internal Server Error` - Database error

### GET /api/rooms/[id]/slots
Get available time slots for a specific room on a given date.

**Query Parameters:**
- `date` (required) - Date in YYYY-MM-DD format

**Response:**
```json
{
  "slots": [
    {
      "start": "2024-01-17T09:00:00.000Z",
      "end": "2024-01-17T09:30:00.000Z",
      "available": true
    }
  ],
  "room": {
    "id": "rec1234567890",
    "name": "Conference Room A",
    "startTime": 28800,
    "endTime": 64800
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid date format
- `404 Not Found` - Room not found
- `500 Internal Server Error` - Server error

### GET /api/rooms/[id]/bookings
Get all bookings for a specific room.

**Response:**
```json
{
  "bookings": [
    {
      "id": "rec1234567890",
      "user": "U1234567890",
      "userLabel": "John Doe",
      "startTime": "2024-01-17T09:00:00.000Z",
      "endTime": "2024-01-17T10:00:00.000Z",
      "note": "Team meeting",
      "room": "rec1234567890",
      "status": "Confirmed"
    }
  ]
}
```

## Booking Management Endpoints

### GET /api/bookings
Get all bookings, optionally filtered by user.

**Query Parameters:**
- `user` (optional) - Filter by user ID

**Response:**
```json
{
  "bookings": [
    {
      "id": "rec1234567890",
      "user": "U1234567890",
      "userLabel": "John Doe",
      "startTime": "2024-01-17T09:00:00.000Z",
      "endTime": "2024-01-17T10:00:00.000Z",
      "note": "Team meeting",
      "room": "rec1234567890",
      "status": "Confirmed"
    }
  ]
}
```

### POST /api/bookings
Create a new booking.

**Request Body:**
```json
{
  "roomId": "rec1234567890",
  "startTime": "2024-01-17T09:00:00.000Z",
  "endTime": "2024-01-17T10:00:00.000Z",
  "note": "Team meeting"
}
```

**Response:**
```json
{
  "booking": {
    "id": "rec1234567890",
    "user": "U1234567890",
    "userLabel": "John Doe",
    "startTime": "2024-01-17T09:00:00.000Z",
    "endTime": "2024-01-17T10:00:00.000Z",
    "note": "Team meeting",
    "room": "rec1234567890",
    "status": "Confirmed"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid booking data
- `401 Unauthorized` - User not authenticated
- `409 Conflict` - Time slot already booked
- `500 Internal Server Error` - Server error

### PATCH /api/bookings/[id]
Update a booking (typically to cancel it).

**Request Body:**
```json
{
  "status": "Cancelled"
}
```

**Response:**
```json
{
  "booking": {
    "id": "rec1234567890",
    "status": "Cancelled"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid status
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User doesn't own the booking
- `404 Not Found` - Booking not found
- `500 Internal Server Error` - Server error

## Calendar Integration Endpoints

### GET /api/bookings/calendar
Get upcoming bookings for calendar integration.

**Query Parameters:**
- `user` (optional) - Filter by user ID
- `hours` (optional) - Hours to look ahead (default: 24)

**Response:**
```json
{
  "bookings": [
    {
      "id": "rec1234567890",
      "title": "Meeting Room: Conference Room A",
      "start": "2024-01-17T09:00:00.000Z",
      "end": "2024-01-17T10:00:00.000Z",
      "description": "Booked by John Doe\nTeam meeting",
      "location": "Conference Room A"
    }
  ]
}
```

### GET /api/bookings/[id]/calendar
Export a single booking in calendar format.

**Query Parameters:**
- `format` (required) - Export format: `ics`, `google`, or `outlook`

**Response:**
- `ics`: Downloads ICS file
- `google`: Redirects to Google Calendar
- `outlook`: Redirects to Outlook Calendar

### GET /api/calendar/integration
Get calendar feed for external calendar applications.

**Query Parameters:**
- `user` (optional) - Filter by user ID
- `room` (optional) - Filter by room ID
- `token` (required) - Authentication token

**Response:** ICS calendar feed

## Slack Bot Endpoints

### POST /api/slack/bot
Handle Slack bot interactions (slash commands and interactive components).

**Request Body:** Slack event payload

**Response:**
```json
{
  "response_type": "ephemeral",
  "text": "Your upcoming bookings...",
  "attachments": [...]
}
```

## Error Response Format

All API endpoints return errors in a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid booking data",
    "details": {
      "field": "startTime",
      "issue": "Start time must be in the future"
    }
  }
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Authentication endpoints: 5 requests per minute
- Booking endpoints: 10 requests per minute
- Room endpoints: 20 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Authentication

Most endpoints require authentication via Slack OAuth. Include the session cookie in requests:
```
Cookie: room_booking_user=<encrypted-session-token>
```

## CORS

The API supports CORS for cross-origin requests. Configure allowed origins via the `ALLOWED_ORIGINS` environment variable.

## Data Formats

- **Dates**: ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- **Times**: Seconds from midnight (e.g., 28800 = 8:00 AM)
- **IDs**: Airtable record IDs (rec...)
- **User IDs**: Slack user IDs (U...)