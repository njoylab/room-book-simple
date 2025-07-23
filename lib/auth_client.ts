/**
 * @fileoverview Client-side authentication utilities for the room booking application
 * @description Provides client-side functions for user authentication, session management,
 * and logout functionality that can be used in React components and client-side logic.
 */

"use client";
import { User } from "./types";

/**
 * Retrieves the current authenticated user from the server
 * @returns {Promise<User | null>} Promise resolving to the current user or null if not authenticated
 * @description Fetches the current user's information from the authentication API endpoint.
 * Returns null if the user is not authenticated or if an error occurs during the request.
 * This function can be used in client components to check authentication status and
 * retrieve user information for UI rendering.
 * @example
 * ```typescript
 * const user = await getUser();
 * if (user) {
 *   console.log(`Welcome ${user.name}!`);
 * } else {
 *   console.log('Please log in');
 * }
 * ```
 */
export async function getUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/user');
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Logs out the current user and reloads the page
 * @returns {Promise<void>} Promise that resolves when logout is complete
 * @description Sends a logout request to the server to clear the user's session
 * and then reloads the current page to reflect the logged-out state.
 * Handles errors gracefully by logging them to the console.
 * @example
 * ```typescript
 * // In a logout button click handler
 * const handleLogout = async () => {
 *   await logout();
 *   // Page will reload automatically
 * };
 * ```
 */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
    });
    window.location.reload();
  } catch (error) {
    console.error('Error logging out:', error);
  }
}