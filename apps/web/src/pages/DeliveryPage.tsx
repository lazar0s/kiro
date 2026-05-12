/**
 * DeliveryPage — view for delivery drivers.
 *
 * Shows orders with status "finished" or "out_for_delivery" as a card list.
 * Drivers can confirm delivery on their assigned orders. Real-time updates
 * via Socket.IO move cards in/out automatically.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CLEANING_TYPE_LABELS,
  Fulfillment,
  ORDER_STATUS_LABELS,
  OrderStatus,
  ProcessingSpeed,
  SocketEvent,
  type OrderSummary,
  type OrderStatusChangedPayload,
} from '@laundry/shared';
import { apiFetch } from '../lib/api';
import { useSocketEvent } from '../hooks/useSocket';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DeliveryPage(): JSX.Element {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOrders = async (): Promise<void> => {
      try {
        const res = await apiFetch('/api/orders?limit=200');
        if (!res.ok) throw new Error('Failed to load orders');
        const data: OrderSummary[] = await res.json();
        if (!cancelled) {
          // Only keep orders relevant to delivery
          setOrders(
            data.filter(
              (o) =>
                o.status === OrderStatus.Finished ||
                o.status === OrderStatus.OutForDelivery,
            ),
          );
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchOrders();
    return () => { cancelled = true; };
  }, []);

  // Real-time: status changes
  useSocketEvent(
    SocketEvent.OrderStatusChanged,
    useCallback((payload: OrderStatusChangedPayload) => {
      setOrders((prev) => {
        // If transitioned to a relevant status, update in place
        if (
          payload.toStatus === OrderStatus.Finished ||
          payload.toStatus === OrderStatus.OutForDelivery
        ) {
          const exists = prev.find((o) => o.id === payload.orderId);
          if (exists) {
            return prev.map((o) =>
              o.id === payload.orderId
                ? { ...o, status: payload.toStatus, updatedAt: payload.changedAt }
                : o,
            );
          }
          // New order entering delivery scope — fetch it
          const fetchNew = async (): Promise<void> => {
            try {
              const res = await apiFetch(`/api/orders/${payload.orderId}`);
              if (res.ok) {
                const order = await res.json();
                setOrders((p) => [order, ...p]);
              }
            } catch { /* ignore */ }
          };
          void fetchNew();
          return prev;
        }

        // Delivered or moved to another non-delivery status — remove from view
        return prev.filter((o) => o.id !== payload.orderId);
      });
    }, []),
  );

  const confirmDelivery = async (orderId: string): Promise<void> => {
    setActionLoading(orderId);
    setError(null);
    try {
      const res = await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: OrderStatus.Delivered }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to confirm delivery');
      }
      // Remove from local list
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const { ready, outForDelivery } = useMemo(() => {
    const ready: OrderSummary[] = [];
    const outForDelivery: OrderSummary[] = [];
    for (const o of orders) {
      if (o.status === OrderStatus.Finished) ready.push(o);
      else if (o.status === OrderStatus.OutForDelivery) outForDelivery.push(o);
    }
    return { ready, outForDelivery };
  }, [orders]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Deliveries</h2>

      {error && (
        <div className="mb-4 rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Out for delivery section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              Out for Delivery ({outForDelivery.length})
            </h3>
            {outForDelivery.length === 0 ? (
              <p className="text-sm text-slate-400">No orders out for delivery.</p>
            ) : (
              <div className="space-y-3">
                {outForDelivery.map((order) => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    showConfirm
                    actionLoading={actionLoading === order.id}
                    onConfirm={() => confirmDelivery(order.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Ready for pickup / dispatch section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Ready for Dispatch ({ready.length})
            </h3>
            {ready.length === 0 ? (
              <p className="text-sm text-slate-400">No orders ready for dispatch.</p>
            ) : (
              <div className="space-y-3">
                {ready.map((order) => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    showConfirm={false}
                    actionLoading={false}
                    onConfirm={() => {}}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

interface DeliveryCardProps {
  order: OrderSummary;
  showConfirm: boolean;
  actionLoading: boolean;
  onConfirm: () => void;
}

function DeliveryCard({
  order,
  showConfirm,
  actionLoading,
  onConfirm,
}: DeliveryCardProps): JSX.Element {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {order.customerName}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {CLEANING_TYPE_LABELS[order.cleaningType]}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-[10px] text-slate-400">
              {order.trackingCode}
            </span>
            <span className="text-[10px] text-slate-400">
              {timeAgo(order.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
              {ORDER_STATUS_LABELS[order.status]}
            </span>
            {order.processingSpeed === ProcessingSpeed.Express && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                Express
              </span>
            )}
          </div>
        </div>

        {showConfirm && (
          <button
            onClick={onConfirm}
            disabled={actionLoading}
            className="ml-4 shrink-0 rounded-md bg-emerald-600 text-white px-3 py-2 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {actionLoading ? 'Confirming…' : 'Confirm Delivery'}
          </button>
        )}
      </div>
    </div>
  );
}
