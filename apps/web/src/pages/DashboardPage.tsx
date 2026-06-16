import { useEffect, useState } from 'react';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, type HealthResponse } from '@laundry/shared';

/**
 * Placeholder dashboard — Phase 5 replaces this with real Kanban + Socket.IO.
 * For now it shows: empty columns per status + API health status to prove
 * the proxy and shared package wiring works end-to-end.
 */
export function DashboardPage(): JSX.Element {
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
