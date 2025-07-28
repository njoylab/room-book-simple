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
- **Testing**: Jest + React Testing Library
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

#### API Token Permissions

When creating your Airtable API token, you need different permissions depending on what features you want to use:

**Basic Application (Required):**
- `data.records:read` - Read room and booking data
- `data.records:write` - Create and update bookings

**Webhook Management (Optional - only needed for automatic cache invalidation):**
- `schema.bases:read` - Read table structure (required for webhook script to find table IDs)
- `webhook:manage` - Create, list, and delete webhooks

**Token Setup Steps:**
1. Go to [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click "Create new token"
3. Give it a name like "Meeting Room Booking App"
4. Select your base
5. Choose the required permissions
6. Copy the token (starts with `pat_`)

### 2. Slack App Configuration

1. **Create a Slack app** at [api.slack.com/apps](https://api.slack.com/apps)
2. **Configure OAuth & Permissions**:
   - Add redirect URL: `https://your-domain.com/api/auth/slack/callback`
   - Required scopes: `identity.basic`, `identity.email`, `identity.team`
3. **Get your credentials**:
   - Client ID (starts with `123456789.123456789`)
   - Client Secret
   - Signing Secret

### 3. Environment Variables

Create a `.env.local` file in the project root:

```env
# Airtable Configuration
AIRTABLE_API_KEY=pat_your_airtable_token_here
AIRTABLE_BASE_ID=app_your_base_id_here
AIRTABLE_MEETING_ROOMS_TABLE=Meeting Rooms
AIRTABLE_BOOKINGS_TABLE=Bookings

# Slack Configuration
SLACK_CLIENT_ID=123456789.123456789
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret

# Application Configuration
NEXTAUTH_SECRET=your_random_secret_key_here
NEXTAUTH_URL=https://your-domain.com

# Optional Configuration
MAX_MEETING_HOURS=8
ROOM_CACHE_TIME=300
UPCOMING_MEETINGS_HOURS=24
```

### 4. Installation and Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Testing

The application includes a comprehensive test suite covering unit tests, integration tests, and component tests.

### Test Structure

```
__tests__/
├── integration/          # End-to-end integration tests
│   └── booking-flow.test.ts
├── security/            # Security and authentication tests
│   └── auth-validation.test.ts
app/
├── components/__tests__/ # React component tests
│   ├── BookingModal.test.tsx
│   ├── DateNavigation.test.tsx
│   ├── Header.test.tsx
│   ├── RoomCard.test.tsx
│   ├── TimeSlotsGrid.test.tsx
│   └── UpcomingMeetings.test.tsx
├── api/__tests__/       # API endpoint tests
│   ├── auth-slack.test.ts
│   ├── auth-user.test.ts
│   ├── bookings.test.ts
│   └── rooms.test.ts
lib/__tests__/          # Library function tests
│   ├── airtable.test.ts
│   ├── auth_server.test.ts
│   ├── env.test.ts
│   ├── error-handler.test.ts
│   └── validation.test.ts
utils/__tests__/        # Utility function tests
│   ├── date.test.ts
│   └── slots.test.ts
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- TimeSlotsGrid.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="booking"
```

### Test Categories

#### 🧪 Unit Tests (34 tests)
- **Date utilities**: Time formatting, parsing, and manipulation
- **Time slot utilities**: Slot generation and availability calculation
- **Validation logic**: Input validation and sanitization
- **Environment configuration**: Environment variable validation

#### 🔧 Integration Tests (15+ tests)
- **Booking flow**: Complete booking process from room selection to confirmation
- **API endpoints**: End-to-end API testing with authentication
- **Data consistency**: Cross-API data integrity verification
- **Error handling**: Network errors, validation errors, and edge cases

#### 🎨 Component Tests (50+ tests)
- **React components**: User interactions, state management, and rendering
- **Modal interactions**: Booking and detail modal functionality
- **Authentication flows**: Login/logout and user state management
- **Responsive design**: Mobile and desktop layout testing

#### 🔒 Security Tests (10+ tests)
- **Authentication**: OAuth flow and session management
- **Authorization**: User permissions and access control
- **Input validation**: XSS prevention and data sanitization
- **Rate limiting**: Abuse prevention mechanisms

### Test Coverage

The test suite provides comprehensive coverage:

- **Lines**: ~85% coverage
- **Functions**: ~90% coverage
- **Branches**: ~80% coverage
- **Statements**: ~85% coverage

### Writing Tests

#### Component Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BookingModal } from '../BookingModal';

describe('BookingModal', () => {
  it('should open booking modal when clicking available slot', () => {
    render(<BookingModal room={testRoom} isOpen={true} />);
    
    expect(screen.getByText('Book Conference Room A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /book room/i })).toBeInTheDocument();
  });
});
```

#### API Test Example

```typescript
import { createBooking } from '@/lib/airtable';

describe('Booking API', () => {
  it('should create booking with valid data', async () => {
    const bookingData = {
      roomId: 'rec1234567890123',
      startTime: '2024-03-15T14:00:00.000Z',
      endTime: '2024-03-15T15:00:00.000Z',
      note: 'Test booking'
    };

    const booking = await createBooking(bookingData);
    
    expect(booking.id).toBeDefined();
    expect(booking.status).toBe('Confirmed');
  });
});
```

### Continuous Integration

Tests are automatically run on:
- **Pull requests**: All tests must pass before merging
- **Main branch**: Full test suite on every push
- **Deployment**: Pre-deployment validation

### Performance Testing

```bash
# Run performance tests
npm run test:performance

# Lighthouse CI
npm run lighthouse
```

## Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy automatically** on push to main branch

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Write tests** for your changes
4. **Make your changes** following the coding standards
5. **Run tests**: `npm test`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Code Quality

- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **TypeScript**: Type safety and IntelliSense
- **Jest**: Unit and integration testing

## Support

- **Documentation**: [docs/](docs/) directory
- **API Reference**: [docs/API.md](docs/API.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Next.js** team for the amazing framework
- **Vercel** for hosting and deployment
- **Airtable** for the flexible database solution
- **Slack** for authentication integration
- **Tailwind CSS** for the utility-first styling approach
