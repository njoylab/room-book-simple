/**
 * @fileoverview Tests for /api/auth/user route
 * @description Tests for user authentication status endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '../auth/user/route';
import * as authServer from '@/lib/auth_server';
import { User } from '@/lib/types';

// Mock the auth server module
jest.mock('@/lib/auth_server', () => ({
  getServerUser: jest.fn()
}));

// Mock error handler
jest.mock('@/lib/error-handler', () => ({
  withErrorHandler: jest.fn((handler) => handler)
}));

const mockGetServerUser = authServer.getServerUser as jest.Mock;

const testUser: User = {
  id: 'U123456789',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
  team: 'Test Team'
};

describe('/api/auth/user', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user data when user is authenticated', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const request = new NextRequest('http://localhost:3000/api/auth/user');
      const response = await GET(request);
      const data = await response.json();

      expect(mockGetServerUser).toHaveBeenCalledWith(request.cookies);
      expect(response.status).toBe(200);
      expect(data).toEqual({ user: testUser });
    });

    it('should return null user when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/user');
      const response = await GET(request);
      const data = await response.json();

      expect(mockGetServerUser).toHaveBeenCalledWith(request.cookies);
      expect(response.status).toBe(200);
      expect(data).toEqual({ user: null });
    });

    it('should handle authentication errors gracefully', async () => {
      mockGetServerUser.mockRejectedValue(new Error('Authentication failed'));

      const request = new NextRequest('http://localhost:3000/api/auth/user');

      // Since withErrorHandler is mocked to pass through, the error will propagate
      await expect(GET(request)).rejects.toThrow('Authentication failed');
      expect(mockGetServerUser).toHaveBeenCalledWith(request.cookies);
    });

    it('should pass cookies correctly to getServerUser', async () => {
      mockGetServerUser.mockResolvedValue(testUser);

      const request = new NextRequest('http://localhost:3000/api/auth/user', {
        headers: {
          'Cookie': 'session_cookie=test-value'
        }
      });

      await GET(request);

      expect(mockGetServerUser).toHaveBeenCalledWith(request.cookies);
    });
  });
});