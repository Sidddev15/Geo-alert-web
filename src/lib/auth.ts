/**
 * In-memory token cache (page lifetime)
 */
let cachedToken: string | null = null;
let tokenExpiryMs = 0;

/**
 * Read backend origin once
 */
function mustEnv(name: string, value: string | undefined): string {
    if (!value || value.trim() === '') {
        throw new Error(`Missing required env variable: ${name}`);
    }
    return value;
}

const BACKEND_ORIGIN = mustEnv(
    'VITE_BACKEND_ORIGIN',
    import.meta.env.VITE_BACKEND_ORIGIN
);

/**
 * GET /auth/issue-token
 */
export async function getEventToken(): Promise<string> {
    const now = Date.now();

    if (cachedToken && now < tokenExpiryMs) {
        return cachedToken;
    }

    const res = await fetch(`${BACKEND_ORIGIN}/auth/issue-token`, {
        method: 'GET',
        credentials: 'omit',
    });

    if (!res.ok) {
        throw new Error(`Failed to obtain auth token (${res.status})`);
    }

    const data: {
        token?: string;
        expiresInSec?: number;
    } = await res.json();

    if (!data.token || typeof data.expiresInSec !== 'number') {
        throw new Error('Invalid auth token response from backend');
    }

    cachedToken = data.token;
    tokenExpiryMs = now + data.expiresInSec * 1000 - 5_000; // 5s safety buffer

    return cachedToken;
}
