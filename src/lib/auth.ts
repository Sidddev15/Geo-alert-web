import { getEnv } from './env';

let cachedToken: string | null = null;
let tokenExpiryMs = 0;

export async function getEventToken(): Promise<string> {
    const BACKEND_ORIGIN = getEnv('VITE_BACKEND_ORIGIN');

    if (!BACKEND_ORIGIN) {
        throw new Error(
            'VITE_BACKEND_ORIGIN is missing. ' +
            'Check Netlify env vars and REDEPLOY.'
        );
    }

    const now = Date.now();
    if (cachedToken && now < tokenExpiryMs) return cachedToken;

    const res = await fetch(`${BACKEND_ORIGIN}/auth/issue-token`);

    if (!res.ok) {
        throw new Error(`Token request failed (${res.status})`);
    }

    const data = await res.json() as {
        token?: string;
        expiresInSec?: number;
    };

    if (!data.token || typeof data.expiresInSec !== 'number') {
        throw new Error('Invalid token response');
    }

    cachedToken = data.token;
    tokenExpiryMs = now + data.expiresInSec * 1000 - 5_000;

    return cachedToken;
}
