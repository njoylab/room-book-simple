import { assertExternalApiEnabled, getOpenApiSpecForOrigin } from '@/lib/external-api';
import { handleApiError } from '@/lib/error-handler';
import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  try {
    assertExternalApiEnabled();
    return NextResponse.json(getOpenApiSpecForOrigin(request.nextUrl.origin));
  } catch (error) {
    return handleApiError(error);
  }
}
