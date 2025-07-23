import { logout } from '@/lib/auth_server';
import { withErrorHandler } from '@/lib/error-handler';
import { NextResponse } from 'next/server';

/**
 * Handles user logout requests
 * @returns {Promise<NextResponse>} JSON response indicating logout success
 * @description Clears the user's session cookie and returns a success response.
 * This function is wrapped with error handling middleware.
 */
async function handleLogout() {
  const response = NextResponse.json({ success: true });
  await logout(response.cookies);

  return response;
}

export const POST = withErrorHandler(handleLogout);