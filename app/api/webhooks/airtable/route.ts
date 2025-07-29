/**
 * @fileoverview Airtable webhook endpoint for cache invalidation
 * @description Handles webhook notifications from Airtable to invalidate
 * Next.js cache when rooms or bookings are modified
 */

import { CACHE_TAGS } from '@/app/constants/cache';
import { getBookingById, getRoomBookings } from '@/lib/airtable';
import { revalidateCacheForBooking } from '@/lib/cache';
import { env } from '@/lib/env';
import { createHmac } from 'crypto';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

interface AirtableWebhookNotification {
  base: {
    id: string;
  };
  webhook: {
    id: string;
  };
  timestamp: string;
}

interface AirtableWebhookPayload {
  base: {
    id: string;
  };
  webhook: {
    id: string;
  };
  timestamp: string;
  actionMetadata?: {
    source: string;
  };
  changedTablesById: {
    [tableId: string]: {
      changedRecordsById: {
        [recordId: string]: {
          current?: {
            cellValuesByFieldId: Record<string, unknown>;
            createdTime: string;
          };
          previous?: {
            cellValuesByFieldId: Record<string, unknown>;
            createdTime?: string;
          } | null;
        };
      };
      destroyedRecordIds?: string[];
    };
  };
}

/**
 * Fetches webhook payloads from Airtable API
 */
async function fetchWebhookPayloads(baseId: string, webhookId: string): Promise<AirtableWebhookPayload[]> {
  const response = await fetch(`https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/payloads`, {
    headers: {
      'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch webhook payloads: ${response.status} ${error}`);
  }

  const result = await response.json();
  return result.payloads || [];
}


/**
 * Verifies the webhook signature from Airtable
 * @param payload - The raw request body
 * @param signature - The signature from headers
 * @returns boolean indicating if the signature is valid
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!env.AIRTABLE_WEBHOOK_SECRET) {
    console.warn('AIRTABLE_WEBHOOK_SECRET not configured, skipping signature verification');
    return true; // Allow in development if secret not configured
  }

  // Remove the "hmac-sha256=" prefix if present
  const cleanSignature = signature.replace('hmac-sha256=', '');

  // The webhook secret from Airtable is base64 encoded, decode it first
  const secretKey = Buffer.from(env.AIRTABLE_WEBHOOK_SECRET, 'base64');

  const expectedSignature = createHmac('sha256', secretKey)
    .update(payload, 'utf8')
    .digest('hex');

  console.log('Signature verification:');
  console.log('- Received signature (clean):', cleanSignature);
  console.log('- Expected signature:', expectedSignature);
  console.log('- Secret length (decoded):', secretKey.length);
  console.log('- Match:', cleanSignature === expectedSignature);

  return cleanSignature === expectedSignature;
}

/**
 * Invalidates cache for changed/updated records
 * @param tableId - The ID of the changed table
 * @param recordIds - Array of changed record IDs
 */
async function invalidateCacheForChangedRecords(tableId: string, recordIds: string[]) {
  const meetingRoomsTableId = env.AIRTABLE_MEETING_ROOMS_TABLE_ID;
  const bookingsTableId = env.AIRTABLE_BOOKINGS_TABLE_ID;

  if (tableId === meetingRoomsTableId) {
    console.log(`Invalidating room cache for changed records: ${recordIds.join(', ')}`);

    // Invalidate general room cache
    revalidateTag(CACHE_TAGS.MEETING_ROOMS);

    // Invalidate specific room caches
    recordIds.forEach(recordId => {
      revalidateTag(CACHE_TAGS.MEETING_ROOM_BY_ID.replace('{id}', recordId));
    });

  } else if (tableId === bookingsTableId) {
    console.log(`Invalidating booking cache for changed records: ${recordIds.join(', ')}`);

    // Invalidate general booking caches
    revalidateTag(CACHE_TAGS.BOOKINGS_ALL);
    revalidateTag(CACHE_TAGS.BOOKINGS_UPCOMING);

    // Invalidate specific booking caches
    recordIds.forEach(async recordId => {
      revalidateTag(CACHE_TAGS.BOOKING_BY_ID.replace('{id}', recordId));
      // get the booking data from airtable
      const booking = await getBookingById(recordId, false);
      revalidateCacheForBooking(booking || { id: recordId, user: '', room: '', startTime: '', userLabel: '', userEmail: '', endTime: '', roomName: '', roomLocation: '', status: '' });

    });
  }
}

/**
 * Invalidates cache for destroyed/deleted records
 * @param tableId - The ID of the table containing destroyed records
 * @param recordIds - Array of destroyed record IDs
 */
async function invalidateCacheForDestroyedRecords(tableId: string, recordIds: string[]) {
  const meetingRoomsTableId = env.AIRTABLE_MEETING_ROOMS_TABLE_ID;
  const bookingsTableId = env.AIRTABLE_BOOKINGS_TABLE_ID;

  if (tableId === meetingRoomsTableId) {
    console.log(`Invalidating room cache for destroyed records: ${recordIds.join(', ')}`);

    // Invalidate general room cache (removed rooms won't appear in listings)
    revalidateTag(CACHE_TAGS.MEETING_ROOMS);

    // Invalidate specific room caches (clean up stale individual room data)
    recordIds.forEach(async recordId => {
      revalidateTag(CACHE_TAGS.MEETING_ROOM_BY_ID.replace('{id}', recordId));

      const roomBookings = await getRoomBookings(recordId);
      roomBookings.forEach(booking => {
        revalidateCacheForBooking(booking);
      });
    });

  } else if (tableId === bookingsTableId) {
    console.log(`Invalidating booking cache for destroyed records: ${recordIds.join(', ')}`);

    // Invalidate general booking caches (removed bookings won't appear in listings)
    revalidateTag(CACHE_TAGS.BOOKINGS_ALL);
    revalidateTag(CACHE_TAGS.BOOKINGS_UPCOMING);


    // For destroyed bookings, we can't fetch the record data anymore
    // But we need to invalidate related caches broadly
    recordIds.forEach(async recordId => {
      // Invalidate specific booking cache
      // we rely on the cache
      const booking = await getBookingById(recordId);
      revalidateCacheForBooking(booking || { id: recordId, user: '', room: '', startTime: '', userLabel: '', userEmail: '', endTime: '', roomName: '', roomLocation: '', status: '' });

      // Since we can't get booking details, invalidate broader caches
      // This is less efficient but ensures consistency
      console.log(`Destroyed booking ${recordId}`);
    });

    // Invalidate all user-specific and room-specific booking caches
    // This is a broader invalidation since we can't determine specific user/room
    // Alternative: store this info in a separate tracking system if needed
    console.log('Destroyed bookings detected - consider broader cache invalidation if needed');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-airtable-content-mac') || '';

    if (env.NODE_ENV === 'development') {
      console.log('Webhook received:');
      console.log('- Headers:', Object.fromEntries(request.headers.entries()));
      console.log('- Signature header:', signature);
      console.log('- Body length:', body.length);
      console.log('- Webhook secret configured:', !!env.AIRTABLE_WEBHOOK_SECRET);
      console.log('- Body:', body);
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature');
      console.error('Expected signature calculation failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const notification: AirtableWebhookNotification = JSON.parse(body);

    if (env.NODE_ENV === 'development') {
      console.log('Webhook notification:');
      console.log('- Base ID:', notification.base?.id);
      console.log('- Webhook ID:', notification.webhook?.id);
      console.log('- Timestamp:', notification.timestamp);
    }

    // Verify the webhook is for our base
    if (notification.base?.id !== env.AIRTABLE_BASE_ID) {
      console.error(`Webhook for wrong base: ${notification.base?.id}, expected: ${env.AIRTABLE_BASE_ID}`);
      return NextResponse.json(
        { error: 'Invalid base' },
        { status: 400 }
      );
    }

    // Fetch the actual webhook payloads from Airtable API
    console.log('Fetching webhook payloads from Airtable API...');
    const allPayloads = await fetchWebhookPayloads(notification.base.id, notification.webhook.id);

    if (env.NODE_ENV === 'development') {
      console.log(`Found ${allPayloads.length} total payload(s)`);
    }

    // Process only the most recent payload (latest change)
    const latestPayload = allPayloads.length > 0 ? allPayloads[allPayloads.length - 1] : null;

    if (env.NODE_ENV === 'development') {
      console.log(`Processing latest payload only (${latestPayload ? latestPayload.timestamp : 'none found'})`);
    }

    if (!latestPayload) {
      console.log('No payloads to process');
      return NextResponse.json({
        success: true,
        message: 'No payloads to process',
        payloadsTotal: allPayloads.length,
        payloadsProcessed: 0
      });
    }

    // Process the latest payload
    if (latestPayload.changedTablesById && Object.keys(latestPayload.changedTablesById).length > 0) {
      // Process changes for each table
      for (const [tableId, changes] of Object.entries(latestPayload.changedTablesById)) {
        // Handle changed records (created/updated)
        const changedRecordIds = Object.keys(changes.changedRecordsById || {});

        // Handle destroyed records (deleted)
        const destroyedRecordIds = changes.destroyedRecordIds || [];

        if (env.NODE_ENV === 'development') {
          if (changedRecordIds.length > 0) {
            console.log(`Changed records in table ${tableId}: ${changedRecordIds.join(', ')}`);
          }
          if (destroyedRecordIds.length > 0) {
            console.log(`Destroyed records in table ${tableId}: ${destroyedRecordIds.join(', ')}`);
          }
        }

        // Process changed records
        if (changedRecordIds.length > 0) {
          await invalidateCacheForChangedRecords(tableId, changedRecordIds);
        }

        // Process destroyed records separately
        if (destroyedRecordIds.length > 0) {
          await invalidateCacheForDestroyedRecords(tableId, destroyedRecordIds);
        }
      }
    }

    console.log('Cache invalidation completed successfully');

    const tablesAffected = latestPayload.changedTablesById ? Object.keys(latestPayload.changedTablesById).length : 0;

    return NextResponse.json({
      success: true,
      message: 'Cache invalidated successfully',
      payloadsTotal: allPayloads.length,
      payloadsProcessed: 1,
      tablesAffected: tablesAffected,
      latestPayloadTimestamp: latestPayload.timestamp
    });

  } catch (error) {
    console.error('Error processing Airtable webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}