/**
 * @fileoverview User menu dropdown component for authenticated user actions
 * @description Provides a dropdown menu for authenticated users with user information
 * display, navigation options, and logout functionality.
 */

'use client';

import { logout } from '@/lib/auth_client';
import { User } from '@/lib/types';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

/**
 * Props for the UserMenu component
 * @interface UserMenuProps
 */
interface UserMenuProps {
    /** The authenticated user object */
    user: User;
}

/**
 * User menu dropdown component for authenticated users
 * @param {UserMenuProps} props - Component props
 * @returns {JSX.Element} Rendered user menu component
 * @description Displays a dropdown menu for authenticated users featuring:
 * - User avatar and name display
 * - Team information
 * - Navigation to user-specific pages
 * - Logout functionality
 * - Click-outside-to-close behavior
 * - Smooth animations and transitions
 * 
 * The component uses a ref and event listeners to handle closing
 * when clicking outside the menu area.
 * @example
 * ```tsx
 * <UserMenu user={currentUser} />
 * ```
 */
export function UserMenu({ user }: UserMenuProps) {
    /** Controls dropdown menu visibility */
    const [isOpen, setIsOpen] = useState(false);
    /** Reference to the menu container for click-outside detection */
    const menuRef = useRef<HTMLDivElement>(null);

    /**
     * Set up click-outside event listener to close menu
     * @description Adds a global click listener to close the menu when
     * clicking outside the component. Cleans up the listener on unmount.
     */
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /**
     * Handles user logout
     * @description Initiates the logout process and handles any errors gracefully
     */
    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-3 text-left hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
            >
                {user.image ? (
                    <Image
                        width={32}
                        height={32}
                        src={user.image}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-sm">
                            {user.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                        {user.name}
                    </div>
                </div>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="py-2">
                        <a
                            href="/my-bookings"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>My Bookings</span>
                            </div>
                        </a>
                    </div>

                    <div className="border-t border-gray-100 pt-2">
                        <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span>Sign out</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}