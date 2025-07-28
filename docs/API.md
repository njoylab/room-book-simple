# API Documentation

## Overview

The Meeting Room Booking System provides a RESTful API for managing room bookings, user authentication, and calendar integration. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL

```
https://your-domain.com/api
```

## Authentication

Most endpoints require authentication via Slack OAuth. Authentication is handled through session cookies set after successful OAuth flow.

### Authentication Flow

1. **Redirect to Slack OAuth**: `GET /api/auth/slack`
2. **Handle OAuth callback**: `GET /api/auth/slack/callback`
3. **Check authentication status**: `GET /api/auth/user`
4. **Logout**: `POST /api/auth/logout`

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Booking creation**: 10 requests per minute per user
- **Authentication endpoints**: 20 requests per minute per IP

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | User must be authenticated |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., double booking) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Endpoints

### Authentication

#### GET /api/auth/slack
Redirects user to Slack OAuth for authentication.

**Response**: 302 Redirect to Slack OAuth URL

#### GET /api/auth/slack/callback
Handles OAuth callback from Slack.

**Query Parameters**:
- `code` (string, required): OAuth authorization code
- `state` (string, required): OAuth state parameter

**Response**: 302 Redirect to application home page

#### GET /api/auth/user
Get current authenticated user information.

**Response** (200):
```json
{
  "id": "U1234567890",
  "name": "John Doe",
  "image": "https://example.com/avatar.jpg",
  "team": "Engineering"
}
```

**Response** (401): User not authenticated
```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "User must be authenticated"
  }
}
```

#### POST /api/auth/logout
Log out the current user.

**Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Rooms

#### GET /api/rooms
Get all meeting rooms.

**Response** (200):
```json
[
  {
    "id": "rec1234567890123",
    "name": "Conference Room A",
    "capacity": 10,
    "notes": "Has projector and whiteboard",
    "location": "Floor 2",
    "status": "Available",
    "startTime": 28800,
    "endTime": 64800,
    "image": {
      "id": "att1234567890123",
      "url": "https://example.com/room.jpg",
      "thumbnails": {
        "small": { "url": "https://example.com/room-small.jpg" },
        "large": { "url": "https://example.com/room-large.jpg" }
      }
    },
    "maxMeetingHours": 4,
    "tags": ["Conference", "Video Call"]
  }
]
```

---

### Bookings

#### GET /api/bookings
Get all bookings (administrative use).

**Response** (200): Array of booking objects
```json
[
  {
    "id": "rec1234567890123",
    "userLabel": "John Doe",
    "user": "U1234567890",
    "startTime": "2024-03-15T14:00:00.000Z",
    "endTime": "2024-03-15T15:00:00.000Z",
    "note": "Weekly team sync",
    "room": "rec9876543210987",
    "roomName": "Conference Room A",
    "roomLocation": "Floor 2",
    "status": "Confirmed"
  }
]
```

#### POST /api/bookings
Create a new room booking.

**Authentication**: Required

**Request Body**:
```json
{
  "roomId": "rec9876543210987",
  "startTime": "2024-03-15T14:00:00.000Z",
  "endTime": "2024-03-15T15:00:00.000Z",
  "note": "Weekly team sync"
}
```

**Validation Rules**:
- `roomId`: Must be valid Airtable record ID
- `startTime`: Must be ISO 8601 datetime, not in the past
- `endTime`: Must be after `startTime`
- `note`: Optional, max 500 characters

**Response** (201): Created booking object
```json
{
  "id": "rec1234567890123",
  "userLabel": "John Doe",
  "user": "U1234567890",
  "startTime": "2024-03-15T14:00:00.000Z",
  "endTime": "2024-03-15T15:00:00.000Z",
  "note": "Weekly team sync",
  "room": "rec9876543210987",
  "roomName": "Conference Room A",
  "roomLocation": "Floor 2",
  "status": "Confirmed"
}
```

**Error Responses**:
- 400: Validation error
- 401: Authentication required
- 404: Room not found
- 409: Time slot already booked
- 429: Rate limit exceeded

#### GET /api/bookings/{id}
Get a specific booking by ID.

**Path Parameters**:
- `id` (string, required): Booking ID

**Response** (200): Booking object
**Response** (404): Booking not found

#### PATCH /api/bookings/{id}
Update a booking (currently only supports cancellation).

**Authentication**: Required (must be booking owner)

**Path Parameters**:
- `id` (string, required): Booking ID

**Request Body**:
```json
{
  "status": "Cancelled"
}
```

**Response** (200): Updated booking object
**Response** (401): Not authorized
**Response** (404): Booking not found

---

### Room Availability

#### GET /api/rooms/{id}/slots
Get available time slots for a specific room and date.

**Path Parameters**:
- `id` (string, required): Room ID

**Query Parameters**:
- `date` (string, required): Date in YYYY-MM-DD format

**Response** (200):
```json
[
  {
    "label": "09:00",
    "startTime": "2024-03-15T09:00:00.000Z",
    "endTime": "2024-03-15T09:30:00.000Z",
    "isBooked": false,
    "isPast": false
  },
  {
    "label": "09:30",
    "startTime": "2024-03-15T09:30:00.000Z",
    "endTime": "2024-03-15T10:00:00.000Z",
    "isBooked": true,
    "isPast": false,
    "booking": {
      "id": "rec1234567890123",
      "userLabel": "Jane Smith",
      "startTime": "2024-03-15T09:30:00.000Z",
      "endTime": "2024-03-15T10:00:00.000Z"
    }
  }
]
```

---

### Calendar Integration

#### GET /api/bookings/calendar
Get all user's future bookings in ICS format.

**Authentication**: Required

**Query Parameters**:
- `format` (string, optional): Calendar format (`ics`, `google`, `outlook`)

**Response** (200): Calendar file
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Meeting Room Booking//EN
BEGIN:VEVENT
UID:rec1234567890123
DTSTART:20240315T140000Z
DTEND:20240315T150000Z
SUMMARY:Team Meeting - Conference Room A
DESCRIPTION:Weekly team sync
LOCATION:Floor 2
END:VEVENT
END:VCALENDAR
```

#### GET /api/bookings/{id}/calendar
Get specific booking in calendar format.

**Path Parameters**:
- `id` (string, required): Booking ID

**Query Parameters**:
- `format` (string, optional): Calendar format (`ics`, `google`, `outlook`)

**Response** (200): Calendar file
**Response** (404): Booking not found

---

### Slack Integration

#### POST /api/slack/bot
Handle Slack slash commands and interactions.

**Headers**:
- `X-Slack-Signature` (required): Slack request signature
- `X-Slack-Request-Timestamp` (required): Request timestamp

**Request Body**: Slack event payload

**Response** (200): Slack response format

**Available Commands**:
- `/bookings` - Show user's upcoming bookings
- `/rooms` - Show available rooms

---

### Webhooks

#### POST /api/webhooks/airtable
Handle Airtable webhook notifications for cache invalidation.

**Headers**:
- `X-Airtable-Webhook-Signature` (required): Webhook signature

**Request Body**: Airtable webhook payload

**Response** (200): Success acknowledgment

---

## Usage Examples

### JavaScript/TypeScript

```typescript
// Get all rooms
const rooms = await fetch('/api/rooms').then(r => r.json());

// Create a booking
const booking = await fetch('/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roomId: 'rec9876543210987',
    startTime: '2024-03-15T14:00:00.000Z',
    endTime: '2024-03-15T15:00:00.000Z',
    note: 'Team meeting'
  })
}).then(r => r.json());

// Get room availability
const slots = await fetch('/api/rooms/rec9876543210987/slots?date=2024-03-15')
  .then(r => r.json());
```

### cURL

```bash
# Get all rooms
curl -X GET https://your-domain.com/api/rooms

# Create a booking
curl -X POST https://your-domain.com/api/bookings \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{
    "roomId": "rec9876543210987",
    "startTime": "2024-03-15T14:00:00.000Z",
    "endTime": "2024-03-15T15:00:00.000Z",
    "note": "Team meeting"
  }'

# Get calendar export
curl -X GET "https://your-domain.com/api/bookings/calendar?format=ics" \
  -H "Cookie: session=your-session-cookie"
```

### Python

```python
import requests

# Get all rooms
response = requests.get('https://your-domain.com/api/rooms')
rooms = response.json()

# Create a booking
booking_data = {
    'roomId': 'rec9876543210987',
    'startTime': '2024-03-15T14:00:00.000Z',
    'endTime': '2024-03-15T15:00:00.000Z',
    'note': 'Team meeting'
}

response = requests.post(
    'https://your-domain.com/api/bookings',
    json=booking_data,
    cookies={'session': 'your-session-cookie'}
)
booking = response.json()
```

---

## Environment Variables

The API requires the following environment variables:

```env
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_MEETING_ROOMS_TABLE=Meeting Rooms
AIRTABLE_BOOKINGS_TABLE=Bookings

# Slack Configuration
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret

# Application Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.com

# Optional Configuration
MAX_MEETING_HOURS=8
ROOM_CACHE_TIME=300
UPCOMING_MEETINGS_HOURS=24
```

---

## Support

For API support and questions, please refer to the main project documentation or create an issue in the project repository.