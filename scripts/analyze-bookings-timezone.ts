/**
 * Script to analyze booking timestamps and identify potential timezone issues
 * Run with: npx tsx scripts/analyze-bookings-timezone.ts
 */

import { getBookings } from '../lib/airtable';
import { formatSlotTime } from '../utils/slots';

interface BookingAnalysis {
  id: string;
  roomName: string;
  startTime: string;
  endTime: string;
  startTimeUTC: string;
  endTimeUTC: string;
  hourOfDay: number;
  isBusinessHours: boolean;
  potentialIssue: boolean;
}

async function analyzeBookings() {
  console.log('🔍 Analyzing booking timestamps...\n');

  try {
    const bookings = await getBookings();

    if (!bookings || bookings.length === 0) {
      console.log('✅ No bookings found in database');
      return;
    }

    console.log(`📊 Found ${bookings.length} total bookings\n`);

    const analyses: BookingAnalysis[] = bookings.map(booking => {
      const startDate = new Date(booking.startTime);
      const hourOfDay = startDate.getUTCHours();

      // Business hours are typically 8:00-18:00 UTC
      const isBusinessHours = hourOfDay >= 8 && hourOfDay < 18;

      // Potential issue: booking outside typical business hours might indicate timezone problem
      const potentialIssue = hourOfDay < 6 || hourOfDay > 20;

      return {
        id: booking.id,
        roomName: booking.roomName || 'Unknown',
        startTime: booking.startTime,
        endTime: booking.endTime,
        startTimeUTC: formatSlotTime(booking.startTime),
        endTimeUTC: formatSlotTime(booking.endTime),
        hourOfDay,
        isBusinessHours,
        potentialIssue
      };
    });

    // Filter confirmed future bookings
    const now = new Date();
    const futureBookings = analyses.filter(a =>
      new Date(a.startTime) > now &&
      bookings.find(b => b.id === a.id)?.status !== 'Cancelled'
    );

    // Show bookings with potential issues
    const problematicBookings = futureBookings.filter(a => a.potentialIssue);

    if (problematicBookings.length > 0) {
      console.log('⚠️  POTENTIAL TIMEZONE ISSUES DETECTED:\n');
      console.log('These bookings are outside typical business hours (UTC):');
      console.log('─'.repeat(80));

      problematicBookings.forEach(booking => {
        console.log(`📅 ${booking.roomName}`);
        console.log(`   ID: ${booking.id}`);
        console.log(`   Time (UTC): ${booking.startTimeUTC} - ${booking.endTimeUTC}`);
        console.log(`   Hour of day: ${booking.hourOfDay}:00 UTC`);
        console.log(`   Raw timestamp: ${booking.startTime}`);
        console.log('');
      });

      console.log('\n💡 RECOMMENDATIONS:');
      console.log('   1. Check if these times look correct to you');
      console.log('   2. If they are off by 1-2 hours, they may have been created with the old timezone bug');
      console.log('   3. You may need to manually adjust these bookings in Airtable');
      console.log('   4. Future bookings will be created correctly with the fix\n');
    } else {
      console.log('✅ All future bookings appear to be in reasonable time ranges\n');
    }

    // Summary
    console.log('📈 SUMMARY:');
    console.log(`   Total bookings: ${bookings.length}`);
    console.log(`   Future bookings: ${futureBookings.length}`);
    console.log(`   Potential issues: ${problematicBookings.length}`);
    console.log(`   In business hours: ${futureBookings.filter(a => a.isBusinessHours).length}`);

    if (futureBookings.length > 0) {
      console.log('\n📋 All Future Bookings:');
      console.log('─'.repeat(80));
      futureBookings.forEach(booking => {
        const indicator = booking.potentialIssue ? '⚠️ ' : '✅';
        console.log(`${indicator} ${booking.startTimeUTC} - ${booking.endTimeUTC} | ${booking.roomName}`);
      });
    }

  } catch (error) {
    console.error('❌ Error analyzing bookings:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeBookings()
  .then(() => {
    console.log('\n✅ Analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
