import { getServerUser } from '@/lib/auth_server';
import { withErrorHandler } from '@/lib/error-handler';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles requests to get current authenticated user data
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} JSON response with user data or null
 * @description Retrieves the current authenticated user from the session cookie.
 * Returns the user object if authenticated, or null if no valid session exists.
 * This function is wrapped with error handling middleware.
 */
async function handleGetUser(request: NextRequest) {
  const user = await getServerUser(request.cookies);

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}

export const GET = withErrorHandler(handleGetUser);