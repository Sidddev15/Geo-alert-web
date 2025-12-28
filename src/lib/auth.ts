import { mustEnv } from './env';

let cachedToken: string | null = null;
let tokenExpiryMs = 0;

const BACKEND_ORIGIN = mustEnv('VITE_BACKEND_ORIGIN');

export async function getEventToken(): Promise<string> {
    const now = Date.now();

    if (cachedToken && now < tokenExpiryMs) return cachedToken;

    const res = await fetch(`${BACKEND_ORIGIN}/auth/issue-token`, { method: 'GET' });

    if (!res.ok) {
        throw new Error(`Failed to obtain auth token (${res.status})`);
    }

    const data: { token?: string; expiresInSec?: number } = await res.json();

    if (!data.token || typeof data.expiresInSec !== 'number') {
        throw new Error('Auth token response invalid');
    }

    cachedToken = data.token;
    tokenExpiryMs = now + data.expiresInSec * 1000 - 5_000;

    return cachedToken;
}
