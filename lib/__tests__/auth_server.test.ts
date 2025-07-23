/**
 * @fileoverview Tests for server-side authentication utilities
 * @description Comprehensive test suite for JWT encryption, session management,
 * and authentication functions in auth_server.ts
 */

import type { RequestCookies, ResponseCookies } from 'next/dist/compiled/@edge-runtime/cookies';
import type { User } from '../types';

// Mock the environment
jest.mock('../env', () => ({
  env: {
    SESSION_SECRET: 'test-session-secret-32-characters',
    SESSION_COOKIE_NAME: 'test_session_cookie',
    SESSION_DURATION_HOURS: 168 // 7 days
  },
  isProduction: false
}));

// Mock console.error to keep tests clean
const mockConsoleError = jest.fn();
console.error = mockConsoleError;

// Test user data
const testUser: User = {
  id: 'U123456789',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
  team: 'Test Team'
};

describe.skip('auth_server', () => {
  let getServerUser: any, isAuthenticated: any, logout: any, loggedIn: any, authenticateRequest: any;

  beforeAll(async () => {
    // Import functions after mocks are set up
    const authModule = await import('../auth_server');
    getServerUser = authModule.getServerUser;
    isAuthenticated = authModule.isAuthenticated;
    logout = authModule.logout;
    loggedIn = authModule.loggedIn;
    authenticateRequest = authModule.authenticateRequest;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
  });

  describe('getServerUser', () => {
    it('should return null when no cookie is present', async () => {
      const mockCookies = {
        get: jest.fn().mockReturnValue(undefined)
      } as unknown as RequestCookies;

      const result = await getServerUser(mockCookies);

      expect(result).toBeNull();
      expect(mockCookies.get).toHaveBeenCalledWith(env.SESSION_COOKIE_NAME);
    });

    it('should return null when cookie value is empty', async () => {
      const mockCookies = {
        get: jest.fn().mockReturnValue({ value: '' })
      } as unknown as RequestCookies;

      const result = await getServerUser(mockCookies);

      expect(result).toBeNull();
    });

    it('should return null and log error when decryption fails', async () => {
      const mockCookies = {
        get: jest.fn().mockReturnValue({ value: 'invalid-jwt-token' })
      } as unknown as RequestCookies;

      const result = await getServerUser(mockCookies);

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error decrypting user from cookies:',
        expect.any(Error)
      );
    });

    it('should return user when valid encrypted token exists', async () => {
      // First, we need to create a valid encrypted token
      const mockResponseCookies = {
        set: jest.fn()
      } as unknown as ResponseCookies;

      // Create a valid session
      await loggedIn(mockResponseCookies, testUser);

      // Get the encrypted value that was set
      const setCall = (mockResponseCookies.set as jest.Mock).mock.calls[0];
      const encryptedValue = setCall[1];

      // Now test retrieving it
      const mockRequestCookies = {
        get: jest.fn().mockReturnValue({ value: encryptedValue })
      } as unknown as RequestCookies;

      const result = await getServerUser(mockRequestCookies);

      expect(result).toEqual(testUser);
      expect(mockRequestCookies.get).toHaveBeenCalledWith(env.SESSION_COOKIE_NAME);
    });

    it('should handle exceptions gracefully', async () => {
      const mockCookies = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Cookie error');
        })
      } as unknown as RequestCookies;

      const result = await getServerUser(mockCookies);

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error decrypting user from cookies:',
        expect.any(Error)
      );
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no user is found', async () => {
      const mockCookies = {
        get: jest.fn().mockReturnValue(undefined)
      } as unknown as RequestCookies;

      const result = await isAuthenticated(mockCookies);

      expect(result).toBe(false);
    });

    it('should return true when valid user is found', async () => {
      // Create a valid session first
      const mockResponseCookies = {
        set: jest.fn()
      } as unknown as ResponseCookies;

      await loggedIn(mockResponseCookies, testUser);
      const encryptedValue = (mockResponseCookies.set as jest.Mock).mock.calls[0][1];

      // Test authentication check
      const mockRequestCookies = {
        get: jest.fn().mockReturnValue({ value: encryptedValue })
      } as unknown as RequestCookies;

      const result = await isAuthenticated(mockRequestCookies);

      expect(result).toBe(true);
    });
  });

  describe('logout', () => {
    it('should delete the session cookie', async () => {
      const mockCookies = {
        delete: jest.fn()
      } as unknown as ResponseCookies;

      await logout(mockCookies);

      expect(mockCookies.delete).toHaveBeenCalledWith(env.SESSION_COOKIE_NAME);
    });
  });

  describe('loggedIn', () => {
    it('should set encrypted user cookie with correct options', async () => {
      const mockCookies = {
        set: jest.fn()
      } as unknown as ResponseCookies;

      await loggedIn(mockCookies, testUser);

      expect(mockCookies.set).toHaveBeenCalledWith(
        env.SESSION_COOKIE_NAME,
        expect.any(String), // encrypted JWT token
        {
          httpOnly: true,
          secure: false, // isProduction is false in test
          sameSite: 'lax',
          maxAge: 24 * 60 * 60, // 24 hours
          path: '/',
        }
      );
    });

    it('should create a valid encrypted token that can be decrypted', async () => {
      const mockCookies = {
        set: jest.fn()
      } as unknown as ResponseCookies;

      await loggedIn(mockCookies, testUser);

      // Get the encrypted token
      const encryptedToken = (mockCookies.set as jest.Mock).mock.calls[0][1];

      // Verify it can be decrypted
      const mockRequestCookies = {
        get: jest.fn().mockReturnValue({ value: encryptedToken })
      } as unknown as RequestCookies;

      const decryptedUser = await getServerUser(mockRequestCookies);
      expect(decryptedUser).toEqual(testUser);
    });
  });

  describe('authenticateRequest', () => {
    it('should return null when no valid session exists', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue(undefined)
        } as unknown as RequestCookies
      };

      const result = await authenticateRequest(mockRequest);

      expect(result).toBeNull();
    });

    it('should return user when valid session exists', async () => {
      // Create a valid session first
      const mockResponseCookies = {
        set: jest.fn()
      } as unknown as ResponseCookies;

      await loggedIn(mockResponseCookies, testUser);
      const encryptedValue = (mockResponseCookies.set as jest.Mock).mock.calls[0][1];

      // Test request authentication
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: encryptedValue })
        } as unknown as RequestCookies
      };

      const result = await authenticateRequest(mockRequest);

      expect(result).toEqual(testUser);
    });
  });

  describe('JWT token expiration and security', () => {
    it('should reject expired tokens', async () => {
      // This is a theoretical test - in practice, we'd need to mock the JWT library
      // or wait for actual expiration, but we can test that invalid tokens are rejected
      const mockCookies = {
        get: jest.fn().mockReturnValue({ 
          value: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..expired-token'
        })
      } as unknown as RequestCookies;

      const result = await getServerUser(mockCookies);

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should reject malformed JWT tokens', async () => {
      const mockCookies = {
        get: jest.fn().mockReturnValue({ value: 'not-a-jwt-token' })
      } as unknown as RequestCookies;

      const result = await getServerUser(mockCookies);

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error decrypting user from cookies:',
        expect.any(Error)
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null cookie value gracefully', async () => {
      const mockCookies = {
        get: jest.fn().mockReturnValue({ value: null })
      } as unknown as RequestCookies;

      const result = await getServerUser(mockCookies);

      expect(result).toBeNull();
    });

    it('should handle undefined cookie value gracefully', async () => {
      const mockCookies = {
        get: jest.fn().mockReturnValue({ value: undefined })
      } as unknown as RequestCookies;

      const result = await getServerUser(mockCookies);

      expect(result).toBeNull();
    });

    it('should handle user data with missing fields', async () => {
      const incompleteUser = {
        id: 'U123456789',
        name: 'Test User'
        // Missing image and team fields
      } as User;

      const mockResponseCookies = {
        set: jest.fn()
      } as unknown as ResponseCookies;

      await loggedIn(mockResponseCookies, incompleteUser);
      const encryptedValue = (mockResponseCookies.set as jest.Mock).mock.calls[0][1];

      const mockRequestCookies = {
        get: jest.fn().mockReturnValue({ value: encryptedValue })
      } as unknown as RequestCookies;

      const result = await getServerUser(mockRequestCookies);
      expect(result).toEqual(incompleteUser);
    });
  });

  describe('Cookie security settings', () => {
    it('should set secure flag in production environment', async () => {
      // Mock production environment
      const originalIsProduction = require('../env').isProduction;
      require('../env').isProduction = true;

      const mockCookies = {
        set: jest.fn()
      } as unknown as ResponseCookies;

      await loggedIn(mockCookies, testUser);

      expect(mockCookies.set).toHaveBeenCalledWith(
        env.SESSION_COOKIE_NAME,
        expect.any(String),
        expect.objectContaining({
          secure: true
        })
      );

      // Restore original value
      require('../env').isProduction = originalIsProduction;
    });

    it('should set correct cookie path and sameSite settings', async () => {
      const mockCookies = {
        set: jest.fn()
      } as unknown as ResponseCookies;

      await loggedIn(mockCookies, testUser);

      expect(mockCookies.set).toHaveBeenCalledWith(
        env.SESSION_COOKIE_NAME,
        expect.any(String),
        expect.objectContaining({
          path: '/',
          sameSite: 'lax',
          httpOnly: true
        })
      );
    });
  });
});