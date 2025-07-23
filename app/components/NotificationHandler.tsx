/**
 * @fileoverview Notification handler component for displaying system messages
 * @description Provides a notification system for displaying success and error
 * messages based on URL search parameters, with automatic dismissal and cleanup.
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Notification handler component for system-wide messaging
 * @returns {JSX.Element | null} Rendered notification component or null if no notification
 * @description Displays notification messages based on URL search parameters,
 * providing user feedback for various actions throughout the application.
 * 
 * Features:
 * - Automatic detection of success/error parameters in URL
 * - Visual differentiation between success and error messages
 * - Auto-dismissal after 5 seconds
 * - Manual dismissal via close button
 * - URL cleanup after notification display
 * - Fixed positioning for consistent visibility
 * - Responsive design with proper z-index stacking
 * 
 * Supported URL parameters:
 * - `?success=booking_created` - Shows booking success message
 * - `?error=login_required` - Shows login required error
 * 
 * @example
 * ```tsx
 * // Used in layout components
 * <NotificationHandler />
 * 
 * // Redirect with notification
 * router.push('/rooms?success=booking_created');
 * ```
 */
export function NotificationHandler() {
  /** Current search parameters from the URL */
  const searchParams = useSearchParams();
  /** Current notification state with type and message */
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  /**
   * Monitor URL parameters for notification triggers
   * @description Watches for changes in URL search parameters and displays
   * appropriate notifications based on the parameter values. Also sets up
   * auto-dismissal timers and URL cleanup.
   */
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success === 'booking_created') {
      setNotification({type: 'success', message: 'Prenotazione creata con successo!'});
    } else if (error === 'login_required') {
      setNotification({type: 'error', message: 'Effettua il login per prenotare una sala'});
    }
    
    // Clear notification after 5 seconds
    if (success || error) {
      const timer = setTimeout(() => {
        setNotification(null);
        // Clear URL parameters
        window.history.replaceState({}, '', window.location.pathname);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!notification) return null;

  return (
    <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
      notification.type === 'success' 
        ? 'bg-green-50 border border-green-200 text-green-800' 
        : 'bg-red-50 border border-red-200 text-red-800'
    }`}>
      <div className="flex items-center">
        <span className="mr-2">
          {notification.type === 'success' ? '✅' : '❌'}
        </span>
        {notification.message}
        <button
          onClick={() => setNotification(null)}
          className="ml-4 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
}