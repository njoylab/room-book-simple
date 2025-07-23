/**
 * @fileoverview Tests for Header component
 * @description Tests for the main application header component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';
import * as authServer from '@/lib/auth_server';
import { User } from '@/lib/types';

// Mock Next.js modules
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode, href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock auth server
jest.mock('@/lib/auth_server', () => ({
  getServerUser: jest.fn()
}));

// Mock UserMenu component
jest.mock('../UserMenu', () => ({
  UserMenu: ({ user }: { user: User | null }) => (
    user ? (
      <div data-testid="user-menu">
        <span>Welcome, {user.name}</span>
        <button>Logout</button>
      </div>
    ) : (
      <div data-testid="auth-section">
        <a href="/api/auth/slack">Sign in with Slack</a>
      </div>
    )
  )
}));

const mockGetServerUser = authServer.getServerUser as jest.Mock;
const mockCookies = require('next/headers').cookies as jest.Mock;

// Test data
const testUser: User = {
  id: 'U123456789',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
  team: 'Test Team'
};

describe.skip('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.mockReturnValue({});
  });

  describe('Rendering', () => {
    it('should render header with branding', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.getByText('B4I')).toBeInTheDocument();
      expect(screen.getByText('Meeting Rooms')).toBeInTheDocument();
    });

    it('should render navigation for authenticated users', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.getByRole('link', { name: /rooms/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my bookings/i })).toBeInTheDocument();
    });

    it('should not render navigation for non-authenticated users', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.queryByRole('link', { name: /rooms/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /my bookings/i })).not.toBeInTheDocument();
    });

    it('should render user menu when authenticated', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
      expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
    });

    it('should render authentication section when not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.getByTestId('auth-section')).toBeInTheDocument();
      expect(screen.getByText('Sign in with Slack')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should have correct navigation link hrefs', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.getByRole('link', { name: /b4i meeting rooms/i })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: /rooms/i })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: /my bookings/i })).toHaveAttribute('href', '/my-bookings');
    });

    it('should have accessible navigation structure', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  describe('Authentication Integration', () => {
    it('should call getServerUser with cookies', async () => {
      const mockCookiesInstance = { get: jest.fn(), set: jest.fn() };
      mockCookies.mockReturnValue(mockCookiesInstance);
      mockGetServerUser.mockResolvedValue(null);

      await Header();

      expect(mockCookies).toHaveBeenCalled();
      expect(mockGetServerUser).toHaveBeenCalledWith(mockCookiesInstance);
    });

    it('should handle authentication errors gracefully', async () => {
      mockGetServerUser.mockRejectedValue(new Error('Auth error'));

      // Should not throw and should render as unauthenticated
      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.getByTestId('auth-section')).toBeInTheDocument();
    });

    it('should handle null user response', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.getByTestId('auth-section')).toBeInTheDocument();
      expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive layout classes', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('bg-white', 'shadow-sm');
      
      const container = header.querySelector('.container, .max-w-7xl');
      expect(container).toBeTruthy();
    });

    it('should have proper mobile navigation structure', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      // Navigation should be properly structured for mobile
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic HTML structure', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have accessible links with proper text', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      const homeLink = screen.getByRole('link', { name: /b4i meeting rooms/i });
      const roomsLink = screen.getByRole('link', { name: /rooms/i });
      const bookingsLink = screen.getByRole('link', { name: /my bookings/i });

      expect(homeLink).toBeInTheDocument();
      expect(roomsLink).toBeInTheDocument();
      expect(bookingsLink).toBeInTheDocument();
    });

    it('should handle keyboard navigation', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Visual Design', () => {
    it('should have proper styling classes', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('bg-white');
      expect(header).toHaveClass('shadow-sm');
    });

    it('should have consistent spacing and layout', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('flex');
    });
  });

  describe('User States', () => {
    it('should handle user with missing fields gracefully', async () => {
      const incompleteUser = {
        id: 'U123456789',
        name: 'Test User'
        // Missing image and team
      } as User;

      mockGetServerUser.mockResolvedValue(incompleteUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
      expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
    });

    it('should handle empty user name', async () => {
      const userWithEmptyName = {
        ...testUser,
        name: ''
      };

      mockGetServerUser.mockResolvedValue(userWithEmptyName);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });

    it('should handle different user roles/teams', async () => {
      const adminUser = {
        ...testUser,
        team: 'Admin Team'
      };

      mockGetServerUser.mockResolvedValue(adminUser);

      const HeaderComponent = await Header();
      render(HeaderComponent);

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
      expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle cookies() throwing an error', async () => {
      mockCookies.mockImplementation(() => {
        throw new Error('Cookies unavailable');
      });

      // Should not crash the component
      const HeaderComponent = await Header();
      render(HeaderComponent);

      // Should render as unauthenticated state
      expect(screen.getByTestId('auth-section')).toBeInTheDocument();
    });

    it('should handle server-side rendering issues', async () => {
      mockGetServerUser.mockImplementation(() => {
        throw new Error('SSR error');
      });

      const HeaderComponent = await Header();
      render(HeaderComponent);

      // Should gracefully fallback to unauthenticated state
      expect(screen.getByTestId('auth-section')).toBeInTheDocument();
    });
  });
});