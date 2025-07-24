# Meeting Room Booking System

A modern, responsive meeting room booking application built with Next.js 15, featuring Slack authentication, real-time availability, and upcoming meetings sidebar.

## ✨ Features

### 🏢 Room Management
- **Interactive room grid** with real-time availability status
- **Room-specific hours** - Custom operating hours for each room
- **Capacity and location** information display
- **Room status management** - Unavailable rooms prevent new bookings while showing existing ones
- **Room tagging system** - Categorize rooms with tags for easy identification and grouping

### 📅 Booking System
- **30-minute time slots** with visual availability indicators
- **Consecutive slot selection** - Book multiple adjacent time slots

### 📊 Upcoming Meetings Sidebar
- **Smart time window** - Shows meetings for current day by default, configurable via environment variable
- **Live meetings** - Currently ongoing meetings highlighted with "Live" badge
- **Upcoming meetings** - Future meetings sorted by time
- **Responsive design** - Sidebar on desktop, stacked on mobile

### 🔐 Authentication & Security
- **Slack OAuth integration** - Seamless login with Slack credentials
- **Rate limiting** - Prevents abuse with configurable limits
- **Input validation** - Comprehensive validation using Zod schemas

### 🎨 User Experience
- **Responsive design** - Mobile-first approach with Tailwind CSS
- **Loading states** - Skeleton components and suspense boundaries
- **Error handling** - User-friendly error messages and notifications
- **Real-time feedback** - Immediate visual updates after actions

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Authentication**: Slack OAuth with JWT encryption
- **Database**: Airtable
- **Validation**: Zod
- **Deployment**: Vercel-ready

## Prerequisites

Before running this application, you'll need:

1. **Airtable Account**: Set up tables for meeting rooms and bookings
2. **Slack App**: Configure OAuth for user authentication
3. **Environment Variables**: Configure the required environment variables

## Setup Instructions

### 1. Airtable Configuration

1. **Create an Airtable account** at [airtable.com](https://airtable.com)

2. **Create a new base** for your meeting room system

3. **Create the Meeting Rooms table** with these fields:
   - `name` (Single line text) - Room name
   - `capacity` (Number) - Maximum occupancy
   - `notes` (Long text) - Optional room description
   - `location` (Single line text) - Optional room location
   - `status` (Single select) - Options: "Available", "Unavailable"
   - `startTime` (Number) - Opening time in seconds from midnight (default: 28800 = 8:00 AM)
   - `endTime` (Number) - Closing time in seconds from midnight (default: 64800 = 6:00 PM)
   - `maxMeetingHours` (Number) - Maximum meeting duration in hours (optional - overrides global setting)
   - `image` (Attachment) - Optional room photos
   - `tags` (Multiple select) - Optional tags for grouping rooms (e.g., "Conference", "Video Call", "Large", "Small", "Quiet", "Whiteboard")

4. **Create the Bookings table** with these fields:
   - `user` (Single line text) - Slack user ID
   - `userLabel` (Single line text) - Display name
   - `startTime` (Date with time) - Booking start
   - `endTime` (Date with time) - Booking end
   - `note` (Long text) - Optional booking notes
   - `room` (Link to another record) - Link to Meeting Rooms table
   - `status` (Single select) - Options: "Confirmed", "Cancelled"

5. **Get your API credentials**:
   - Go to [airtable.com/api](https://airtable.com/api)
   - Select your base to get the Base ID
   - Create a personal access token at [airtable.com/create/tokens](https://airtable.com/create/tokens)

**Note on Meeting Duration Limits**: 
- The `maxMeetingHours` field in the Meeting Rooms table is optional
- If not set, the room will use the global `MAX_MEETING_HOURS` environment variable
- If set, it overrides the global setting for that specific room
- **Supports decimal values** for precise duration limits (e.g., `1.5` for 90 minutes, `0.5` for 30 minutes)
- Example: Set `maxMeetingHours` to `2` for a small meeting room that should only allow 2-hour meetings
- Example: Set `maxMeetingHours` to `1.5` for a room that should only allow 90-minute meetings

**Note on Room Tags**: 
- The `tags` field uses Airtable's "Multiple Select" type for easy room categorization
- Tags are displayed as styled badges on room cards for quick visual identification
- Suggested tags: "Conference", "Video Call", "Large", "Small", "Quiet", "Whiteboard", "Projector", "Training"
- Tags are optional - rooms without tags will display normally
- You can customize the available tag options in your Airtable base settings

### 2. Slack App Configuration

1. **Create a Slack App**:
   - Go to [api.slack.com/apps](https://api.slack.com/apps)
   - Click "Create New App" → "From scratch"
   - Enter app name and select your workspace

2. **Configure OAuth & Permissions**:
   - Go to "OAuth & Permissions" in the sidebar
   - Add these redirect URLs:
     - For **development**: Use [ngrok](https://ngrok.com) to create an HTTPS tunnel:
       ```bash
       # Install ngrok and create tunnel
       npm install -g ngrok
       ngrok http 3000
       # Use the HTTPS URL: https://abc123.ngrok.io/api/auth/slack
       ```
     - For **production**: `https://yourdomain.com/api/auth/slack`
   - Add these OAuth Scopes under "User Token Scopes":
     - `identity.basic` - Read user profile information
     - `identity.avatar` - Read user avatar

   **Note**: Slack requires HTTPS for OAuth redirects. In development, you must use a tool like ngrok to create an HTTPS tunnel to your local server.

3. **Get your credentials**:
   - **Client ID**: Found in "Basic Information" → "App Credentials"
   - **Client Secret**: Found in "Basic Information" → "App Credentials"
   - **Signing Secret**: Found in "Basic Information" → "App Credentials"

4. **Install the app**:
   - Go to "Install App" in the sidebar
   - Click "Install to Workspace"
   - Authorize the permissions

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id
AIRTABLE_MEETING_ROOMS_TABLE=MeetingRooms  # Default: "MeetingRooms"
AIRTABLE_BOOKINGS_TABLE=Bookings            # Default: "Bookings"

# Slack OAuth Configuration
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret

# Session Security
SESSION_SECRET=your-32-character-session-secret-here  # Must be exactly 32 characters
SESSION_COOKIE_NAME=room_booking_user                 # Default: "room_booking_user"
SESSION_DURATION_HOURS=168                            # Default: 168 hours (7 days), range: 1-168

# Application Configuration
APP_TITLE=B4I                                         # Default: "B4I"
UPCOMING_MEETINGS_HOURS=24                            # Optional: hours to look ahead (0-168), defaults to current day
MAX_MEETING_HOURS=8                                   # Default: 8 hours (1-24), maximum meeting duration
APP_BASE_URL=http://localhost:3000                    # Optional: base URL for OAuth redirects
NODE_ENV=development                                  # Default: "development"

```

### Required Variables:
- `AIRTABLE_API_KEY` - Your Airtable API key
- `AIRTABLE_BASE_ID` - Your Airtable base ID
- `SLACK_CLIENT_ID` - Your Slack app client ID
- `SLACK_CLIENT_SECRET` - Your Slack app client secret
- `SLACK_SIGNING_SECRET` - Your Slack app signing secret
- `SESSION_SECRET` - 32-character secret for session encryption

### Optional Variables:
- `AIRTABLE_MEETING_ROOMS_TABLE` - Name of meeting rooms table (default: "MeetingRooms")
- `AIRTABLE_BOOKINGS_TABLE` - Name of bookings table (default: "Bookings")
- `SESSION_COOKIE_NAME` - Session cookie name (default: "room_booking_user")
- `SESSION_DURATION_HOURS` - Session duration in hours (1-168, default: 168 = 7 days)
- `APP_TITLE` - Application title (default: "B4I")
- `UPCOMING_MEETINGS_HOURS` - Hours to look ahead for upcoming meetings (0-168). If not set, defaults to showing meetings until end of current day
- `MAX_MEETING_HOURS` - Maximum meeting duration in hours (1-24, default: 8). Can be overridden per room using the `maxMeetingHours` field in Airtable
- `APP_BASE_URL` - Base URL for OAuth redirects (auto-detected if not set)
- `NODE_ENV` - Environment mode (default: "development")

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd <folder>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up your services** following the setup instructions above:
   - Configure Airtable tables and get API credentials
   - Create and configure Slack app
   - Generate a 32-character session secret

4. **Create environment file**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

5. **Set up HTTPS tunnel for development** (required for Slack OAuth):
   ```bash
   # In a separate terminal, start ngrok tunnel
   npx ngrok http 3000
   
   # Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
   # Update your Slack app's redirect URL to: https://abc123.ngrok.io/api/auth/slack
   # Update APP_BASE_URL in .env.local to: https://abc123.ngrok.io
   ```

6. **Run the development server**:
   ```bash
   npm run dev
   ```

7. **Open your browser** and navigate to your ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)

8. **Add some meeting rooms** in your Airtable base to get started

### Development Notes

- **HTTPS Required**: Slack OAuth requires HTTPS even in development. Use ngrok to tunnel your local server.
- **ngrok URL Changes**: Free ngrok URLs change each restart. Update your Slack app settings accordingly.
- **Alternative Tunneling**: You can also use other tools like [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/), [localtunnel](https://localtunnel.github.io/www/), or [serveo](https://serveo.net/).

## Project Structure

```
room-book-simple/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── bookings/      # Booking management
│   │   ├── calendar/      # Calendar integration
│   │   ├── rooms/         # Room management
│   │   └── slack/         # Slack bot integration
│   ├── book/              # Booking pages
│   ├── components/        # React components
│   └── layout.tsx         # Root layout
├── lib/                   # Utility libraries
│   ├── airtable.ts        # Airtable integration
│   ├── auth_server.ts     # Server-side authentication
│   ├── auth_client.ts     # Client-side authentication
│   ├── validation.ts      # Input validation schemas
│   ├── error-handler.ts   # Error handling utilities
│   ├── types.ts           # TypeScript definitions
│   └── env.ts             # Environment configuration
├── utils/                 # Helper utilities
│   ├── date.ts            # Date manipulation
│   └── slots.ts           # Time slot utilities
├── docs/                  # Documentation
│   ├── api-reference.md   # Complete API documentation
│   ├── deployment.md      # Deployment guides
│   ├── calendar-integration.md # Calendar features
│   └── slack-bot.md       # Slack bot setup
├── __tests__/             # Test files
│   ├── integration/       # Integration tests
│   └── security/          # Security tests
└── .env.example           # Environment template
```

## API Endpoints

For complete API documentation, see [docs/api-reference.md](./docs/api-reference.md).

### Core Endpoints
- `GET /api/rooms` - Get all meeting rooms
- `GET /api/rooms/[id]/slots` - Get available time slots
- `GET /api/rooms/[id]/bookings` - Get bookings for a room
- `GET /api/bookings` - Get all bookings (with optional user filtering)
- `POST /api/bookings` - Create a new booking
- `PATCH /api/bookings/[id]` - Update a booking

### Authentication
- `GET /api/auth/slack` - Initiate Slack OAuth
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - Logout user

### Calendar Integration
- `GET /api/bookings/calendar` - Get upcoming bookings
- `GET /api/bookings/[id]/calendar` - Export single booking
- `GET /api/calendar/integration` - Calendar feed

### Slack Bot
- `POST /api/slack/bot` - Handle Slack bot interactions

## Development

- **TypeScript**: Full type safety throughout the application
- **ESLint**: Code linting with Next.js configuration
- **Turbopack**: Fast development builds
- **Hot Reload**: Automatic page updates during development

## Deployment

For detailed deployment instructions, see [docs/deployment.md](./docs/deployment.md).

### Quick Deploy (Vercel)

This application is optimized for deployment on Vercel:

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on every push

### Other Platforms

- **Netlify**: See deployment guide for configuration
- **Docker**: Containerized deployment available
- **Traditional Server**: Nginx + PM2 setup guide included

## Contributing

For detailed contributing guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

### Quick Start

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### Development

- **Testing**: Run `npm test` to execute the test suite
- **Linting**: Run `npm run lint` to check code quality
- **Documentation**: Update relevant docs for new features

## Development Notes

This project was developed with significant assistance from AI tools, particularly for:
- **Test coverage** - Comprehensive test suites for components, utilities, and API endpoints
- **JSDoc documentation** - Detailed function and module documentation throughout the codebase
- **Code optimization** - Performance improvements and best practices implementation
- **Feature implementation** - Complex features like upcoming meetings sidebar and time slot management

The AI assistance helped ensure consistent code quality, comprehensive testing, and thorough documentation across the entire application.

## License

MIT License - see [LICENSE](./LICENSE) file for details.
