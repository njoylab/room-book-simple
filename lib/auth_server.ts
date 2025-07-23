/**
 * @fileoverview Server-side authentication utilities for secure session management
 * @description Provides server-side authentication functions using JWT encryption
 * for secure user session management, cookie handling, and authentication checks.
 */

"use server";

import { EncryptJWT, jwtDecrypt } from 'jose';
import { RequestCookies, ResponseCookies } from 'next/dist/compiled/@edge-runtime/cookies';
import { env, isProduction } from './env';
import { User } from "./types";

/** Secret key used for JWT encryption/decryption */
const SECRET_KEY = new TextEncoder().encode(env.SESSION_SECRET);

/** Type alias for cookie store (request or response cookies) */
type CookieStore = RequestCookies | ResponseCookies;

/**
 * Encrypts user data for secure session storage
 * @param {User} user - User object to encrypt
 * @returns {Promise<string>} Encrypted JWT token containing user data
 * @description Creates an encrypted JWT token containing user information with
 * configurable expiration time (default: 7 days). Used for secure session storage in HTTP-only cookies.
 * @example
 * ```typescript
 * const user = { id: '123', name: 'John Doe', email: 'john@example.com' };
 * const encryptedToken = await encryptUser(user);
 * ```
 */
async function encryptUser(user: User): Promise<string> {
  return await new EncryptJWT({ user })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(`${env.SESSION_DURATION_HOURS}h`)
    .encrypt(SECRET_KEY);
}

/**
 * Decrypts user data from an encrypted session token
 * @param {string} encryptedData - Encrypted JWT token containing user data
 * @returns {Promise<User | null>} Decrypted user object or null if decryption fails
 * @description Decrypts an encrypted JWT token to retrieve user information.
 * Returns null if the token is invalid, expired, or corrupted.
 * @example
 * ```typescript
 * const encryptedToken = 'encrypted-jwt-token';
 * const user = await decryptUser(encryptedToken);
 * if (user) {
 *   console.log(`User: ${user.name}`);
 * }
 * ```
 */
async function decryptUser(encryptedData: string): Promise<User | null> {
  try {
    const { payload } = await jwtDecrypt(encryptedData, SECRET_KEY);
    return payload.user as User;
  } catch (error) {
    console.error('Error decrypting user from cookies:', error);
    return null;
  }
}

/**
 * Retrieves the current authenticated user from server-side cookies
 * @param {CookieStore} cookies - Cookie store from request or response
 * @returns {Promise<User | null>} Current authenticated user or null if not authenticated
 * @description Server-side function to extract and decrypt user information from
 * HTTP-only session cookies. Used in server components and API routes to check
 * authentication status and retrieve user data.
 * @example
 * ```typescript
 * // In a server component
 * const cookies = await cookies();
 * const user = await getServerUser(cookies);
 * if (user) {
 *   // User is authenticated
 * }
 * ```
 */
export async function getServerUser(cookies: CookieStore): Promise<User | null> {
  try {
    const encryptedUser = cookies.get(env.SESSION_COOKIE_NAME);

    if (!encryptedUser) {
      return null;
    }

    const user = await decryptUser(encryptedUser.value);
    return user;
  } catch (error) {
    console.error('Error decrypting user from cookies:', error);
    return null;
  }
}

/**
 * Checks if a user is currently authenticated
 * @param {CookieStore} cookies - Cookie store from request or response
 * @returns {Promise<boolean>} True if user is authenticated, false otherwise
 * @description Server-side authentication check that verifies if a valid user
 * session exists. More efficient than getServerUser when you only need to check
 * authentication status without retrieving user data.
 * @example
 * ```typescript
 * // In an API route
 * const cookies = await cookies();
 * if (!(await isAuthenticated(cookies))) {
 *   return new Response('Unauthorized', { status: 401 });
 * }
 * ```
 */
export async function isAuthenticated(cookies: CookieStore): Promise<boolean> {
  const user = await getServerUser(cookies);
  return user !== null;
}

/**
 * Logs out a user by clearing their session cookie
 * @param {ResponseCookies} cookies - Response cookies to modify
 * @returns {Promise<void>} Promise that resolves when logout is complete
 * @description Removes the user's session cookie to log them out.
 * Should be called from API routes when handling logout requests.
 * @example
 * ```typescript
 * // In a logout API route
 * export async function POST() {
 *   const cookies = cookies();
 *   await logout(cookies);
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */
export async function logout(cookies: ResponseCookies): Promise<void> {
  cookies.delete(env.SESSION_COOKIE_NAME);
}

/**
 * Creates an authenticated session for a user
 * @param {ResponseCookies} cookies - Response cookies to set
 * @param {User} user - User object to create session for
 * @returns {Promise<void>} Promise that resolves when session is created
 * @description Encrypts user data and sets an HTTP-only session cookie with
 * appropriate security settings. The cookie expires after the configured duration
 * (default: 7 days) and uses secure settings in production environments.
 * @example
 * ```typescript
 * // After successful authentication
 * const user = { id: '123', name: 'John Doe', email: 'john@example.com' };
 * const cookies = cookies();
 * await loggedIn(cookies, user);
 * ```
 */
export async function loggedIn(cookies: ResponseCookies, user: User): Promise<void> {
  const encryptedUser = await encryptUser(user);
  cookies.set(env.SESSION_COOKIE_NAME, encryptedUser, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: env.SESSION_DURATION_HOURS * 60 * 60, // Convert hours to seconds
    path: '/',
  });
}

/**
 * Authenticates a request and returns the user if valid
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {Promise<User | null>} Authenticated user or null if not authenticated
 * @description Extracts user information from request cookies and validates the session.
 * Used in API routes to check authentication status and retrieve user data.
 * @example
 * ```typescript
 * // In an API route
 * const user = await authenticateRequest(request);
 * if (!user) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * ```
 */
export async function authenticateRequest(request: { cookies: CookieStore }): Promise<User | null> {
  return await getServerUser(request.cookies);
}