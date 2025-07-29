import { loggedIn } from '@/lib/auth_server';
import { env, getBaseUrl } from '@/lib/env';
import { createError, withErrorHandler } from '@/lib/error-handler';
import { NextRequest, NextResponse } from 'next/server';


const SCOPES = ['identity.basic', 'identity.email', 'identity.avatar'];

/**
 * Handles Slack OAuth authentication flow
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} Redirect response to Slack OAuth or home page
 * @description Manages the complete Slack OAuth flow including authorization redirect,
 * token exchange, user data retrieval, and session creation. Redirects to Slack for
 * authorization if no code is present, or completes authentication and redirects home
 * if a valid authorization code is received.
 */
async function handleSlackAuth(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    throw createError.authentication('OAuth access denied');
  }

  if (!code) {
    const redirectUri = `${getBaseUrl()}/api/auth/slack`;

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&user_scope=${SCOPES.join(',')}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return NextResponse.redirect(authUrl);
  }

  const redirectUri = `${getBaseUrl()}/api/auth/slack`;

  const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.ok) {
    throw createError.authentication('OAuth token exchange failed');
  }

  const userResponse = await fetch('https://slack.com/api/users.identity', {
    headers: {
      'Authorization': `Bearer ${tokenData.authed_user.access_token}`,
    },
  });

  const userData = await userResponse.json();

  if (!userData.ok) {
    throw createError.authentication('Failed to fetch user data from Slack');
  }

  const response = NextResponse.redirect(new URL('/', request.url));

  await loggedIn(response.cookies, {
    id: userData.user.id,
    name: userData.user.name,
    email: userData.user.email,
    image: userData.user.image_192,
    team: userData.team.name,
  });

  return response;
}

export const GET = withErrorHandler(handleSlackAuth);