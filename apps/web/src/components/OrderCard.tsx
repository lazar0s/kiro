/**
 * OrderCard — a compact card rendered inside each Kanban column.
 *
 * Displays: customer name, cleaning type label, tracking code, time since
 * creation, and badges for express / delivery fulfillment.
 */

import {
  CLEANING_TYPE_LABELS,
  Fulfillment,
  ProcessingSpeed,
  type OrderSummary,
} from '@laundry/shared';

interface OrderCardProps {
  order: OrderSummary;
  onClick: (order: OrderSummary) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function OrderCard({ order, onClick }: OrderCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onClick(order)}
      className="w-full text-left bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-brand-300 transition-all cursor-pointer"
    >
      {/* Customer name */}
      <p className="text-sm font-semibold text-slate-900 truncate">
        {order.customerName}
      </p>

      {/* Cleaning type */}
      <p className="text-xs text-slate-500 mt-0.5">
        {CLEANING_TYPE_LABELS[order.cleaningType]}
      </p>

      {/* Tracking code + time ago */}
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono text-[10px] text-slate-400 tracking-wide">
          {order.trackingCode}
        </span>
        <span className="text-[10px] text-slate-400">
          {timeAgo(order.createdAt)}
        </span>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mt-2">
        {order.processingSpeed === ProcessingSpeed.Express && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
            Express
          </span>
        )}
        {order.fulfillment === Fulfillment.Delivery && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
            Delivery
          </span>
        )}
        {order.fulfillment === Fulfillment.Pickup && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-100 text-sky-800">
            Pickup
          </span>
        )}
      </div>
    </button>
  );
}
