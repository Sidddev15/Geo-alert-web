import type { EventPayload } from './types';
import { getEventToken } from './auth';
import { mustEnv } from './env';

const BACKEND_ORIGIN = mustEnv('VITE_BACKEND_ORIGIN');

export async function postEvent(payload: EventPayload) {
    const token = await getEventToken();

    const res = await fetch(`${BACKEND_ORIGIN}/v1/events`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const rawText = await res.text();

    let data;
    try {
        data = JSON.parse(rawText);
    } catch {
        data = rawText;
    }

    return {
        status: res.status,
        data,
        rawText,
    };
}
