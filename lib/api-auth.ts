import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { env } from './env';
import { createError } from './error-handler';
import { User } from './types';

const API_TOKEN_AUDIENCE = 'b4irooms-external-api';
const API_TOKEN_ISSUER = 'b4irooms';
const API_TOKEN_TYPE = 'api-access';

function getApiTokenSecret(): Uint8Array {
  if (!env.API_TOKEN_SECRET) {
    throw createError.internal('External API tokens are not configured');
  }

  return new TextEncoder().encode(env.API_TOKEN_SECRET);
}

export async function createApiAccessToken(user: User) {
  const secret = getApiTokenSecret();
  const expiresInHours = env.API_TOKEN_DURATION_HOURS;

  const token = await new SignJWT({
    type: API_TOKEN_TYPE,
    user,
    scope: ['rooms:read', 'slots:read', 'bookings:write']
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(API_TOKEN_ISSUER)
    .setAudience(API_TOKEN_AUDIENCE)
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${expiresInHours}h`)
    .sign(secret);

  return {
    token,
    expiresInHours,
  };
}

export async function getApiUserFromRequest(request: NextRequest): Promise<User> {
  const authorization = request.headers.get('authorization');

  if (!authorization) {
    throw createError.authentication('Bearer token required');
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw createError.authentication('Invalid authorization header');
  }

  try {
    const secret = getApiTokenSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: API_TOKEN_ISSUER,
      audience: API_TOKEN_AUDIENCE,
    });

    if (payload.type !== API_TOKEN_TYPE || !payload.user) {
      throw createError.authentication('Invalid API token');
    }

    return payload.user as User;
  } catch (error) {
    if (error instanceof Error && error.name === 'AppError') {
      throw error;
    }

    throw createError.authentication('Invalid or expired bearer token');
  }
}
