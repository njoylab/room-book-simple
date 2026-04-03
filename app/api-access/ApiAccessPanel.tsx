'use client';

import { useState } from 'react';

interface TokenResponse {
  token: string;
  expiresInHours: number;
}

export function ApiAccessPanel() {
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateToken = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch('/api/auth/api-token', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate token');
      }

      setTokenData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!tokenData) return;

    await navigator.clipboard.writeText(tokenData.token);
    setCopied(true);
  };

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bearer token</h2>
          <p className="text-sm text-gray-600 mt-1">
            The token is bound to your account. Treat it like a password.
          </p>
        </div>
        <button
          onClick={handleGenerateToken}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate token'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {tokenData && (
        <div className="mt-4 space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
            This token may not be shown again. Copy it now.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Token</label>
            <textarea
              readOnly
              value={tokenData.token}
              className="w-full h-36 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-black transition-colors"
            >
              {copied ? 'Copied' : 'Copy token'}
            </button>
            <span className="text-sm text-gray-600">
              Expires in {tokenData.expiresInHours} hours
            </span>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-800 mb-2">Example</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all">{`curl -H "Authorization: Bearer ${tokenData.token}" \\
  ${window.location.origin}/api/public/rooms`}</pre>
          </div>
        </div>
      )}
    </section>
  );
}
