/**
 * @fileoverview Tests for /api/auth/logout route
 * @description Tests for user logout endpoint
 */

import { POST } from '../auth/logout/route';
import * as authServer from '@/lib/auth_server';

// Mock the auth server module
jest.mock('@/lib/auth_server', () => ({
  logout: jest.fn()
}));

// Mock error handler
jest.mock('@/lib/error-handler', () => ({
  withErrorHandler: jest.fn((handler) => handler)
}));

const mockLogout = authServer.logout as jest.Mock;

describe('/api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should successfully logout user and return success response', async () => {
      mockLogout.mockResolvedValue(undefined);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockLogout).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should call logout with response cookies', async () => {
      mockLogout.mockResolvedValue(undefined);

      const response = await POST();

      // Verify logout was called with cookies object
      expect(mockLogout).toHaveBeenCalledTimes(1);
      const cookiesArg = mockLogout.mock.calls[0][0];
      expect(cookiesArg).toHaveProperty('delete');
      expect(cookiesArg).toHaveProperty('set');
    });

    it('should handle logout errors gracefully', async () => {
      mockLogout.mockRejectedValue(new Error('Logout failed'));

      // Since withErrorHandler is mocked to pass through, the error will propagate
      await expect(POST()).rejects.toThrow('Logout failed');
      expect(mockLogout).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should return success even if logout operation is already complete', async () => {
      // Simulate logout being called when user is already logged out
      mockLogout.mockResolvedValue(undefined);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });
  });
});