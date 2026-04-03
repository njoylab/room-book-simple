import { createApiAccessToken } from '@/lib/api-auth';
import { assertExternalApiEnabled } from '@/lib/external-api';
import { getServerUser } from '@/lib/auth_server';
import { createError, withErrorHandler } from '@/lib/error-handler';
import { NextRequest, NextResponse } from 'next/server';

async function handleCreateApiToken(request: NextRequest) {
  assertExternalApiEnabled();
  const user = await getServerUser(request.cookies);

  if (!user) {
    throw createError.authentication();
  }

  const tokenData = await createApiAccessToken(user);

  return NextResponse.json(tokenData, { status: 201 });
}

export const POST = withErrorHandler(handleCreateApiToken);
