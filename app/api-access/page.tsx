import { getServerUser } from '@/lib/auth_server';
import { isExternalApiEnabled } from '@/lib/env';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ApiAccessPanel } from './ApiAccessPanel';

export default async function ApiAccessPage() {
  if (!isExternalApiEnabled) {
    notFound();
  }

  const cookieStore = await cookies();
  const user = await getServerUser(cookieStore);

  if (!user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">API Access</h1>
          <p className="text-gray-600 mt-1">
            Generate a bearer token for trusted local tools and inspect the external API contract.
          </p>
        </div>

        <div className="grid gap-6">
          <ApiAccessPanel />

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Available endpoints</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p><code>GET /api/public/me</code></p>
              <p><code>GET /api/public/rooms</code></p>
              <p><code>GET /api/public/rooms/:id/slots?date=YYYY-MM-DD</code></p>
              <p><code>POST /api/public/bookings</code></p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/api/public/openapi" className="text-blue-600 hover:text-blue-700">
                Open dynamic OpenAPI spec
              </Link>
              <Link href="/openapi-public.json" className="text-blue-600 hover:text-blue-700">
                Open JSON spec route
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
