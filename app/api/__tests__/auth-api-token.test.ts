import { NextRequest } from 'next/server';
import { POST } from '../auth/api-token/route';

jest.mock('@/lib/api-auth', () => ({
  createApiAccessToken: jest.fn(),
}));

jest.mock('@/lib/auth_server', () => ({
  getServerUser: jest.fn(),
}));

import { createApiAccessToken } from '@/lib/api-auth';
import { getServerUser } from '@/lib/auth_server';

describe('/api/auth/api-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a bearer token for an authenticated user', async () => {
    const user = {
      id: 'user123',
      name: 'John Doe',
      email: 'john@example.com',
      image: 'https://example.com/avatar.jpg',
      team: 'Engineering',
    };

    (getServerUser as jest.Mock).mockResolvedValue(user);
    (createApiAccessToken as jest.Mock).mockResolvedValue({
      token: 'signed-token',
      expiresInHours: 720,
    });

    const request = new NextRequest('http://localhost:3000/api/auth/api-token', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({
      token: 'signed-token',
      expiresInHours: 720,
    });
  });

  it('returns 401 when the user is not authenticated', async () => {
    (getServerUser as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/api-token', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty('type', 'AUTHENTICATION_ERROR');
  });
});
