import { getApiUserFromRequest } from '@/lib/api-auth';
import { getMeetingRooms } from '@/lib/airtable';
import { assertExternalApiEnabled } from '@/lib/external-api';
import { createError, withErrorHandler } from '@/lib/error-handler';
import { NextRequest, NextResponse } from 'next/server';

async function handleGetPublicRooms(request: NextRequest) {
  assertExternalApiEnabled();
  await getApiUserFromRequest(request);

  const rooms = await getMeetingRooms();
  if (!rooms) {
    throw createError.internal('Failed to fetch rooms from database');
  }

  return NextResponse.json(rooms);
}

export const GET = withErrorHandler(handleGetPublicRooms);
