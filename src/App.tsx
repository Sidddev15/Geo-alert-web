import { useMemo, useState } from 'react';
import './app.css';
import { getCurrentPositionAsync } from './lib/geo';
import { postEvent } from './lib/api';
import type { EventPayload, EventType } from './lib/types';

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export default function App() {
  const [mode, setMode] = useState<EventType>('manual'); // manual/night
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [debug, setDebug] = useState<{
    payload?: EventPayload;
    response?: unknown;
    httpStatus?: number;
    rawText?: string;
  }>({});
  const [notes, setNotes] = useState<string>(''); // optional for future use (not sent now)

  const backendUrl = useMemo(
    () => import.meta.env.VITE_BACKEND_URL as string | undefined,
    []
  );
  const hasEnv = Boolean(
    import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_API_KEY
  );

  async function send(eventType: EventType) {
    setStatus({ kind: 'working', message: 'Getting GPS location…' });
    setDebug({});

    try {
      if (!hasEnv)
        throw new Error(
          'Missing env variables. Set VITE_BACKEND_URL and VITE_API_KEY.'
        );

      const { lat, lng, accuracyM } = await getCurrentPositionAsync({
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 0,
      });

      // lock types: numbers only
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('Coordinates are not finite numbers (unexpected).');
      }

      const payload: EventPayload = { lat, lng, eventType };

      setStatus({
        kind: 'working',
        message: `Sending to backend… (±${Math.round(accuracyM)}m)`,
      });
      setDebug({ payload });

      const { status: httpStatus, data, rawText } = await postEvent(payload);
      setDebug((d) => ({ ...d, response: data, httpStatus, rawText }));

      if (httpStatus >= 200 && httpStatus < 300 && (data as any)?.ok === true) {
        const emailed = (data as any)?.emailed;
        const reason = (data as any)?.reason;

        setStatus({
          kind: 'success',
          message:
            emailed === false
              ? `Logged (email skipped): ${reason ?? 'rule'}`
              : 'Sent successfully ✅',
        });
        return;
      }

      // show backend error (401/400 etc)
      setStatus({
        kind: 'error',
        message: `Backend error (${httpStatus}). See debug panel.`,
      });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err?.message ?? 'Unknown error' });
    }
  }

  return (
    <div className="wrap">
      <header className="header">
        <div>
          <h1>Geo Alert</h1>
          <p className="sub">One-tap location + emergency alerts (web)</p>
        </div>
        <div className="badge">
          {backendUrl ? 'Connected' : 'No backend env'}
        </div>
      </header>

      <section className="card">
        <label className="label">Mode</label>
        <div className="row">
          <button
            className={mode === 'manual' ? 'btn btnOn' : 'btn'}
            onClick={() => setMode('manual')}
            type="button"
          >
            Manual
          </button>
          <button
            className={mode === 'night' ? 'btn btnOn' : 'btn'}
            onClick={() => setMode('night')}
            type="button"
          >
            Night
          </button>
        </div>

        <label className="label">Notes (not sent yet)</label>
        <input
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional – for future"
        />

        <div className="row" style={{ marginTop: 12 }}>
          <button
            className="btnPrimary"
            onClick={() => send(mode)}
            type="button"
          >
            Send Location
          </button>
          <button
            className="btnDanger"
            onClick={() => send('emergency')}
            type="button"
          >
            🚨 Emergency
          </button>
        </div>

        <div className={`status ${status.kind}`}>
          {status.kind === 'idle' ? 'Ready.' : status.message}
        </div>

        <details className="debug">
          <summary>Debug</summary>
          <pre>{JSON.stringify(debug, null, 2)}</pre>
        </details>
      </section>

      <footer className="footer">
        <div>Tips:</div>
        <ul>
          <li>First run will prompt for location permission.</li>
          <li>If “Precise Location” is off, accuracy may worsen.</li>
          <li>Use HTTPS only (required for geolocation).</li>
        </ul>
      </footer>
    </div>
  );
}
