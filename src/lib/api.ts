import type { EventPayload } from './types';
import { getEventToken } from './auth';
import { mustEnv } from './env';

type ApiOk = { ok: true; emailed?: boolean; accepted?: boolean; reason?: string };
type ApiErr = { ok: false; error?: unknown };
export type ApiResponse = ApiOk | ApiErr;

const BACKEND_ORIGIN = mustEnv('VITE_BACKEND_ORIGIN');

export async function postEvent(payload: EventPayload): Promise<{ status: number; data: ApiResponse; rawText: string }> {
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

    let data: ApiResponse;
    try {
        data = JSON.parse(rawText) as ApiResponse;
    } catch {
        data = { ok: false, error: rawText };
    }

    return { status: res.status, data, rawText };
}
