# Slack Bot Integration

This document explains how to set up and use the Slack bot for viewing your meeting room bookings directly in Slack.

## Features

The Slack bot provides the following functionality:
- 📅 View your upcoming bookings with `/my-bookings` or `/bookings` slash command
- 🔴 Shows currently ongoing meetings
- 🟡 Displays future bookings with date, time, and room information
- 📝 Includes booking notes if available
- ❌ **Cancel bookings directly from Slack** with interactive buttons
- 🔗 Provides link to manage bookings in the web app

## Setup Instructions

### 1. Configure Slack App for Bot Functionality

1. **Go to your existing Slack App** at [api.slack.com/apps](https://api.slack.com/apps)

2. **Enable Bot User**:
   - Go to "App Home" in the sidebar
   - Scroll down to "Your App's Presence in Slack"
   - Click "Edit" next to "App Display Name"
   - Add a Bot User Display Name (e.g., "Room Booking Bot")
   - Add a Default Username (e.g., "roombookingbot")
   - Check "Always Show My Bot as Online"

3. **Add Bot Token Scopes**:
   - Go to "OAuth & Permissions" in the sidebar
   - Under "Scopes" → "Bot Token Scopes", add:
     - `commands` - Use slash commands
     - `chat:write` - Send messages as the bot
     - `users:read` - Read user profile information

4. **Enable Interactive Components**:
   - Go to "Interactivity & Shortcuts" in the sidebar
   - Turn on "Interactivity"
   - Set Request URL to: `https://yourdomain.com/api/slack/bot` (same as slash commands)
   - This enables the cancel buttons to work

5. **Create Slash Commands**:
   - Go to "Slash Commands" in the sidebar
   - Click "Create New Command"
   - Create the following commands:

   **Command 1: /my-bookings**
   - Command: `/my-bookings`
   - Request URL: `https://yourdomain.com/api/slack/bot` (or your ngrok URL for development)
   - Short Description: `View your upcoming meeting room bookings`
   - Usage Hint: (leave empty)

   **Command 2: /bookings** (alternative)
   - Command: `/bookings`
   - Request URL: `https://yourdomain.com/api/slack/bot`
   - Short Description: `View your upcoming meeting room bookings`
   - Usage Hint: (leave empty)

6. **Install/Reinstall the App**:
   - Go to "Install App" in the sidebar
   - Click "Reinstall to Workspace" (if previously installed)
   - Authorize the new permissions

### 2. Environment Variables

Your `.env.local` should already include the required Slack configuration:

```env
# Slack Configuration (already configured for OAuth)
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret  # Used for bot signature verification

# Base URL (used in bot messages)
APP_BASE_URL=https://yourdomain.com  # Or your ngrok URL for development
```

### 3. Development Setup with ngrok

For development, you'll need to use ngrok to create an HTTPS tunnel:

```bash
# Start your Next.js app
npm run dev

# In another terminal, start ngrok
npx ngrok http 3000

# Use the HTTPS URL (e.g., https://abc123.ngrok.io) for:
# 1. Slack slash command Request URLs
# 2. APP_BASE_URL in your .env.local
```

**Important**: Update your Slack app's slash command URLs whenever you restart ngrok (free plan generates new URLs).

## Usage

Once configured, users can use the bot in any Slack channel or direct message:

### Commands

- `/my-bookings` - Shows your upcoming room bookings
- `/bookings` - Alternative command for the same functionality

### Example Output

```
📅 Your Upcoming Bookings

🔴 Currently Ongoing:
🏢 Conference Room A                                    [❌ Cancel]
⏰ 2:00 PM - 3:00 PM
📝 Team standup meeting

―――――――――――――――――――――――――

🟡 Coming Up:
🏢 Meeting Room B                                       [❌ Cancel]
📅 Wed Jan 17 2024
⏰ 4:00 PM - 5:00 PM
📝 Client presentation

🏢 Conference Room A                                    [❌ Cancel]
📅 Thu Jan 18 2024
⏰ 10:00 AM - 11:00 AM

📱 Manage your bookings in the web app
```

### Cancelling Bookings

- Each booking displays a red "❌ Cancel" button
- Click the button to immediately cancel that booking
- You can only cancel your own bookings
- Cancellation is permanent and cannot be undone
- You'll receive a detailed confirmation message showing the cancelled booking details with strikethrough formatting

#### Example Cancellation Feedback:
```
✅ Booking Cancelled Successfully!

~~🏢 Conference Room A~~
❌ CANCELLED
⏰ 2:00 PM - 3:00 PM
📝 Team standup meeting

Cancelled at 3:45:23 PM
```

## Security Features

- **Signature Verification**: All requests are verified using Slack's signing secret
- **Timestamp Validation**: Prevents replay attacks (requests older than 5 minutes are rejected)
- **User-specific Data**: Each user only sees their own bookings
- **Ephemeral Responses**: Bot responses are only visible to the user who invoked the command

## Error Handling

The bot handles various error scenarios:
- Invalid or missing Slack signatures
- Network errors when fetching data
- Missing or invalid user data
- Rate limiting from external APIs

## Testing

You can test the bot endpoint directly:

```bash
# Test if the endpoint is running
curl https://yourdomain.com/api/slack/bot

# Expected response:
{
  "message": "Slack bot endpoint is running",
  "timestamp": "2024-01-17T10:00:00.000Z"
}
```

## Troubleshooting

### Common Issues

1. **"Invalid signature" error**:
   - Check that `SLACK_SIGNING_SECRET` matches your Slack app's signing secret
   - Ensure the request URL in Slack matches your actual endpoint

2. **"Request timestamp too old" error**:
   - This usually happens during development when requests are delayed
   - Restart your development server and try again

3. **Command not found**:
   - Verify the slash command is properly configured in your Slack app
   - Check that the Request URL is correct and accessible

4. **No bookings shown**:
   - Verify the user has bookings in the system
   - Check that the Slack user ID matches the user ID in your booking system

### Development Tips

- Use ngrok's web interface at http://localhost:4040 to inspect requests
- Check Next.js console logs for detailed error messages
- Test with different users to ensure proper data isolation
- Verify that all required scopes are added to your Slack app

## API Rate Limits

The bot respects the same rate limits as the web application:
- Slack signature verification prevents abuse
- Internal rate limiting applies to all API endpoints
- Consider implementing caching for frequently accessed data in production

## Future Enhancements

Potential features for future versions:
- Room availability checking (`/room-status [room-name]`)
- Quick booking creation (`/book-room [room] [time]`)
- Room list display (`/rooms`)
- Integration with calendar systems
- Booking modification (time/room changes)
- Booking reminders and notifications