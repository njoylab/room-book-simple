/**
 * @fileoverview Modal component for creating new room bookings
 * @description Provides a comprehensive booking interface with date selection,
 * time slot selection, and form submission for creating room reservations.
 */

'use client';

import { MeetingRoom } from '@/lib/types';
import { formatTime } from '@/utils/date';
import { formatSlotTime } from '@/utils/slots';
import { useEffect, useState } from 'react';

/**
 * Represents a time slot in the booking modal
 * @interface TimeSlot
 * @description Local interface for time slots with booking-specific properties
 */
interface TimeSlot {
  /** ISO 8601 timestamp when the slot starts */
  startTime: string;
  /** ISO 8601 timestamp when the slot ends */
  endTime: string;
  /** Display label for the time slot */
  label: string;
  /** Whether the slot is available for booking */
  available: boolean;
  /** Whether the slot is already occupied */
  occupied: boolean;
  /** Whether the slot is in the past */
  past: boolean;
}

/**
 * Props for the BookingModal component
 * @interface BookingModalProps
 */
interface BookingModalProps {
  /** The meeting room to book */
  room: MeetingRoom;
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Initial date to display (YYYY-MM-DD format) */
  initialDate: string;
  /** Callback function to close the modal */
  onClose: () => void;
  /** Callback function called when booking is successful */
  onSuccess: () => void;
  /** Optional preselected time slot */
  preselectedSlot?: {
    /** Start time of the preselected slot */
    startTime: string;
    /** End time of the preselected slot */
    endTime: string;
  };
}

/**
 * Modal component for creating room bookings
 * @param {BookingModalProps} props - Component props
 * @returns {JSX.Element} Rendered booking modal component
 * @description Provides a comprehensive booking interface featuring:
 * - Date selection within allowed range (today to 30 days ahead)
 * - Dynamic time slot loading based on selected date
 * - Multi-slot selection for extended bookings
 * - Preselected slot support for quick booking
 * - Form validation and error handling
 * - Real-time availability checking
 * - Note/description input for bookings
 * @example
 * ```tsx
 * <BookingModal
 *   room={selectedRoom}
 *   isOpen={showModal}
 *   initialDate="2024-03-15"
 *   onClose={() => setShowModal(false)}
 *   onSuccess={handleBookingSuccess}
 *   preselectedSlot={{
 *     startTime: "2024-03-15T14:00:00.000Z",
 *     endTime: "2024-03-15T14:30:00.000Z"
 *   }}
 * />
 * ```
 */
export function BookingModal({ room, isOpen, initialDate, onClose, onSuccess, preselectedSlot }: BookingModalProps) {

  /** Currently selected date for booking */
  const [selectedDate, setSelectedDate] = useState(initialDate);
  /** Array of available time slots for the selected date */
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  /** Array of selected slot indices for multi-slot booking */
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  /** Optional note/description for the booking */
  const [note, setNote] = useState('');
  /** Whether the booking submission is in progress */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Whether time slots are currently being loaded */
  const [loadingSlots, setLoadingSlots] = useState(false);
  /** Current error message, if any */
  const [error, setError] = useState('');
  /** Whether a preselected slot has been applied */
  const [hasPreselected, setHasPreselected] = useState(false);

  /** Current date for minimum date validation */
  const today = new Date();
  /** Today's date in YYYY-MM-DD format */
  const todayString = today.toISOString().slice(0, 10);
  /** Minimum allowed booking date (today) */
  const minDate = todayString;
  /** Maximum allowed booking date (30 days from today) */
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  /**
   * Reset form state when modal opens
   * @description Resets all form fields and state when the modal is opened,
   * handling preselected slots by setting the appropriate date.
   */
  useEffect(() => {
    if (isOpen) {
      if (preselectedSlot) {
        // If we have a preselected slot, set the date from the slot
        const slotDate = new Date(preselectedSlot.startTime).toISOString().slice(0, 10);
        setSelectedDate(slotDate);
      } else {
        const currentDate = new Date().toISOString().slice(0, 10);
        setSelectedDate(currentDate);
      }
      setSelectedSlots([]);
      setNote('');
      setError('');
      setHasPreselected(false);
    }
  }, [isOpen, preselectedSlot]);

  /**
   * Fetch available time slots when date changes
   * @description Loads time slots from the API when the selected date changes,
   * with proper error handling and loading states. Also clears selected slots.
   */
  useEffect(() => {
    if (selectedDate && room.id) {
      const fetchSlots = async () => {
        setLoadingSlots(true);
        setError('');
        setSelectedSlots([]); // Clear selected slots when date changes

        try {
          const response = await fetch(`/api/rooms/${room.id}/slots?date=${selectedDate}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch slots');
          }

          setSlots(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load time slots');
        } finally {
          setLoadingSlots(false);
        }
      };
      fetchSlots();
    }
  }, [selectedDate, room.id]);

  /**
   * Auto-select preselected slot after slots are loaded
   * @description Automatically selects the preselected slot once time slots
   * are loaded from the API, if the slot is available.
   */
  useEffect(() => {
    if (preselectedSlot && slots.length > 0 && selectedSlots.length === 0 && !hasPreselected) {
      const slotIndex = slots.findIndex(slot =>
        slot.startTime === preselectedSlot.startTime &&
        slot.endTime === preselectedSlot.endTime
      );
      if (slotIndex !== -1 && slots[slotIndex].available) {
        setSelectedSlots([slotIndex]);
        setHasPreselected(true);
      }
    }
  }, [preselectedSlot, slots, selectedSlots.length, hasPreselected]);

  const isSlotSelectable = (slotIndex: number) => {
    const slot = slots[slotIndex];
    if (!slot.available) return false;
    if (selectedSlots.includes(slotIndex)) return true;
    
    // If no slots selected, any available slot is selectable
    if (selectedSlots.length === 0) return true;

    // Check if this slot is adjacent to any selected slot
    const sortedSelected = [...selectedSlots].sort((a, b) => a - b);
    const minSelected = sortedSelected[0];
    const maxSelected = sortedSelected[sortedSelected.length - 1];

    // Slot is selectable if it's adjacent to the current selection range
    const isAdjacent = slotIndex === minSelected - 1 || slotIndex === maxSelected + 1;
    
    if (!isAdjacent) return false;
    
    // If adjacent, check if adding this slot would exceed the maximum duration
    const newSelection = [...selectedSlots, slotIndex].sort((a, b) => a - b);
    const totalMinutes = newSelection.length * 30; // Each slot is 30 minutes
    const maxHours = room.maxMeetingHours ?? 8; // Default to 8 hours if not set
    const maxMinutes = maxHours * 60;
    
    return totalMinutes <= maxMinutes;
  };

  const handleSlotToggle = (slotIndex: number) => {
    const slot = slots[slotIndex];
    if (!slot.available) return;

    setSelectedSlots(prev => {
      const existingIndex = prev.indexOf(slotIndex);

      if (existingIndex >= 0) {
        // Remove slot - only allow removing from edges
        const sortedSelected = [...prev].sort((a, b) => a - b);
        const minSelected = sortedSelected[0];
        const maxSelected = sortedSelected[sortedSelected.length - 1];

        // Only allow removing if it's at the edge of the selection
        if (slotIndex === minSelected || slotIndex === maxSelected) {
          return prev.filter(index => index !== slotIndex);
        }
        return prev; // Don't remove if not at edge
      } else {
        // Add slot only if it's selectable (adjacent and within max duration)
        if (isSlotSelectable(slotIndex)) {
          return [...prev, slotIndex].sort((a, b) => a - b);
        }
        return prev; // Don't add if not selectable
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSlots.length === 0) {
      setError('Select at least one time slot');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Get start and end times from selected slots
      const sortedSlots = selectedSlots.sort((a, b) => a - b);
      const startTime = slots[sortedSlots[0]].startTime;
      const endTime = slots[sortedSlots[sortedSlots.length - 1]].endTime;

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: room.id,
          startTime: startTime,
          endTime: endTime,
          note: note.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      onSuccess();
      onClose();
      setSelectedSlots([]);
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getSlotButtonClass = (slot: TimeSlot, index: number) => {
    const isSelected = selectedSlots.includes(index);
    const selectable = isSlotSelectable(index);

    if (slot.past) {
      return 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200';
    }

    if (slot.occupied) {
      return 'bg-red-50 text-red-600 cursor-not-allowed border-red-200';
    }

    if (isSelected) {
      return 'bg-primary text-white hover:bg-primary-dark border-primary shadow-md transform scale-105';
    }

    if (selectable) {
      return 'bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer border-green-200 hover:border-green-300 hover:shadow-sm';
    }

    // Available but not selectable (not adjacent)
    return 'bg-green-25 text-green-400 cursor-not-allowed opacity-50 border-green-100';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-purple-600 px-6 py-5 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Book {room.name}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200 p-2 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Date Selection */}
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="date"
                  id="selectedDate"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={minDate}
                  max={maxDate}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                />
              </div>

            </div>

            {/* Time Slots Selection */}
            {selectedDate && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <label className="text-sm font-semibold text-gray-900">
                      Select Time Slots (30-minute intervals)
                    </label>
                  </div>
                  {(room.startTime || room.endTime) && (
                    <div className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border">
                      {formatTime(room.startTime)} - {formatTime(room.endTime)}
                    </div>
                  )}
                  {room.maxMeetingHours && (
                    <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                      Max {room.maxMeetingHours} {room.maxMeetingHours === 1 ? 'hour' : 'hours'} per booking
                    </div>
                  )}
                </div>

                {loadingSlots ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm text-gray-500">Loading available time slots...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {slots.map((slot, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSlotToggle(index)}
                          disabled={!slot.available || !isSlotSelectable(index)}
                          className={`p-3 text-xs font-medium rounded-lg border-2 transition-all duration-200 ${getSlotButtonClass(slot, index)}`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-6 text-xs flex-wrap gap-y-2">
                        <span className="flex items-center">
                          <div className="w-3 h-3 bg-green-50 border border-green-200 rounded mr-2"></div>
                          Selectable
                        </span>
                        <span className="flex items-center">
                          <div className="w-3 h-3 bg-green-25 border border-green-100 rounded mr-2 opacity-50"></div>
                          Available
                        </span>
                        <span className="flex items-center">
                          <div className="w-3 h-3 bg-red-50 border border-red-200 rounded mr-2"></div>
                          Occupied
                        </span>
                        <span className="flex items-center">
                          <div className="w-3 h-3 bg-primary rounded mr-2"></div>
                          Selected
                        </span>
                      </div>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        You can only select consecutive time slots
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Selected Time Summary */}
            {selectedSlots.length > 0 && (
              <div className="p-4 bg-primary/10 rounded-xl border border-primary/30">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary">
                      {slots[selectedSlots[0]]?.label} - {formatSlotTime(slots[selectedSlots[selectedSlots.length - 1]].endTime)}
                    </p>
                    <p className="text-xs text-primary/70 mt-1">
                      Duration: {selectedSlots.length * 30} minutes ({selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''})
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Note/Title Input */}
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={1}
                maxLength={200}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 resize-none"
                placeholder="Add a title or description for your booking (optional)"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-red-800 mb-1">Booking Error</h4>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 border border-gray-200 hover:border-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedSlots.length === 0}
                className="px-6 py-3 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Booking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Create Booking
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}