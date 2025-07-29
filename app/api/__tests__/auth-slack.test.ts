/**
 * @fileoverview Tests for /api/auth/slack route
 * @description Tests for Slack OAuth authentication flow
 */

import { NextRequest } from 'next/server';
import { GET } from '../auth/slack/route';
import * as authServer from '@/lib/auth_server';
import * as env from '@/lib/env';

// Mock the auth server module
jest.mock('@/lib/auth_server', () => ({
  loggedIn: jest.fn()
}));

// Mock environment
jest.mock('@/lib/env', () => ({
  env: {
    SLACK_CLIENT_ID: 'test-client-id',
    SLACK_CLIENT_SECRET: 'test-client-secret'
  },
  getBaseUrl: jest.fn(() => 'http://localhost:3000')
}));

// Mock error handler
jest.mock('@/lib/error-handler', () => ({
  withErrorHandler: jest.fn((handler) => handler),
  createError: {
    authentication: jest.fn((message) => new Error(message))
  }
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockLoggedIn = authServer.loggedIn as jest.Mock;

// Mock Slack API responses
const mockTokenResponse = {
  ok: true,
  authed_user: {
    access_token: 'test-access-token'
  }
};

const mockUserResponse = {
  ok: true,
  user: {
    id: 'U123456789',
    name: 'Test User',
    image_192: 'https://slack.com/avatar.jpg'
  },
  team: {
    name: 'Test Team'
  }
};

describe('/api/auth/slack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('GET - OAuth initiation', () => {
    it('should redirect to Slack OAuth when no code is present', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/slack');
      const response = await GET(request);

      expect(response.status).toBe(307); // NextResponse.redirect status
      expect(response.headers.get('location')).toContain('https://slack.com/oauth/v2/authorize');
      expect(response.headers.get('location')).toContain('test-client-id');
      expect(response.headers.get('location')).toContain('identity.basic');
      expect(response.headers.get('location')).toContain('redirect_uri=');
    });

    it('should handle OAuth error parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/slack?error=access_denied');

      await expect(GET(request)).rejects.toThrow('OAuth access denied');
    });
  });

  describe('GET - OAuth callback', () => {
    it('should complete OAuth flow and login user successfully', async () => {
      // Mock successful token exchange
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTokenResponse)
        })
        // Mock successful user data fetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockUserResponse)
        });

      mockLoggedIn.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/slack?code=test-auth-code');
      const response = await GET(request);

      // Verify token exchange call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/oauth.v2.access',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: expect.any(URLSearchParams)
        })
      );

      // Verify user data fetch
      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/users.identity',
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer test-access-token' }
        })
      );

      // Verify user is logged in
      expect(mockLoggedIn).toHaveBeenCalledWith(
        expect.any(Object),
        {
          id: 'U123456789',
          name: 'Test User',
          image: 'https://slack.com/avatar.jpg',
          team: 'Test Team'
        }
      );

      // Verify redirect to home page
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/');
    });

    it('should handle token exchange failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: false, error: 'invalid_code' })
      });

      const request = new NextRequest('http://localhost:3000/api/auth/slack?code=invalid-code');

      await expect(GET(request)).rejects.toThrow('OAuth token exchange failed');
    });

    it('should handle user data fetch failure', async () => {
      // Mock successful token exchange
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTokenResponse)
        })
        // Mock failed user data fetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ ok: false, error: 'token_revoked' })
        });

      const request = new NextRequest('http://localhost:3000/api/auth/slack?code=test-auth-code');

      await expect(GET(request)).rejects.toThrow('Failed to fetch user data from Slack');
    });

    it('should handle network errors during token exchange', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/auth/slack?code=test-auth-code');

      await expect(GET(request)).rejects.toThrow('Network error');
    });

    it('should handle network errors during user data fetch', async () => {
      // Mock successful token exchange
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTokenResponse)
        })
        // Mock network error on user data fetch
        .mockRejectedValueOnce(new Error('User API unavailable'));

      const request = new NextRequest('http://localhost:3000/api/auth/slack?code=test-auth-code');

      await expect(GET(request)).rejects.toThrow('User API unavailable');
    });
  });

  describe('Request parameters and URL construction', () => {
    it('should include correct OAuth parameters in redirect URL', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/slack');
      const response = await GET(request);

      const location = response.headers.get('location');
      expect(location).toContain('client_id=test-client-id');
      expect(location).toContain('user_scope=identity.basic,identity.email,identity.avatar');
      expect(location).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fslack');
    });

    it('should send correct parameters in token exchange request', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockTokenResponse)
      }).mockResolvedValueOnce({
        json: () => Promise.resolve(mockUserResponse)
      });

      mockLoggedIn.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/slack?code=test-code');
      await GET(request);

      const tokenExchangeCall = mockFetch.mock.calls[0];
      const body = tokenExchangeCall[1].body as URLSearchParams;

      expect(body.get('client_id')).toBe('test-client-id');
      expect(body.get('client_secret')).toBe('test-client-secret');
      expect(body.get('code')).toBe('test-code');
      expect(body.get('redirect_uri')).toBe('http://localhost:3000/api/auth/slack');
    });

    it('should handle different base URLs correctly', async () => {
      const mockGetBaseUrl = env.getBaseUrl as jest.Mock;
      mockGetBaseUrl.mockReturnValue('https://myapp.com');

      const request = new NextRequest('https://myapp.com/api/auth/slack');
      const response = await GET(request);

      const location = response.headers.get('location');
      expect(location).toContain('redirect_uri=https%3A%2F%2Fmyapp.com%2Fapi%2Fauth%2Fslack');
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle malformed token response', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const request = new NextRequest('http://localhost:3000/api/auth/slack?code=test-code');

      await expect(GET(request)).rejects.toThrow('Invalid JSON');
    });

    it('should handle malformed user data response', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTokenResponse)
        })
        .mockResolvedValueOnce({
          json: () => Promise.reject(new Error('Invalid JSON'))
        });

      const request = new NextRequest('http://localhost:3000/api/auth/slack?code=test-code');

      await expect(GET(request)).rejects.toThrow('Invalid JSON');
    });

    it('should handle missing user data fields', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTokenResponse)
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            ok: true,
            user: { id: 'U123456789' }, // Missing name and image
            team: { name: 'Test Team' }
          })
        });

      mockLoggedIn.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/slack?code=test-code');
      await GET(request);

      expect(mockLoggedIn).toHaveBeenCalledWith(
        expect.any(Object),
        {
          id: 'U123456789',
          name: undefined,
          image: undefined,
          team: 'Test Team'
        }
      );
    });

    it('should handle empty code parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/slack?code=');
      const response = await GET(request);

      // Should treat empty code as no code and redirect to OAuth
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('slack.com/oauth/v2/authorize');
    });
  });
});