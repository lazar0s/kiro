import { useParams } from 'react-router-dom';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from '@laundry/shared';

/**
 * Placeholder customer tracking page.
 * Phase 3 wires up GET /api/track/:code and renders real progress.
 */
export function TrackingPage(): JSX.Element {
  const { code } = useParams<{ code: string }>();

  return (
    <div className="min-h-full bg-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Tracking code</div>
        <div className="font-mono text-lg text-slate-900 mb-6">{code}</div>

        <h2 className="text-lg font-semibold text-slate-900 mb-4">Order progress</h2>
        <ol className="space-y-3">
          {ORDER_STATUS_FLOW.map((status, idx) => (
            <li key={status} className="flex items-center gap-3">
              <span className="h-6 w-6 rounded-full bg-slate-200 text-slate-500 text-xs flex items-center justify-center">
                {idx + 1}
              </span>
              <span className="text-slate-700">{ORDER_STATUS_LABELS[status]}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-slate-400">
          Real status timestamps land in Phase 3.
        </p>
      </div>
    </div>
  );
}
