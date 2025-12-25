let cachedToken: string | null = null;
let tokenExpiry = 0;

export async function getEventToken(): Promise<string> {
    const now = Date.now();

    if (cachedToken && now < tokenExpiry) {
        return cachedToken;
    }

    const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL.replace('/v1/events', '')}/auth/issue-token`,
        { method: 'GET' }
    );

    if (!res.ok) {
        throw new Error('Failed to obtain auth token');
    }

    const data: { token?: string; expiresInSec?: number } = await res.json();

    if (!data.token || typeof data.expiresInSec !== 'number') {
        throw new Error('Auth token response is invalid');
    }

    cachedToken = data.token;
    tokenExpiry = now + data.expiresInSec * 1000 - 5_000; // safety margin

    return data.token;
}
