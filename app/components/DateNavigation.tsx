/**
 * @fileoverview Date navigation component for room booking interface
 * @description Provides navigation controls for browsing different dates when
 * viewing room availability, with date picker integration and validation.
 */

'use client';

import { addDays, formatDate, formatDisplayDate } from '@/utils/date';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Props for the DateNavigation component
 * @interface DateNavigationProps
 */
interface DateNavigationProps {
    /** ID of the room being viewed */
    roomId: string;
    /** Currently selected date */
    selectedDate: Date;
}

/**
 * Date navigation component for browsing room availability across different dates
 * @param {DateNavigationProps} props - Component props
 * @returns {JSX.Element} Rendered date navigation component
 * @description Provides an intuitive date navigation interface featuring:
 * - Previous/next day navigation buttons
 * - Current date display with user-friendly formatting
 * - Date picker for jumping to specific dates
 * - Automatic validation to prevent navigation to past dates
 * - 30-day booking window limitation
 * - Responsive design for mobile and desktop
 * 
 * The component handles URL routing to update the booking interface
 * when users navigate to different dates.
 * @example
 * ```tsx
 * <DateNavigation
 *   roomId="rec123456789"
 *   selectedDate={new Date('2024-03-15')}
 * />
 * ```
 */
export function DateNavigation({ roomId, selectedDate }: DateNavigationProps) {
    const router = useRouter();
    /** Controls visibility of the date picker input */
    const [showDatePicker, setShowDatePicker] = useState(false);

    /** Calculate navigation dates */
    const previousDate = addDays(selectedDate, -1);
    const nextDate = addDays(selectedDate, 1);

    /** Calculate min/max dates (today + 30 days) */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = addDays(today, 30);

    /** Check if previous day is in the past */
    const isPreviousDatePast = formatDate(previousDate) < formatDate(today);

    /**
     * Handles date selection from the date picker
     * @param {React.ChangeEvent<HTMLInputElement>} event - Date input change event
     * @description Updates the URL to navigate to the selected date and closes the date picker
     */
    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = event.target.value;
        if (newDate) {
            router.push(`/book/${roomId}?date=${newDate}`);
        }
        setShowDatePicker(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
                {/* Previous Day Button */}
                {isPreviousDatePast ? (
                    <div className="flex items-center text-gray-400 cursor-not-allowed px-4 py-2 rounded-lg bg-gray-50">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="font-medium">Previous</span>
                    </div>
                ) : (
                    <Link
                        href={`/book/${roomId}?date=${formatDate(previousDate)}`}
                        className="flex items-center text-primary hover:text-primary-dark transition-all duration-200 px-4 py-2 rounded-lg hover:bg-primary/5 border border-primary/20 hover:border-primary/40"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="font-medium">Previous</span>
                    </Link>
                )}

                {/* Current Date Display */}
                <div className="relative">
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="text-xl font-bold text-gray-900 hover:text-primary transition-colors flex items-center px-6 py-3 rounded-lg hover:bg-gray-50 border border-gray-200 hover:border-primary/30"
                    >
                        <svg className="w-5 h-5 mr-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatDisplayDate(selectedDate)}</span>
                        <svg className="w-4 h-4 ml-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showDatePicker && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowDatePicker(false)}
                            />
                            {/* Date picker */}
                            <div className="absolute top-full mt-2 z-20 bg-white border border-gray-200 rounded-xl shadow-xl p-6 min-w-[280px]">
                                <div className="flex items-center mb-4">
                                    <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <label className="text-sm font-semibold text-gray-900">
                                        Select a date
                                    </label>
                                </div>
                                <input
                                    type="date"
                                    value={formatDate(selectedDate)}
                                    min={formatDate(today)}
                                    max={formatDate(maxDate)}
                                    onChange={handleDateChange}
                                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                                    autoFocus
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Next Day Button */}
                <Link
                    href={`/book/${roomId}?date=${formatDate(nextDate)}`}
                    className="flex items-center text-primary hover:text-primary-dark transition-all duration-200 px-4 py-2 rounded-lg hover:bg-primary/5 border border-primary/20 hover:border-primary/40"
                >
                    <span className="font-medium">Next</span>
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </div>
    );
} 