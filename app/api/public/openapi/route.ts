import { assertExternalApiEnabled, getOpenApiSpecForOrigin } from '@/lib/external-api';
import { handleApiError } from '@/lib/error-handler';
import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  try {
    assertExternalApiEnabled();
    const spec = getOpenApiSpecForOrigin(request.nextUrl.origin);
    return NextResponse.json(spec);
  } catch (error) {
    return handleApiError(error);
  }
}
