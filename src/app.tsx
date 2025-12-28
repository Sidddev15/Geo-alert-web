import { useMemo, useState } from 'react';
import './index.css';
import { getCurrentPositionAsync } from './lib/geo';
import { postEvent } from './lib/api';
import type { EventPayload, EventType } from './lib/types';
import { fetchHistory } from './lib/history';

/* -------------------- TYPES -------------------- */

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

type LastSuccess = {
  ts: number;
  eventType: EventType;
  lat: number;
  lng: number;
};

/* -------------------- LOCAL STORAGE -------------------- */

const LS_KEY = 'geo-alert:last-success';

function loadLastSuccess(): LastSuccess | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LastSuccess) : null;
  } catch {
    return null;
  }
}

function saveLastSuccess(v: LastSuccess) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(v));
  } catch {}
}

/* -------------------- COMPONENT -------------------- */

export default function App() {
  const [mode, setMode] = useState<EventType>('manual');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const [debug, setDebug] = useState<{
    payload?: EventPayload;
    response?: unknown;
    httpStatus?: number;
    rawText?: string;
  }>({});

  const [notes, setNotes] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [confirmEmergency, setConfirmEmergency] = useState(false);

  const [lastSuccess, setLastSuccess] = useState<LastSuccess | null>(() =>
    loadLastSuccess()
  );

  const [history, setHistory] = useState<any[]>([]);
  const [historyBefore, setHistoryBefore] = useState<string | null>(null);
  const [historyStatus, setHistoryStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle');
  const [historyError, setHistoryError] = useState<string>('');

  const backendUrl = useMemo(
    () => import.meta.env.VITE_BACKEND_URL as string | undefined,
    []
  );

  const hasEnv = Boolean(
    import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_API_KEY
  );

  /* -------------------- SEND LOGIC -------------------- */

  async function send(eventType: EventType) {
    if (isSending) return;

    setIsSending(true);
    setStatus({ kind: 'working', message: 'Getting GPS location…' });
    setDebug({});

    try {
      if (!hasEnv) throw new Error('Missing env variables.');

      const { lat, lng, accuracyM } = await getCurrentPositionAsync({
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 0,
      });

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('Coordinates are not finite numbers.');
      }

      const payload: EventPayload = { lat, lng, eventType };
      setDebug({ payload });

      setStatus({
        kind: 'working',
        message: `Sending to backend… (±${Math.round(accuracyM)}m)`,
      });

      const { status: httpStatus, data, rawText } = await postEvent(payload);
      setDebug((d) => ({ ...d, response: data, httpStatus, rawText }));

      if (httpStatus >= 200 && httpStatus < 300 && (data as any)?.ok === true) {
        const emailed = (data as any)?.emailed;
        const reason = (data as any)?.reason;

        const success: LastSuccess = {
          ts: Date.now(),
          eventType,
          lat,
          lng,
        };

        saveLastSuccess(success);
        setLastSuccess(success);

        setStatus({
          kind: 'success',
          message:
            emailed === false
              ? `Logged (email skipped): ${reason ?? 'rule'}`
              : 'Sent successfully ✅',
        });

        setConfirmEmergency(false);
        return;
      }

      setStatus({
        kind: 'error',
        message: `Backend error (${httpStatus}).`,
      });
    } catch (err: any) {
      setStatus({
        kind: 'error',
        message: err?.message ?? 'Unknown error',
      });
    } finally {
      setIsSending(false);
    }
  }

  async function loadLatestHistory() {
    setHistoryStatus('loading');
    setHistoryError('');
    try {
      const r = await fetchHistory({ limit: 50 });
      setHistory(r.events);
      setHistoryBefore(r.nextBefore);
      setHistoryStatus('idle');
    } catch (e: any) {
      setHistoryStatus('error');
      setHistoryError(e?.message ?? 'Failed to load history');
    }
  }

  async function loadMoreHistory() {
    if (!historyBefore) return;
    setHistoryStatus('loading');
    setHistoryError('');
    try {
      const r = await fetchHistory({ limit: 50, before: historyBefore });
      setHistory((prev) => [...prev, ...r.events]);
      setHistoryBefore(r.nextBefore);
      setHistoryStatus('idle');
    } catch (e: any) {
      setHistoryStatus('error');
      setHistoryError(e?.message ?? 'Failed to load more history');
    }
  }

  function appleLink(lat: number, lng: number) {
    return `https://maps.apple.com/?ll=${lat},${lng}`;
  }
  function googleLink(lat: number, lng: number) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  /* -------------------- RENDER -------------------- */

  return (
    <>
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
              disabled={isSending}
              onClick={() => send(mode)}
              type="button"
            >
              {isSending ? 'Sending…' : 'Send Location'}
            </button>

            {confirmEmergency ? (
              <button
                className="btnDanger"
                disabled={isSending}
                onClick={() => send('emergency')}
                type="button"
              >
                CONFIRM 🚨 SEND EMERGENCY
              </button>
            ) : (
              <button
                className="btnDanger"
                disabled={isSending}
                onClick={() => setConfirmEmergency(true)}
                type="button"
              >
                🚨 Emergency
              </button>
            )}
          </div>

          {/* -------- STATUS -------- */}
          <div className={`status ${status.kind}`}>
            {status.kind === 'idle' ? 'Ready.' : status.message}
          </div>

          {/* -------- RETRY (ONLY ON ERROR) -------- */}
          {status.kind === 'error' && (
            <button
              className="btn"
              style={{ marginTop: 8 }}
              disabled={isSending}
              onClick={() => send(mode)}
              type="button"
            >
              Retry
            </button>
          )}

          {/* -------- LAST SUCCESS (PERSISTENT) -------- */}
          {lastSuccess && (
            <div className="status" style={{ marginTop: 8 }}>
              Last sent: {new Date(lastSuccess.ts).toLocaleString()} (
              {lastSuccess.eventType})<br />
              Lat: {lastSuccess.lat.toFixed(5)}, Lng:{' '}
              {lastSuccess.lng.toFixed(5)}
            </div>
          )}

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
        <section className="card" style={{ marginTop: 12 }}>
          <div className="header" style={{ marginBottom: 8 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Timeline</h2>
              <p className="sub" style={{ marginTop: 4 }}>
                Last events logged by backend
              </p>
            </div>
            <button
              className="btn"
              disabled={historyStatus === 'loading'}
              onClick={loadLatestHistory}
              type="button"
            >
              {history.length ? 'Refresh' : 'Load'}
            </button>
          </div>

          {historyStatus === 'error' && (
            <div className="status error">{historyError}</div>
          )}

          {historyStatus === 'loading' && (
            <div className="status working">Loading history…</div>
          )}

          {history.length === 0 && historyStatus !== 'loading' && (
            <div className="status">No history yet.</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map((e: any) => (
              <div key={e.id} className="historyItem">
                <div className="historyTop">
                  <div className="historyType">{String(e.eventType)}</div>
                  <div className="historyTime">
                    {new Date(e.createdAtIso).toLocaleString()}
                  </div>
                </div>

                <div className="historyCoords">
                  {Number(e.lat).toFixed(5)}, {Number(e.lng).toFixed(5)}
                </div>

                <div className="row" style={{ marginTop: 8 }}>
                  <a
                    className="btnLink"
                    href={appleLink(e.lat, e.lng)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Apple Maps
                  </a>
                  <a
                    className="btnLink"
                    href={googleLink(e.lat, e.lng)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Maps
                  </a>
                </div>

                {e.notes && (
                  <div className="historyNotes">Notes: {e.notes}</div>
                )}
              </div>
            ))}
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <button
              className="btn"
              disabled={historyStatus === 'loading' || !historyBefore}
              onClick={loadMoreHistory}
              type="button"
            >
              {historyBefore ? 'Load more' : 'No more'}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
