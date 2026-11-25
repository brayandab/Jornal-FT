import { friendlyError } from '../api/errors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import type { RequestStatus, ServiceRequest } from '../api/types';
import { MapView } from '../components/MapView';
import type { MapPoint } from '../components/MapView';
import { QuoteBreakdown } from '../components/QuoteBreakdown';
import { ErrorBox, Field, Loading, Notice, Stars, StatusBadge } from '../components/ui';
import { formatDistance, formatInstant, formatLocal } from '../lib/format';
import { useTopic } from '../lib/realtime';
import { useAction, useAsync, useInterval } from '../lib/useAsync';
import { useApp } from '../state/AppContext';

const LIVE: RequestStatus[] = ['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS'];
const CANCELLABLE: RequestStatus[] = ['PENDING_PAYMENT', 'SEARCHING_WORKER', 'ASSIGNED', 'EN_ROUTE'];
const FLOW: RequestStatus[] = ['PENDING_PAYMENT', 'SEARCHING_WORKER', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'PENDING_CONFIRMATION', 'COMPLETED'];

interface Pos { lat: number; lng: number }

export function RequestDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { role, user, locale, profile } = useApp();
  const nav = useLocation();
  const req = useAsync(() => api.request(id), [id, locale]);
  const history = useAsync(() => api.history(id), [id, locale]);
  const [workerPos, setWorkerPos] = useState<Pos | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [live, setLive] = useState(false);

  const r = req.data;
  const isWorker = role === 'WORKER';
  const isClient = r && user && r.clientId === user.id;

  const refresh = useCallback(async () => {
    await Promise.all([req.reload(), history.reload()]);
  }, [req, history]);

  // Tiempo real: cambios de estado y posición del trabajador en el tema del pedido.
  useTopic(id ? `/topic/requests.${id}` : null, (body) => {
    const msg = body as { type?: string; status?: string; latitude?: number; longitude?: number };
    setLive(true);
    if (msg.type === 'location' && msg.latitude != null && msg.longitude != null) {
      setWorkerPos({ lat: msg.latitude, lng: msg.longitude });
    } else if (msg.type === 'status') {
      void refresh();
    }
  });

  // Respaldo por consulta (si el WebSocket no está disponible) y distancia calculada por asignación.
  const poll = useCallback(async () => {
    if (!r || !LIVE.includes(r.status)) return;
    try {
      const tr = await api.tracking(id);
      if (tr.position) setWorkerPos({ lat: tr.position.latitude, lng: tr.position.longitude });
      setDistanceKm(tr.distanceKm);
    } catch {
      // asignación aún sin seguimiento
    }
  }, [r, id]);
  useEffect(() => void poll(), [poll]);
  useInterval(() => void poll(), r && LIVE.includes(r.status) ? 8000 : null);
  // Mientras busca trabajador, el estado también se consulta por si el aviso llega antes de suscribirse.
  useInterval(() => void refresh(), r && ['PENDING_PAYMENT', 'SEARCHING_WORKER'].includes(r.status) && !live ? 5000 : null);

  if (req.loading && !r) return <Loading />;
  if (!r) return <ErrorBox error={req.error} />;

  const points: MapPoint[] = [{ lat: r.latitude, lng: r.longitude, label: t('order.place'), kind: 'place' }];
  if (workerPos) points.push({ ...workerPos, label: t('tracking.worker'), kind: 'worker' });

  return (
    <div className="order-layout">
      <div className="stack">
        <div className="title-row">
          <h1>{r.categoryName}</h1>
          <StatusBadge status={r.status} />
        </div>
        {(nav.state as { justCreated?: boolean } | null)?.justCreated && r.status === 'SEARCHING_WORKER' && (
          <Notice tone="ok">{t('tracking.created')}</Notice>
        )}
        <Progress status={r.status} />

        <section className="card">
          <h2>{t('tracking.title')}</h2>
          <MapView ariaLabel={t('tracking.title')} points={points} line follow={!!workerPos} />
          <p className="small">
            {workerPos
              ? t('tracking.distance', { distance: formatDistance(distanceKm, locale, profile?.measurementSystem ?? 'METRIC') })
              : t(`tracking.hint.${r.status}`, { defaultValue: '' })}
            {live && <span className="live-dot" title={t('tracking.live')}> ● {t('tracking.live')}</span>}
          </p>
          {isWorker && LIVE.includes(r.status) && (
            <LocationSender target={{ lat: r.latitude, lng: r.longitude }} onSent={setWorkerPos} />
          )}
        </section>

        {isWorker && <WorkerActions r={r} onDone={refresh} />}
        {isClient && <ClientActions r={r} onDone={refresh} />}
        {r.workerId && isClient && <WorkerCard workerId={r.workerId} />}
        {r.status === 'COMPLETED' && <RatingCard r={r} />}

        <section className="card">
          <h2>{t('tracking.history')}</h2>
          <ol className="timeline">
            {history.data?.map((h, i) => (
              <li key={i}>
                <strong>{t(`status.${h.to}`)}</strong>
                <span className="muted small"> · {formatInstant(h.at, locale, r.timezone, profile?.hourCycle)}</span>
                {h.reason && <div className="muted small">{h.reason}</div>}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="card summary">
        <h2>{t('order.summary')}</h2>
        <dl className="kv">
          <dt>{t('order.date')}</dt>
          <dd>{formatLocal(r.scheduledLocal, locale, profile?.hourCycle)} <span className="muted small">({r.timezone})</span></dd>
          <dt>{t('order.where')}</dt>
          <dd className="pre">{r.addressText}</dd>
          <dt>{t('order.payment')}</dt>
          <dd>{t(`payment.${r.paymentMethod.toLowerCase()}`, { defaultValue: r.paymentMethod })}
            {r.paymentCaptured && <span className="muted small"> · {t('tracking.captured')}</span>}</dd>
          {r.notes && (<><dt>{t('order.notes')}</dt><dd>{r.notes}</dd></>)}
          {r.cancelReason && (<><dt>{t('tracking.cancelReason')}</dt><dd>{r.cancelReason}</dd></>)}
        </dl>
        <QuoteBreakdown quote={r} />
        {r.receiptNumber && (
          <Link className="btn block" data-testid="receipt-link" to={`/requests/${r.id}/receipt`}>
            {t('receipt.view', { number: r.receiptNumber })}
          </Link>
        )}
      </aside>
    </div>
  );
}

function Progress({ status }: { status: RequestStatus }) {
  const { t } = useTranslation();
  const idx = FLOW.indexOf(status);
  if (idx < 0) return null;
  return (
    <ol className="progress" aria-label={t('tracking.progress')}>
      {FLOW.slice(1).map((s, i) => (
        <li key={s} className={i + 1 <= idx ? 'done' : ''} aria-current={i + 1 === idx ? 'step' : undefined}>
          <span>{t(`status.${s}`)}</span>
        </li>
      ))}
    </ol>
  );
}

function ClientActions({ r, onDone }: { r: ServiceRequest; onDone: () => Promise<void> }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const cancel = useAction(async () => { await api.cancel(r.id, reason || undefined); await onDone(); });
  const confirm = useAction(async () => { await api.confirm(r.id); await onDone(); });
  if (r.status !== 'PENDING_CONFIRMATION' && !CANCELLABLE.includes(r.status)) return null;
  return (
    <section className="card">
      {r.status === 'PENDING_CONFIRMATION' && (
        <>
          <h2>{t('tracking.confirmTitle')}</h2>
          <p>{t('tracking.confirmText')}</p>
          <ErrorBox error={confirm.error} />
          <button className="btn primary" data-testid="confirm" disabled={confirm.busy} onClick={() => confirm.run()}>{t('tracking.confirm')}</button>
        </>
      )}
      {CANCELLABLE.includes(r.status) && (
        <details>
          <summary>{t('tracking.cancel')}</summary>
          <p className="muted small">{t('tracking.cancelHint')}</p>
          <Field label={t('tracking.cancelReason')} value={reason} onChange={(e) => setReason(e.target.value)} />
          <ErrorBox error={cancel.error} />
          <button className="btn danger" disabled={cancel.busy} onClick={() => cancel.run()}>{t('tracking.cancelConfirm')}</button>
        </details>
      )}
    </section>
  );
}

function WorkerActions({ r, onDone }: { r: ServiceRequest; onDone: () => Promise<void> }) {
  const { t } = useTranslation();
  const step = useAction(async (s: 'en-route' | 'start' | 'finish') => { await api.workerStep(r.id, s); await onDone(); });
  const next: Partial<Record<RequestStatus, 'en-route' | 'start' | 'finish'>> = {
    ASSIGNED: 'en-route', EN_ROUTE: 'start', IN_PROGRESS: 'finish',
  };
  const s = next[r.status];
  if (!s) return null;
  return (
    <section className="card">
      <h2>{t('worker.nextStep')}</h2>
      <ErrorBox error={step.error} />
      <button className="btn primary block" data-testid={`step-${s}`} disabled={step.busy} onClick={() => step.run(s)}>{t(`worker.step.${s}`)}</button>
    </section>
  );
}

/**
 * Envía la ubicación del trabajador cada 7 s (PUT /subsystems/dispatch/locations/me).
 * Con GPS usa la posición real; en la demostración puede simular el recorrido hacia el lugar.
 */
function LocationSender({ target, onSent }: { target: Pos; onSent: (p: Pos) => void }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'off' | 'gps' | 'sim'>('off');
  const [error, setError] = useState<string | null>(null);
  const sim = useRef<Pos>({ lat: target.lat + 0.02, lng: target.lng + 0.015 });

  const tick = useCallback(async () => {
    let p: Pos;
    if (mode === 'gps') {
      p = await new Promise<Pos>((res, rej) =>
        navigator.geolocation.getCurrentPosition((g) => res({ lat: g.coords.latitude, lng: g.coords.longitude }), rej),
      ).catch(() => sim.current);
    } else {
      // Se acerca un 25 % al lugar en cada envío.
      sim.current = {
        lat: sim.current.lat + (target.lat - sim.current.lat) * 0.25,
        lng: sim.current.lng + (target.lng - sim.current.lng) * 0.25,
      };
      p = sim.current;
    }
    try {
      await api.sendLocation(p.lat, p.lng);
      onSent(p);
      setError(null);
    } catch (e) {
      setError(friendlyError(e, t));
    }
  }, [mode, target, onSent, t]);

  useEffect(() => { if (mode !== 'off') void tick(); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  useInterval(() => void tick(), mode === 'off' ? null : 7000);

  return (
    <div className="location-sender">
      <span className="small">{t('worker.location')}</span>
      <div className="chips">
        {(['off', 'gps', 'sim'] as const).map((m) => (
          <button key={m} type="button" data-testid={`loc-${m}`} className={mode === m ? 'chip-btn selected' : 'chip-btn'} aria-pressed={mode === m}
            onClick={() => setMode(m)} disabled={m === 'gps' && !navigator.geolocation}>
            {t(`worker.locationMode.${m}`)}
          </button>
        ))}
      </div>
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}

function WorkerCard({ workerId }: { workerId: string }) {
  const { t } = useTranslation();
  const { locale } = useApp();
  const w = useAsync(() => api.publicWorker(workerId), [workerId, locale]);
  if (!w.data) return null;
  return (
    <section className="card">
      <h2>{t('tracking.yourWorker')}</h2>
      <p><strong>{w.data.name}</strong></p>
      {w.data.ratingAvg != null && w.data.ratingCount > 0 && (
        <p className="small"><Stars value={Math.round(w.data.ratingAvg)} /> {w.data.ratingAvg.toFixed(1)} ({w.data.ratingCount})</p>
      )}
      {w.data.bio && <p className="muted">{w.data.bio}</p>}
    </section>
  );
}

function RatingCard({ r }: { r: ServiceRequest }) {
  const { t } = useTranslation();
  const { user } = useApp();
  const ratings = useAsync(() => api.ratings(r.id), [r.id]);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const send = useAction(async () => { await api.rate(r.id, score, comment || undefined); await ratings.reload(); });
  const mine = ratings.data?.find((x) => x.raterId === user?.id);
  return (
    <section className="card">
      <h2>{t('rating.title')}</h2>
      {ratings.data?.map((x) => (
        <div key={x.id} className="rating">
          <Stars value={x.score} />
          <span className="muted small">{t(`rating.direction.${x.direction}`, { defaultValue: x.direction })}</span>
          {x.comment && <p>{x.comment}</p>}
        </div>
      ))}
      {!mine && !ratings.loading && (
        <form onSubmit={(e) => { e.preventDefault(); void send.run(); }}>
          <p>{t(user?.id === r.workerId ? 'rating.rateClient' : 'rating.rateWorker')}</p>
          <Stars value={score} onChange={setScore} />
          <Field label={t('rating.comment')} value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} />
          <ErrorBox error={send.error} />
          <button className="btn primary" data-testid="send-rating" disabled={send.busy}>{t('rating.send')}</button>
        </form>
      )}
    </section>
  );
}
