import { useCallback, useEffect, useState } from 'react';
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  SocketEvent,
  type HealthResponse,
  type OrderCreatedPayload,
  type OrderStatusChangedPayload,
} from '@laundry/shared';
import { useSocketConnection, useSocketEvent } from '../hooks/useSocket';

/**
 * Dashboard page — Phase 4 adds real-time event stream.
 * Phase 5 replaces the static columns with a full Kanban + Socket.IO-driven cards.
 * For now: Kanban skeletons + live event log at the bottom to prove the pipe works.
 */
export function DashboardPage(): JSX.Element {
  const [events, setEvents] = useState<Array<{ time: string; text: string }>>([]);

  // TODO: replace with real auth context (Phase 5).
  // For now, read from localStorage where login would store it.
  const [token] = useState<string | null>(() => localStorage.getItem('accessToken'));

  useSocketConnection(token);

  useSocketEvent(
    SocketEvent.OrderCreated,
    useCallback((payload: OrderCreatedPayload) => {
      setEvents((prev) => [
        { time: new Date().toLocaleTimeString(), text: `New order ${payload.trackingCode}` },
        ...prev.slice(0, 49),
      ]);
    }, []),
  );

  useSocketEvent(
    SocketEvent.OrderStatusChanged,
    useCallback((payload: OrderStatusChangedPayload) => {
      setEvents((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          text: `Order ${payload.orderId.slice(0, 8)}… → ${payload.toStatus}`,
        },
        ...prev.slice(0, 49),
      ]);
    }, []),
  );
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Orders</h2>
        <HealthBadge />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {ORDER_STATUS_FLOW.filter((s) => s !== 'delivered').map((status) => (
          <div
            key={status}
            className="bg-white rounded-lg border border-slate-200 min-h-[300px] p-3"
          >
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
              <span>{ORDER_STATUS_LABELS[status]}</span>
              <span className="text-xs font-normal text-slate-400">0</span>
            </h3>
            <div className="text-xs text-slate-400 text-center py-8">No orders yet</div>
          </div>
        ))}
      </div>

      {/* ── Live event stream (Phase 4 proof-of-concept) ── */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Live events
          <span className="ml-2 text-xs font-normal text-slate-400">
            {token ? '(socket connected — store an accessToken in localStorage to see events)' : '(no token — set localStorage.accessToken to connect)'}
          </span>
        </h3>
        {events.length === 0 ? (
          <p className="text-xs text-slate-400">
            No events yet. Submit an order via the widget or advance one via REST Client.
          </p>
        ) : (
          <ul className="max-h-60 overflow-y-auto space-y-1 bg-slate-50 rounded-md p-3 border border-slate-200">
            {events.map((e, i) => (
              <li key={i} className="text-xs text-slate-600">
                <span className="text-slate-400 mr-2 font-mono">{e.time}</span>
                {e.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function HealthBadge(): JSX.Element {
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');
  const [detail, setDetail] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/health');
        const body = (await res.json()) as HealthResponse;
        if (cancelled) return;
        setState(body.ok ? 'ok' : 'fail');
        setDetail(`DB: ${body.checks.database}, Redis: ${body.checks.redis}`);
      } catch {
        if (!cancelled) {
          setState('fail');
          setDetail('API unreachable');
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const color =
    state === 'ok' ? 'bg-emerald-500' : state === 'fail' ? 'bg-rose-500' : 'bg-slate-300';

  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span>API {state}</span>
      {detail && <span className="text-slate-400">· {detail}</span>}
    </div>
  );
}
