/**
 * @fileoverview Tests for UpcomingMeetings component
 * @description Tests the rendering and logic of the upcoming meetings display
 */

import { render, screen } from '@testing-library/react';
import { UpcomingMeetings } from '../UpcomingMeetings';

// Mock the airtable functions
jest.mock('../../../lib/airtable', () => ({
  getUpcomingBookings: jest.fn(),
  getMeetingRooms: jest.fn(),
}));

// Mock environment - undefined means use current day logic
jest.mock('../../../lib/env', () => ({
  env: {
    UPCOMING_MEETINGS_HOURS: undefined,
  },
}));

// Mock React cache
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: (fn: any) => fn,
}));

const { getUpcomingBookings, getMeetingRooms } = require('../../../lib/airtable');

const mockBookings = [
  {
    id: 'rec1',
    user: 'user1',
    userLabel: 'John Doe',
    startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago (current)
    endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
    note: 'Current meeting',
    room: 'room1',
    status: 'Confirmed',
  },
  {
    id: 'rec2',
    user: 'user2',
    userLabel: 'Jane Smith',
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
    note: 'Future meeting',
    room: 'room2',
    status: 'Confirmed',
  },
];

const mockRooms = [
  {
    id: 'room1',
    name: 'Conference Room A',
    capacity: 8,
    notes: 'Main conference room',
    startTime: 28800, // 8:00 AM
    endTime: 64800, // 6:00 PM
  },
  {
    id: 'room2',
    name: 'Meeting Room B',
    capacity: 4,
    notes: 'Small meeting room',
    startTime: 28800,
    endTime: 64800,
  },
];

describe('UpcomingMeetings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upcoming meetings with current and future bookings', async () => {
    getUpcomingBookings.mockResolvedValue(mockBookings);
    getMeetingRooms.mockResolvedValue(mockRooms);

    const component = await UpcomingMeetings();
    render(component);

    expect(screen.getByText('Upcoming Meetings')).toBeInTheDocument();
    expect(screen.getByText('Currently Ongoing')).toBeInTheDocument();
    expect(screen.getByText('Coming Up')).toBeInTheDocument();
    
    // Check for room names
    expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    expect(screen.getByText('Meeting Room B')).toBeInTheDocument();
    
    // Check for user names
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    
    // Check for Live badge on current meeting
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders empty state when no bookings exist', async () => {
    getUpcomingBookings.mockResolvedValue([]);
    getMeetingRooms.mockResolvedValue(mockRooms);

    const component = await UpcomingMeetings();
    render(component);

    expect(screen.getByText('Upcoming Meetings')).toBeInTheDocument();
    expect(screen.getByText('No upcoming meetings')).toBeInTheDocument();
    expect(screen.getByText('No meetings scheduled for today.')).toBeInTheDocument();
  });

  it('renders only upcoming meetings when no current meetings exist', async () => {
    const futureBookings = [mockBookings[1]]; // Only future meeting
    getUpcomingBookings.mockResolvedValue(futureBookings);
    getMeetingRooms.mockResolvedValue(mockRooms);

    const component = await UpcomingMeetings();
    render(component);

    expect(screen.getByText('Upcoming Meetings')).toBeInTheDocument();
    expect(screen.queryByText('Currently Ongoing')).not.toBeInTheDocument();
    expect(screen.queryByText('Coming Up')).not.toBeInTheDocument();
    expect(screen.getByText('Meeting Room B')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('handles missing room information gracefully', async () => {
    const bookingWithUnknownRoom = {
      ...mockBookings[0],
      room: 'unknown-room',
    };
    
    getUpcomingBookings.mockResolvedValue([bookingWithUnknownRoom]);
    getMeetingRooms.mockResolvedValue(mockRooms);

    const component = await UpcomingMeetings();
    render(component);

    expect(screen.getByText('Unknown Room')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays meeting notes when available', async () => {
    getUpcomingBookings.mockResolvedValue(mockBookings);
    getMeetingRooms.mockResolvedValue(mockRooms);

    const component = await UpcomingMeetings();
    render(component);

    expect(screen.getByText('"Current meeting"')).toBeInTheDocument();
    expect(screen.getByText('"Future meeting"')).toBeInTheDocument();
  });

  it('limits upcoming meetings display to 8 items', async () => {
    // Create 10 future meetings
    const manyFutureBookings = Array.from({ length: 10 }, (_, i) => ({
      id: `rec${i + 3}`,
      user: `user${i + 3}`,
      userLabel: `User ${i + 3}`,
      startTime: new Date(Date.now() + (i + 1) * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + (i + 2) * 60 * 60 * 1000).toISOString(),
      note: `Meeting ${i + 3}`,
      room: 'room1',
      status: 'Confirmed',
    }));

    getUpcomingBookings.mockResolvedValue(manyFutureBookings);
    getMeetingRooms.mockResolvedValue(mockRooms);

    const component = await UpcomingMeetings();
    render(component);

    // Should show "And X more meetings..." text
    expect(screen.getByText('And 2 more meetings...')).toBeInTheDocument();
  });
});