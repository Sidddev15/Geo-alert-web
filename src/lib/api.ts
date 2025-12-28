import type { EventPayload } from './types';
import { getEventToken } from './auth';
import { getEnv } from './env';

export async function postEvent(payload: EventPayload) {
    const BACKEND_ORIGIN = getEnv('VITE_BACKEND_ORIGIN');

    if (!BACKEND_ORIGIN) {
        throw new Error(
            'VITE_BACKEND_ORIGIN is missing. ' +
            'This must be set in Netlify AND the site redeployed.'
        );
    }

    const token = await getEventToken();

    const res = await fetch(`${BACKEND_ORIGIN}/v1/events`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const text = await res.text();

    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }

    return {
        status: res.status,
        data,
    };
}
