/**
 * @fileoverview Application header component with navigation and user authentication
 * @description Provides the main navigation header with branding, navigation links,
 * and user authentication status display with login/logout functionality.
 */

// app/components/ImprovedHeader.tsx
import { getServerUser } from '@/lib/auth_server';
import { env } from '@/lib/env';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { UserMenu } from './UserMenu';

/**
 * Main application header component
 * @returns {Promise<JSX.Element>} Rendered header component
 * @description Displays the application header featuring:
 * - Company logo and application branding
 * - Main navigation menu (visible only to authenticated users)
 * - User authentication status and menu
 * - Responsive design for mobile and desktop
 * - Slack authentication integration for non-authenticated users
 * 
 * The component performs server-side user authentication check and
 * conditionally renders different UI based on authentication status.
 * @example
 * ```tsx
 * // Used in layout components
 * <Header />
 * ```
 */
export async function Header() {
    /** Get cookies for user authentication */
    const cookieStore = await cookies();
    /** Retrieve current user from server-side authentication */
    const user = await getServerUser(cookieStore);

    return (
        <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    <div className="flex items-center space-x-8">
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">{env.APP_TITLE}</span>
                            </div>
                            <h1 className="text-xl font-semibold text-gray-900">
                                Meeting Rooms
                            </h1>
                        </Link>

                        {user && (
                            <nav className="hidden md:flex space-x-6">
                                <Link
                                    href="/"
                                    className="text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    Rooms
                                </Link>
                                <Link
                                    href="/my-bookings"
                                    className="text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    My Bookings
                                </Link>
                            </nav>
                        )}
                    </div>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <UserMenu user={user} />
                        ) : (
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/api/auth/slack"
                                    className="inline-flex items-center px-4 py-2 bg-slack-green text-white text-sm font-medium rounded-md hover:bg-slack-green-dark transition-colors"
                                >
                                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                                    </svg>
                                    Sign in with Slack
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

