import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CLEANING_TYPE_LABELS,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  OrderStatus,
  type TrackingInfo,
} from '@laundry/shared';

type FetchState =
  | { kind: 'loading' }
  | { kind: 'ready'; info: TrackingInfo }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

/**
 * Public customer tracking page.
 *
 * Hits GET /api/track/:code — no auth, the tracking code is the bearer.
 * The server response already hides PII beyond the customer's first name,
 * so we can render it directly.
 */
export function TrackingPage(): JSX.Element {
  const { code } = useParams<{ code: string }>();
  const [state, setState] = useState<FetchState>({ kind: 'loading' });

  useEffect(() => {
    if (!code) {
      setState({ kind: 'error', message: 'Missing tracking code' });
      return;
    }

    const controller = new AbortController();
    const run = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/track/${encodeURIComponent(code)}`, {
          signal: controller.signal,
        });
        if (res.status === 404) {
          setState({ kind: 'not_found' });
          return;
        }
        if (!res.ok) {
          setState({ kind: 'error', message: `Server returned ${res.status}` });
          return;
        }
        const info = (await res.json()) as TrackingInfo;
        setState({ kind: 'ready', info });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setState({ kind: 'error', message: (err as Error).message });
      }
    };
    void run();
    return () => controller.abort();
  }, [code]);

  return (
    <div className="min-h-full bg-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Tracking code</div>
        <div className="font-mono text-lg text-slate-900 mb-6">{code}</div>

        {state.kind === 'loading' && <Skeleton />}
        {state.kind === 'not_found' && <NotFound />}
        {state.kind === 'error' && <ErrorState message={state.message} />}
        {state.kind === 'ready' && <Progress info={state.info} />}
      </div>
    </div>
  );
}

function Progress({ info }: { info: TrackingInfo }): JSX.Element {
  // Build a map of status → timestamp from the events list.
  const reachedAt = new Map<OrderStatus, string>();
  for (const e of info.events) reachedAt.set(e.status, e.at);

  const currentIndex = ORDER_STATUS_FLOW.indexOf(info.status);

  return (
    <>
      <h2 className="text-lg font-semibold text-slate-900 mb-1">
        Hi {info.customerFirstName} 👋
      </h2>
      <p className="text-sm text-slate-600 mb-6">
        {CLEANING_TYPE_LABELS[info.cleaningType]} ·{' '}
        <span className="capitalize">{info.fulfillment}</span>
      </p>

      <ol className="space-y-3">
        {ORDER_STATUS_FLOW.map((status, idx) => {
          const reached = reachedAt.get(status);
          const isCurrent = idx === currentIndex;
          const isDone = idx < currentIndex || info.status === OrderStatus.Delivered;
          return (
            <li key={status} className="flex items-center gap-3">
              <span
                className={
                  'h-6 w-6 rounded-full text-xs flex items-center justify-center ' +
                  (isDone
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-200 text-slate-500')
                }
              >
                {isDone ? '✓' : idx + 1}
              </span>
              <span
                className={
                  'flex-1 ' + (isCurrent ? 'font-medium text-slate-900' : 'text-slate-700')
                }
              >
                {ORDER_STATUS_LABELS[status]}
              </span>
              {reached && (
                <span className="text-xs text-slate-400">
                  {new Date(reached).toLocaleString()}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

function Skeleton(): JSX.Element {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-6 bg-slate-200 rounded w-1/2" />
      <div className="h-4 bg-slate-200 rounded w-1/3" />
      <div className="h-20 bg-slate-100 rounded" />
    </div>
  );
}

function NotFound(): JSX.Element {
  return (
    <div className="text-center py-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Order not found</h2>
      <p className="text-sm text-slate-600">
        Double-check the tracking code — it's case sensitive.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }): JSX.Element {
  return (
    <div className="text-center py-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Something went wrong</h2>
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}
