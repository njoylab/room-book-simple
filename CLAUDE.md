# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application for meeting room management (room-book-simple), built with:
- **Next.js 15.4.2** with App Router
- **React 19.1.0** 
- **TypeScript 5** with strict mode enabled
- **Tailwind CSS 4** for styling
- **Turbopack** for development (via `--turbopack` flag)
- **Zod** for runtime validation and type safety
- **Slack OAuth** for authentication
- **Airtable** as the backend database

## UI Language Requirements

**IMPORTANT**: All user-facing text and labels must be in English. This includes:
- Component text and labels
- Form inputs and placeholders
- Button text
- Error messages
- Success messages
- Status indicators
- Tooltips and help text
- API error responses shown to users

When writing or updating components, ensure all text is in English for consistency and internationalization readiness.

## Development Commands

### Core Development
```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Webhook Management
npm run webhooks:setup     # Create webhooks automatically
npm run webhooks:list      # List existing webhooks
npm run webhooks:delete    # Delete all webhooks
```

### Important Notes
- Development server runs with Turbopack enabled by default
- Uses Next.js App Router architecture (app/ directory)
- TypeScript path mapping configured with `@/*` pointing to root

## Architecture & Structure

### App Router Structure
- **app/layout.tsx** - Root layout with Geist font configuration, Header component, and global styles
- **app/page.tsx** - Home page showing all meeting rooms in a grid layout
- **app/globals1.css** - Global styles with Tailwind imports and CSS variables for theming
- **app/book/[roomId]/page.tsx** - Direct booking page for specific rooms with date navigation

### Component Architecture
- **Header.tsx** - Main navigation header with Slack authentication and user menu
- **UserMenu.tsx** - User dropdown menu with profile and logout options
- **RoomCard.tsx** - Individual room display with booking functionality
- **BookingModal.tsx** - Modal for creating new bookings with time slot selection
- **BookingDetailModal.tsx** - Modal for viewing and managing existing bookings
- **TimeSlotsGrid.tsx** - Interactive grid for selecting available time slots
- **TimeSlotsGridSkeleton.tsx** - Loading skeleton for time slots grid
- **DateNavigation.tsx** - Date picker and navigation component
- **RoomBookingView.tsx** - Main booking interface component
- **AuthCheck.tsx** - Authentication wrapper component
- **NotificationHandler.tsx** - Global notification system

### Styling Architecture
- **Tailwind CSS 4** with PostCSS plugin configuration
- CSS variables for theming (--background, --foreground) with dark mode support
- Geist font family (sans and mono variants) configured via next/font/google
- Responsive design with mobile-first approach

### TypeScript Configuration
- Strict mode enabled with ES2017 target
- Module resolution set to "bundler" 
- Path aliases: `@/*` maps to project root
- Includes Next.js TypeScript plugin

### ESLint Configuration
- Extends `next/core-web-vitals` and `next/typescript`
- Uses FlatCompat for configuration compatibility

## Environment Configuration

### Environment Variables
Configure these in `.env.local`:
```
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here
AIRTABLE_MEETING_ROOMS_TABLE=MeetingRooms
AIRTABLE_BOOKINGS_TABLE=Bookings

# Slack OAuth Configuration
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret

# Session Security
SESSION_SECRET=your-32-character-session-secret-here
SESSION_COOKIE_NAME=room_booking_user

# App Configuration
APP_TITLE=B4I  # Application title displayed in UI and page metadata
UPCOMING_MEETINGS_HOURS=24  # Hours to look ahead for upcoming meetings (0-168, optional - defaults to current day)
APP_BASE_URL=your_app_url
NODE_ENV=development

# Cache Configuration
ROOM_CACHE_TIME=3600  # Room data cache time in seconds (300-2592000, optional - defaults to 3600 = 1 hour)

# Calendar Integration (optional)
CALENDAR_FEED_TOKEN=your_calendar_token_here  # For calendar feed authentication (optional)

# Webhook Configuration (optional - for automatic cache invalidation)
AIRTABLE_WEBHOOK_SECRET=your_webhook_secret_here  # Secret for webhook verification (optional for development)
AIRTABLE_MEETING_ROOMS_TABLE_ID=tblxxxxxxxxx  # Table ID for meeting rooms (for webhook processing)
AIRTABLE_BOOKINGS_TABLE_ID=tblxxxxxxxxx       # Table ID for bookings (for webhook processing)

# Security Headers (optional)
ALLOWED_ORIGINS=origin1,origin2
```

### Environment Validation
The app uses Zod for runtime environment variable validation in `lib/env.ts`:
- Validates all required environment variables on startup
- Provides type-safe access to environment variables
- Includes development/production environment detection
- Validates session secret length and format
- Validates upcoming meetings time window (0-168 hours, optional)

## Data Models

### MeetingRoom Interface
```typescript
interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  notes?: string;
  location?: string;
  status?: string;
  startTime: number; // Opening time in seconds from midnight (default: 28800 = 8:00 AM)
  endTime: number;   // Closing time in seconds from midnight (default: 64800 = 6:00 PM)
}
```

### Booking Interface
```typescript
interface Booking {
  id: string;
  userLabel: string; // Display name for the user
  user: string;      // User ID
  userEmail: string; // Email address of the user
  startTime: string; // ISO datetime string
  endTime: string;   // ISO datetime string
  note?: string;
  room: string;      // Room ID
  status?: string;   // 'Confirmed' or 'Cancelled'
}

// Booking status constants
const BOOKING_STATUS = {
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
} as const;
```

### User Interface
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  image: string;
  team: string;
}
```

## API Routes

### Authentication Routes
- `GET /api/auth/slack` - Initiate Slack OAuth flow
- `POST /api/auth/logout` - Log out user and clear session
- `GET /api/auth/user` - Get current authenticated user data

### Room Routes
- `GET /api/rooms` - Fetch all meeting rooms
- `GET /api/rooms/[id]/slots?date=YYYY-MM-DD` - Fetch available time slots for a room on a specific date
- `GET /api/rooms/[id]/bookings` - Fetch all bookings for a specific room

### Booking Routes
- `GET /api/bookings` - Fetch all bookings (with optional user filtering)
- `POST /api/bookings` - Create a new booking (requires authentication)
- `PATCH /api/bookings/[id]` - Update booking status (cancel/confirm, requires authentication)

## Airtable Integration

### Webhook Setup for Cache Invalidation

The application supports Airtable webhooks to automatically invalidate cache when rooms or bookings are modified. This ensures data consistency without manual cache clearing.

#### Automatic Setup (Recommended):

Use the included script to automatically create webhooks via Airtable API:

```bash
# Setup webhooks automatically
npm run webhooks:setup

# List existing webhooks
npm run webhooks:list

# Delete all webhooks
npm run webhooks:delete

# Replace existing webhooks
npx tsx scripts/setup-webhooks.ts create --replace
```

The script will:
- Find your rooms and bookings tables automatically
- Create webhooks for both tables
- Generate the required environment variables
- Display setup instructions

#### Manual Configuration Steps:

If you prefer manual setup:

1. **Configure Environment Variables:**
   ```bash
   # Add these to your .env.local file
   AIRTABLE_WEBHOOK_SECRET=your_secure_webhook_secret
   AIRTABLE_MEETING_ROOMS_TABLE_ID=tblxxxxxxxxx  # Found in Airtable table URL
   AIRTABLE_BOOKINGS_TABLE_ID=tblxxxxxxxxx       # Found in Airtable table URL
   ```

2. **Create Webhooks in Airtable:**
   - Go to your Airtable base
   - Navigate to the "Automations" tab
   - Create a new automation with "When record matches conditions" trigger
   - Set conditions to trigger on record creation, update, or deletion
   - Add webhook action with URL: `https://your-domain.com/api/webhooks/airtable`
   - Set the webhook secret in Airtable to match your `AIRTABLE_WEBHOOK_SECRET`

3. **Webhook Endpoint:**
   - Endpoint: `POST /api/webhooks/airtable`
   - Handles webhook verification using HMAC-SHA256
   - Automatically invalidates relevant cache tags based on changed tables
   - Supports both room and booking table changes

#### Cache Invalidation Logic:

**When Room Records Change:**
- Invalidates `meeting-rooms` cache tag
- Invalidates specific room cache: `meeting-room-by-{id}`

**When Booking Records Change:**
- Invalidates `bookings-all` and `bookings-upcoming` cache tags  
- Invalidates specific booking cache: `booking-by-{id}`
- General cache invalidation ensures fresh data on next request

#### Security Features:
- HMAC-SHA256 signature verification
- Base ID validation to prevent cross-base webhooks
- Rate limiting and error handling
- Optional webhook secret (can be disabled in development)

### Database Setup
The app expects two tables in Airtable:

1. **MeetingRooms** table with fields: 
   - name (string)
   - capacity (number)
   - notes (string, optional)
   - location (string, optional)
   - status (string, optional - "Unavailable" disables booking)
   - startTime (number, optional - opening time in seconds from midnight, default: 28800 = 8:00 AM)
   - endTime (number, optional - closing time in seconds from midnight, default: 64800 = 6:00 PM)

2. **Bookings** table with fields:
   - user (string)
   - userLabel (string)
   - userEmail (string)
   - startTime (ISO datetime string)
   - endTime (ISO datetime string)
   - note (string, optional)
   - room (string, Airtable record ID)
   - status (string, optional)

### Airtable Operations
- **lib/airtable.ts** - Centralized Airtable operations and helper functions
- Includes error handling, caching, and data validation
- Supports CRUD operations for rooms and bookings
- Handles time slot calculations and conflict detection
- **getUpcomingBookings()** - Retrieves meetings for configurable time window
- **getCachedMeetingRooms()** - Cached room data to avoid duplicate requests

## Authentication System

### Slack OAuth Implementation
- **Server-side authentication** using encrypted cookies
- **lib/auth_server.ts** - Server-side authentication utilities
- **lib/auth_client.ts** - Client-side authentication helpers
- Secure session management with configurable cookie settings
- Automatic user profile fetching from Slack

### Security Features
- Session secret validation (32 characters required)
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection with configurable origins
- Secure cookie settings for production

## Validation & Error Handling

### Input Validation
- **lib/validation.ts** - Zod schemas for all API inputs
- Runtime validation for booking creation and updates
- Date format validation and business logic checks
- Rate limiting implementation

### Error Handling
- **lib/error-handler.ts** - Centralized error handling system
- Standardized error types and responses
- Development vs production error details
- Consistent API error format

### Validation Schemas
- `createBookingSchema` - Booking creation with time validation
- `updateBookingSchema` - Booking status updates
- `dateSchema` - Date format validation
- `roomIdSchema` / `bookingIdSchema` - ID format validation

## Booking System Features

### Core Functionality
- **Time slot selection** - 30-minute slots with visual availability
- **Consecutive slot selection** - Users can select multiple adjacent slots
- **Conflict detection** - Prevents double-booking
- **Room-specific hours** - Each room can have custom operating hours
- **Direct booking URLs** - `/book/[roomId]` for direct access
- **Booking management** - View, cancel, and update existing bookings
- **Upcoming meetings sidebar** - Shows current and future meetings (defaults to current day, configurable via UPCOMING_MEETINGS_HOURS)
- **Room availability status** - Unavailable rooms prevent new bookings but show existing ones

### User Experience
- **Responsive design** - Mobile-first approach with Tailwind CSS
- **Loading states** - Skeleton components for better UX
- **Real-time validation** - Client-side and server-side validation
- **Notification system** - Global notification handling
- **Date navigation** - Easy date selection and navigation

### Booking Flow
1. User selects date (defaults to today)
2. System shows available 30-minute slots
3. User selects consecutive time slots
4. User adds optional notes
5. System validates and creates booking
6. User receives confirmation and can manage booking

## Key Files to Understand

### Core Libraries
- **lib/types.ts** - TypeScript interfaces and type definitions
- **lib/airtable.ts** - Airtable operations and data management
- **lib/auth_server.ts** - Server-side authentication
- **lib/auth_client.ts** - Client-side authentication
- **lib/env.ts** - Environment variable validation
- **lib/validation.ts** - Input validation schemas
- **lib/error-handler.ts** - Error handling utilities

### Components
- **app/components/Header.tsx** - Main navigation and authentication
- **app/components/RoomCard.tsx** - Individual room display
- **app/components/BookingModal.tsx** - Booking creation interface
- **app/components/BookingDetailModal.tsx** - Booking management
- **app/components/TimeSlotsGrid.tsx** - Time slot selection
- **app/components/DateNavigation.tsx** - Date picker
- **app/components/NotificationHandler.tsx** - Global notifications
- **app/components/UpcomingMeetings.tsx** - Sidebar with upcoming meetings display

### Pages
- **app/page.tsx** - Home page with room grid
- **app/book/[roomId]/page.tsx** - Direct booking page
- **app/layout.tsx** - Root layout with global components

### Utilities
- **utils/date.ts** - Date/time formatting utilities
- **utils/slots.ts** - Time slot calculation utilities

### Configuration
- **next.config.ts** - Next.js configuration
- **tsconfig.json** - TypeScript configuration
- **postcss.config.mjs** - PostCSS configuration for Tailwind
- **eslint.config.mjs** - ESLint configuration

## Development Best Practices

### Code Organization
- Use TypeScript strict mode for type safety
- Implement proper error handling with standardized error types
- Validate all inputs using Zod schemas
- Use server-side authentication checks
- Implement rate limiting for API endpoints

### Performance
- Use React Suspense for loading states
- Implement proper caching strategies
- Optimize images and assets
- Use Next.js App Router features effectively

### Security
- Validate all environment variables
- Implement proper session management
- Use secure cookie settings
- Sanitize all user inputs
- Implement rate limiting

### Testing
- Write unit tests for utility functions
- Test API endpoints with proper error cases
- Validate component behavior
- Test authentication flows