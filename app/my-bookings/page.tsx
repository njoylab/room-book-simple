/**
 * @fileoverview My Bookings page component
 * @description Displays user's future bookings with download functionality and cancellation
 */

import { getUserFutureBookings } from '@/lib/airtable';
import { getServerUser } from '@/lib/auth_server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MyBookingsClient } from './MyBookingsClient';

export default async function MyBookingsPage() {
    const cookieStore = await cookies();
    const user = await getServerUser(cookieStore);

    if (!user) {
        redirect('/');
    }

    const bookings = await getUserFutureBookings(user.id);

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
                        <p className="text-gray-600 mt-1">
                            {bookings.length} upcoming reservation{bookings.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {bookings.length > 0 && (
                        <a
                            href="/api/bookings/calendar"
                            download
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download All as iCal
                        </a>
                    )}
                </div>

                {bookings.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h8l4 4h20a2 2 0 012 2v12a2 2 0 01-2 2H10a2 2 0 01-2-2V7z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming bookings</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            You don&apos;t have any upcoming meeting room reservations.
                        </p>
                        <div className="mt-6">
                            <Link
                                href="/"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Book a Room
                            </Link>
                        </div>
                    </div>
                ) : (
                    <MyBookingsClient bookings={bookings} user={user} />
                )}
            </main>
        </div>
    );
}