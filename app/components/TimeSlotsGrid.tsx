/**
 * @fileoverview Time slots grid component for displaying room availability
 * @description Provides an interactive grid view of time slots showing room
 * availability with click handlers for booking and viewing booking details.
 */

'use client';

import { MeetingRoom, User } from '@/lib/types';
import { formatSlotTime, TimeSlot } from '@/utils/slots';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BookingDetailModal } from './BookingDetailModal';
import { BookingModal } from './BookingModal';

/**
 * Props for the TimeSlotsGrid component
 * @interface TimeSlotsGridProps
 */
interface TimeSlotsGridProps {
    /** The meeting room to display slots for */
    room: MeetingRoom;
    /** Array of time slots with availability information */
    timeSlots: TimeSlot[];
    /** Currently authenticated user (null if not logged in) */
    user: User | null;
    /** Whether the room is unavailable for new bookings */
    isUnavailable?: boolean;
}

/**
 * Interactive grid component displaying time slots for a room
 * @param {TimeSlotsGridProps} props - Component props
 * @returns {JSX.Element} Rendered time slots grid component
 * @description Displays a grid of time slots with the following features:
 * - Visual indication of available, booked, and past slots
 * - Click handling for booking available slots (requires authentication)
 * - Click handling for viewing booking details on occupied slots
 * - Integration with booking and detail modals
 * - Automatic page refresh after successful bookings
 * - Responsive grid layout for different screen sizes
 * @example
 * ```tsx
 * <TimeSlotsGrid
 *   room={meetingRoom}
 *   timeSlots={availableSlots}
 *   user={currentUser}
 * />
 * ```
 */
export function TimeSlotsGrid({ room, timeSlots, user, isUnavailable = false }: TimeSlotsGridProps) {
    const router = useRouter();
    /** Currently selected slot for booking */
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    /** Whether the booking modal is open */
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    /** Selected booking for detail viewing */
    const [selectedBooking, setSelectedBooking] = useState<TimeSlot | null>(null);
    /** Whether the booking detail modal is open */
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    /** Login notification state */
    const [showLoginNotification, setShowLoginNotification] = useState(false);

    /**
     * Handles time slot click events
     * @param {TimeSlot} slot - The clicked time slot
     * @description Handles slot clicks by:
     * - Opening booking details for occupied slots
     * - Opening booking modal for available slots (if user is authenticated)
     * - Ignoring clicks on past slots or when user is not authenticated
     */
    const handleSlotClick = async (slot: TimeSlot) => {
        if (slot.isBooked && slot.booking) {
            // Show booking details for booked slots
            setSelectedBooking(slot);
            setIsDetailModalOpen(true);
        } else if (!slot.isBooked && !slot.isPast && !isUnavailable) {
            // Check if user is logged in and room is available for booking
            if (!user) {
                setShowLoginNotification(true);
                setTimeout(() => setShowLoginNotification(false), 4000);
                return;
            }

            setSelectedSlot(slot);
            setIsBookingModalOpen(true);
        }
    };

    /**
     * Handles successful booking completion
     * @description Closes the booking modal and refreshes the page to show
     * updated booking information after a successful booking.
     */
    const handleBookingSuccess = () => {
        setIsBookingModalOpen(false);
        setSelectedSlot(null);
        // Refresh the page to show updated bookings
        router.refresh();
    };

    /**
     * Handles booking modal closure
     * @description Closes the booking modal and clears the selected slot
     * without making any changes.
     */
    const handleBookingClose = () => {
        setIsBookingModalOpen(false);
        setSelectedSlot(null);
    };

    const handleDetailModalClose = () => {
        setIsDetailModalOpen(false);
        setSelectedBooking(null);
    };

    const handleBookingCancelled = () => {
        setIsDetailModalOpen(false);
        setSelectedBooking(null);
        // Refresh the page to show updated bookings
        router.refresh();
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {timeSlots.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No time slots available</h3>
                        <p className="text-gray-500">This room is not available on the selected day.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {timeSlots.map((slot, index) => {
                            const getSlotStyles = () => {
                                if (slot.isPast) {
                                    return 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed hover:border-gray-200 hover:bg-gray-50';
                                } else if (slot.isBooked) {
                                    return 'border-primary/30 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/10 cursor-pointer transform hover:scale-[1.02] hover:shadow-md';
                                } else {
                                    return 'border-green-200 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100 cursor-pointer transform hover:scale-[1.02] hover:shadow-md';
                                }
                            };

                            const getStatusText = () => {
                                if (slot.isPast) {
                                    return 'Past';
                                } else if (slot.isBooked) {
                                    if (slot.booking?.note) {
                                        return slot.booking?.note;
                                    }
                                    return `Booked by ${slot.booking?.userLabel}`;
                                } else {
                                    return 'Available';
                                }
                            };

                            const getStatusTextColor = () => {
                                if (slot.isPast) {
                                    return 'text-gray-500';
                                } else if (slot.isBooked) {
                                    return 'text-primary';
                                } else {
                                    return 'text-green-600';
                                }
                            };

                            const getStatusIcon = () => {
                                if (slot.isPast) {
                                    return (
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    );
                                } else if (slot.isBooked) {
                                    return (
                                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    );
                                } else {
                                    return (
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    );
                                }
                            };

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleSlotClick(slot)}
                                    disabled={slot.isPast || (isUnavailable && !slot.isBooked)}
                                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${getSlotStyles()}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-semibold text-sm">
                                            {formatSlotTime(slot.startTime)} - {formatSlotTime(slot.endTime)}
                                        </div>
                                        {getStatusIcon()}
                                    </div>
                                    <div className={`text-xs ${getStatusTextColor()}`}>
                                        {getStatusText()}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-center space-x-8 text-sm flex-wrap gap-y-3">
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-100 border-2 border-green-200 rounded mr-3 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <span className="text-gray-700 font-medium">Available</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-primary/10 border-2 border-primary/30 rounded mr-3 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <span className="text-gray-700 font-medium">Booked</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded mr-3 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-gray-700 font-medium">Past</span>
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            {selectedSlot && (
                <BookingModal
                    room={room}
                    isOpen={isBookingModalOpen}
                    onClose={handleBookingClose}
                    onSuccess={handleBookingSuccess}
                    initialDate={selectedSlot.startTime.split('T')[0]}
                    preselectedSlot={{
                        startTime: selectedSlot.startTime,
                        endTime: selectedSlot.endTime
                    }}
                />
            )}

            {/* Booking Detail Modal */}
            {selectedBooking && selectedBooking.booking && (
                <BookingDetailModal
                    booking={selectedBooking.booking}
                    isOpen={isDetailModalOpen}
                    onClose={handleDetailModalClose}
                    onCancelled={handleBookingCancelled}
                    user={user}
                />
            )}

            {/* Login notification */}
            {showLoginNotification && (
                <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">Please sign in with Slack to book this slot</span>
                    </div>
                </div>
            )}
        </>
    );
} 