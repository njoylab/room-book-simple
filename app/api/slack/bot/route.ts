/**
 * @fileoverview Slack bot API endpoint for handling slash commands
 * @description Handles Slack slash commands to show user bookings and room information
 */

import { getUserFutureBookings, updateBooking } from '@/lib/airtable';
import { env, isDevelopment } from '@/lib/env';
import { Booking, BOOKING_STATUS } from '@/lib/types';
import { formatSlotTime } from '@/utils/slots';
import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

interface SlackSlashCommand {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

interface SlackInteraction {
  type: string;
  user: {
    id: string;
    name: string;
  };
  response_url: string;
  actions: Array<{
    action_id: string;
    value: string;
    type: string;
  }>;
}

/**
 * Verifies the Slack request signature
 * @param body - Raw request body
 * @param timestamp - Request timestamp
 * @param signature - Slack signature header
 * @returns True if signature is valid
 */
function verifySlackSignature(body: string, timestamp: string, signature: string): boolean {
  const signingSecret = env.SLACK_SIGNING_SECRET;
  const baseString = `v0:${timestamp}:${body}`;
  const mySignature = 'v0=' + createHmac('sha256', signingSecret).update(baseString).digest('hex');

  const sigBuffer = Buffer.from(signature);
  const mySignatureBuffer = Buffer.from(mySignature);

  return sigBuffer.length === mySignatureBuffer.length &&
    timingSafeEqual(sigBuffer, mySignatureBuffer);
}

/**
 * Formats booking information for Slack message
 * @param bookings - Array of user bookings
 * @returns Formatted Slack message blocks
 */
function formatBookingsMessage(bookings: Booking[]) {
  if (bookings.length === 0) {
    return {
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '📅 *Your Upcoming Bookings*\n\nYou have no upcoming meeting room bookings.'
          }
        }
      ]
    };
  }

  const now = new Date();

  // Separate current and upcoming bookings
  const currentBookings = bookings.filter(booking => {
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    return startTime <= now && now <= endTime;
  });

  const upcomingBookings = bookings.filter(booking => {
    const startTime = new Date(booking.startTime);
    return startTime > now;
  });

  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '📅 *Your Upcoming Bookings*'
      }
    }
  ];

  // Add current bookings
  if (currentBookings.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*🔴 Currently Ongoing:*'
      }
    });

    currentBookings.forEach(booking => {
      const roomName = booking.roomName;
      const startTime = formatSlotTime(booking.startTime);
      const endTime = formatSlotTime(booking.endTime);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🏢 *${roomName}*\n⏰ ${startTime} - ${endTime}${booking.note ? `\n📝 ${booking.note}` : ''}`
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '❌ Cancel'
          },
          style: 'danger',
          action_id: 'cancel_booking',
          value: booking.id
        }
      });
    });
  }

  // Add upcoming bookings
  if (upcomingBookings.length > 0) {
    if (currentBookings.length > 0) {
      blocks.push({ type: 'divider' });
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*🟡 Coming Up:*'
      }
    });

    upcomingBookings.slice(0, 10).forEach(booking => {
      const roomName = booking.roomName;
      const startTime = formatSlotTime(booking.startTime);
      const endTime = formatSlotTime(booking.endTime);
      const date = new Date(booking.startTime).toDateString();

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🏢 *${roomName}*\n📅 ${date}\n⏰ ${startTime} - ${endTime}${booking.note ? `\n📝 ${booking.note}` : ''}`
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '❌ Cancel'
          },
          style: 'danger',
          action_id: 'cancel_booking',
          value: booking.id
        }
      });
    });

    if (upcomingBookings.length > 10) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_... and ${upcomingBookings.length - 10} more bookings_`
          }
        ]
      });
    }
  }

  // Add footer with link to web app
  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📱 <${env.APP_BASE_URL || 'http://localhost:3000'}|Manage your bookings in the web app>`
        }
      ]
    }
  );

  return {
    response_type: 'ephemeral',
    blocks
  };
}

/**
 * Handles Slack slash commands
 * @param request - The incoming HTTP request
 * @returns JSON response for Slack
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const timestamp = request.headers.get('x-slack-request-timestamp');
    const signature = request.headers.get('x-slack-signature');

    // Verify the request is from Slack
    if (!timestamp || !signature) {
      return NextResponse.json({ error: 'Missing Slack headers' }, { status: 400 });
    }

    // Check timestamp to prevent replay attacks (request should be within 5 minutes)
    const requestTime = parseInt(timestamp);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - requestTime) > 300) {
      return NextResponse.json({ error: 'Request timestamp too old' }, { status: 400 });
    }

    // Verify signature
    if (!verifySlackSignature(body, timestamp, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Check if this is an interaction (button click) or slash command
    if (body.startsWith('payload=')) {
      // This is an interaction (button click)
      const payloadData = decodeURIComponent(body.substring(8));
      const interaction: SlackInteraction = JSON.parse(payloadData);
      return await handleInteraction(interaction);
    } else {
      // This is a slash command
      const formData = new URLSearchParams(body);
      const slackCommand: SlackSlashCommand = {
        token: formData.get('token') || '',
        team_id: formData.get('team_id') || '',
        team_domain: formData.get('team_domain') || '',
        channel_id: formData.get('channel_id') || '',
        channel_name: formData.get('channel_name') || '',
        user_id: formData.get('user_id') || '',
        user_name: formData.get('user_name') || '',
        command: formData.get('command') || '',
        text: formData.get('text') || '',
        response_url: formData.get('response_url') || '',
        trigger_id: formData.get('trigger_id') || ''
      };

      // Handle different commands
      switch (slackCommand.command) {
        case '/my-bookings':
        case '/bookings':
          return await handleMyBookingsCommand(slackCommand);

        default:
          return NextResponse.json({
            response_type: 'ephemeral',
            text: `Unknown command: ${slackCommand.command}`
          });
      }
    }

  } catch (error) {
    console.error('Slack bot error:', error);
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Sorry, something went wrong. Please try again later.'
    }, { status: 500 });
  }
}

/**
 * Handles the /my-bookings slash command
 * @param command - Parsed Slack command data
 * @returns Formatted response with user's bookings
 */
async function handleMyBookingsCommand(command: SlackSlashCommand) {
  try {
    // Get user's bookings and all rooms
    const bookings = await getUserFutureBookings(command.user_id);

    // Format and return the response
    const response = formatBookingsMessage(bookings);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Sorry, I couldn\'t retrieve your bookings right now. Please try again later.'
    });
  }
}

/**
 * Handles Slack button interactions
 * @param interaction - Slack interaction data
 * @returns Formatted response
 */
async function handleInteraction(interaction: SlackInteraction) {
  try {
    const action = interaction.actions[0];

    if (action.action_id === 'cancel_booking') {
      const bookingId = action.value;
      const userId = interaction.user.id;

      try {
        // Log the cancellation attempt for debugging
        if (isDevelopment) {
          console.log(`User ${userId} attempting to cancel booking ${bookingId}`);
        }

        // Cancel the booking
        const cancelledBooking = await updateBooking(bookingId, { status: BOOKING_STATUS.CANCELLED }, userId);

        if (isDevelopment) {
          console.log(`Booking ${bookingId} successfully cancelled for user ${userId}`);
        }

        // Create updated message showing the booking as cancelled
        const cancelledText = `~~🏢 *${cancelledBooking.roomName || 'Meeting Room'}*~~\n❌ *CANCELLED*\n⏰ ${formatSlotTime(cancelledBooking.startTime)} - ${formatSlotTime(cancelledBooking.endTime)}${cancelledBooking.note ? `\n📝 ${cancelledBooking.note}` : ''}`;

        // Send confirmation as a new message that's more visible
        return NextResponse.json({
          response_type: 'in_channel', // Make it visible to the channel/user
          text: `✅ *Booking Cancelled Successfully!*\n\n~~🏢 *${cancelledBooking.roomName || 'Meeting Room'}*~~\n❌ *CANCELLED*\n⏰ ${formatSlotTime(cancelledBooking.startTime)} - ${formatSlotTime(cancelledBooking.endTime)}${cancelledBooking.note ? `\n📝 ${cancelledBooking.note}` : ''}\n\n_Cancelled at ${new Date().toLocaleTimeString()}_`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '✅ *Booking Cancelled Successfully!*'
              }
            },
            {
              type: 'divider'
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: cancelledText
              }
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `_Cancelled at ${new Date().toLocaleTimeString()}_`
                }
              ]
            }
          ]
        });

      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          return NextResponse.json({
            response_type: 'ephemeral',
            text: '❌ You can only cancel your own bookings.',
            replace_original: false
          });
        }

        console.error('Error cancelling booking:', error);
        return NextResponse.json({
          response_type: 'ephemeral',
          text: '❌ Failed to cancel booking. Please try again later.',
          replace_original: false
        });
      }
    }

    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Unknown action.'
    });

  } catch (error) {
    console.error('Error handling interaction:', error);
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Sorry, something went wrong. Please try again later.'
    });
  }
}

/**
 * Handles GET requests (for testing)
 * @returns Simple test response
 */
export async function GET() {
  return NextResponse.json({
    message: 'Slack bot endpoint is running',
    timestamp: new Date().toISOString()
  });
}