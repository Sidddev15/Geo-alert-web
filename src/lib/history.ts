import { getEventToken } from './auth';
import type { EventType } from './types';

export type HistoryEvent = {
    id: string;
    createdAtIso: string;
    lat: number;
    lng: number;
    eventType: EventType | string;
    battery: number | null;
    notes: string | null;
};

export type HistoryResponse = {
    ok: true;
    events: HistoryEvent[];
    nextBefore: string | null;
};

function baseUrl(): string {
    const eventsUrl = import.meta.env.VITE_BACKEND_URL as string;
    // eventsUrl ends with /v1/events → base = remove that
    return eventsUrl.replace('/v1/events', '');
}

export async function fetchHistory(opts: { limit?: number; before?: string }) {
    const token = await getEventToken();

    const url = new URL(`${baseUrl()}/v1/history`);
    url.searchParams.set('limit', String(opts.limit ?? 50));
    if (opts.before) url.searchParams.set('before', opts.before);

    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const text = await res.text();
    if (!res.ok) {
        throw new Error(`History fetch failed (${res.status}): ${text}`);
    }

    return JSON.parse(text) as HistoryResponse;
}
