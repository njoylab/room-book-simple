import { getApiUserFromRequest } from '@/lib/api-auth';
import { assertExternalApiEnabled } from '@/lib/external-api';
import { withErrorHandler } from '@/lib/error-handler';
import { NextRequest, NextResponse } from 'next/server';

async function handleGetCurrentApiUser(request: NextRequest) {
  assertExternalApiEnabled();
  const user = await getApiUserFromRequest(request);
  return NextResponse.json({ user });
}

export const GET = withErrorHandler(handleGetCurrentApiUser);
