# Calendar Integration

This document describes the calendar integration features available in the Room Book Simple application.

## Features

### 1. Individual Event Export

From any booking detail modal, users can export individual events to their calendars in several formats:

- **Download ICS**: Downloads a `.ics` file that can be imported into any calendar application
- **Google Calendar**: Opens Google Calendar with the event pre-filled
- **Outlook Calendar**: Opens Outlook Calendar with the event pre-filled

### 2. Calendar Feeds (Subscription)

The application provides calendar feed endpoints that can be subscribed to by external calendar applications:

#### User-specific Feed
```
GET /api/calendar/integration?user={userId}&token=calendar-feed-token
```
Returns an ICS feed containing all bookings for a specific user.

#### Room-specific Feed
```
GET /api/calendar/integration?room={roomId}&token=calendar-feed-token
```
Returns an ICS feed containing all bookings for a specific room.

#### All Bookings Feed
```
GET /api/calendar/integration?token=calendar-feed-token
```
Returns an ICS feed containing all confirmed bookings.

### 3. Individual Booking Export API

```
GET /api/bookings/{bookingId}/calendar?format={ics|google|outlook}
```

Exports a single booking in the specified format:
- `format=ics`: Downloads ICS file
- `format=google`: Redirects to Google Calendar
- `format=outlook`: Redirects to Outlook Calendar

## Usage Examples

### Adding to Google Calendar

1. **Individual Event**: Click the "Google" button in the booking detail modal
2. **Calendar Feed**: Use the webcal:// protocol with the feed URL:
   ```
   webcal://your-domain.com/api/calendar/integration?user=U123456&token=calendar-feed-token
   ```

### Adding to Apple Calendar

1. **Individual Event**: Click "Download ICS" and open the file
2. **Calendar Feed**: In Apple Calendar, go to File > New Calendar Subscription and use:
   ```
   https://your-domain.com/api/calendar/integration?user=U123456&token=calendar-feed-token
   ```

### Adding to Outlook

1. **Individual Event**: Click the "Outlook" button in the booking detail modal
2. **Calendar Feed**: In Outlook, go to Calendar > Add Calendar > Subscribe from web and use the feed URL

## Calendar Feed Format

The calendar feeds are generated in standard ICS (iCalendar) format and include:

- Event title: "Meeting Room: [Room Name]"
- Event time: Actual booking start/end times
- Location: Room name and location (if available)
- Description: Booked by information and notes
- Organizer: The person who made the booking

## Authentication

### Individual Exports
Individual booking exports require user authentication. Users can only export bookings they own.

### Calendar Feeds
Calendar feeds use a simple token-based authentication. In production, replace the hardcoded token with:
- JWT tokens
- API keys with expiration
- OAuth-based authentication

## Integration with External Systems

### Google Calendar API Integration

For advanced Google Calendar integration, you would need to:

1. Set up a Google Cloud Project
2. Enable the Google Calendar API
3. Implement OAuth 2.0 authentication
4. Use the Calendar API to create events directly

### Microsoft Graph API Integration

For advanced Outlook integration:

1. Register an app in Azure AD
2. Configure Calendar permissions
3. Implement OAuth 2.0 with Microsoft identity platform
4. Use Microsoft Graph API to manage calendar events

### Webhooks

The application provides a webhook endpoint for external systems to receive notifications:

```
POST /api/calendar/integration/webhook
```

This can be used by external calendar systems to get notified when bookings are created, updated, or cancelled.

## Security Considerations

1. **Authentication**: All individual exports require proper user authentication
2. **Authorization**: Users can only export their own bookings
3. **Rate Limiting**: Consider implementing rate limiting for calendar feeds
4. **Token Management**: Use secure, time-limited tokens for calendar feeds
5. **HTTPS**: Always use HTTPS for calendar feeds to prevent interception

## Caching

Calendar feeds are cached for 5 minutes to reduce server load. This means:
- Recent booking changes may take up to 5 minutes to appear in subscribed calendars
- Frequent calendar refreshes won't overload the server
- Balance between freshness and performance

## Troubleshooting

### Calendar Subscription Not Working

1. Check that the feed URL is correct
2. Ensure the authentication token is valid
3. Verify that the calendar application supports ICS feeds
4. Try downloading the ICS file manually first

### Events Not Appearing

1. Check if the booking status is "Confirmed" (cancelled bookings are excluded)
2. Verify the user ID or room ID in the feed URL
3. Check the booking dates (past events might be filtered out)

### Export Buttons Not Working

1. Ensure user is logged in and owns the booking
2. Check that the booking is not cancelled
3. Verify network connectivity
4. Check browser console for any JavaScript errors