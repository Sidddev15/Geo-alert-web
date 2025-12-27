import type { EventPayload } from './types';
import { getEventToken } from './auth';

type ApiOk = { ok: true; emailed?: boolean; accepted?: boolean; reason?: string };
type ApiErr = { ok: false; error?: unknown };

export type ApiResponse = ApiOk | ApiErr;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

function mustEnv(name: string, value: string | undefined): string {
    if (!value) throw new Error(`Missing env: ${name}`);
    return value;
}

export async function postEvent(payload: EventPayload): Promise<{ status: number; data: ApiResponse; rawText: string }> {
    const url = mustEnv('VITE_BACKEND_URL', BACKEND_URL);
    const token = await getEventToken();

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const rawText = await res.text();

    // backend returns json, but we parse defensively (never assume)
    let data: ApiResponse;
    try {
        data = JSON.parse(rawText) as ApiResponse;
    } catch {
        data = { ok: false, error: rawText };
    }

    return { status: res.status, data, rawText };
}
