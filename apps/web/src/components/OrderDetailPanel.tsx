/**
 * OrderDetailPanel — a slide-over panel from the right side of the screen.
 *
 * Shows full order details, event timeline, and action buttons for status
 * transitions. Fetches order detail and supporting data (machines, drivers)
 * on demand.
 */

import { useEffect, useState } from 'react';
import {
  CLEANING_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  OrderStatus,
  Fulfillment,
  ProcessingSpeed,
  type OrderDetail,
} from '@laundry/shared';
import { apiFetch } from '../lib/api';

interface OrderDetailPanelProps {
  orderId: string;
  onClose: () => void;
  onStatusChange: () => void;
}

interface Machine {
  id: string;
  label: string;
  type: string;
}

interface Driver {
  id: string;
  name: string;
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

export function OrderDetailPanel({
  orderId,
  onClose,
  onStatusChange,
}: OrderDetailPanelProps): JSX.Element {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Machine picker state
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [showMachinePicker, setShowMachinePicker] = useState(false);

  // Driver picker state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [showDriverPicker, setShowDriverPicker] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchOrder = async (): Promise<void> => {
      try {
        const res = await apiFetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error('Failed to load order');
        const data = await res.json();
        if (!cancelled) setOrder(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchOrder();
    return () => { cancelled = true; };
  }, [orderId]);

  const fetchMachines = async (): Promise<void> => {
    try {
      const res = await apiFetch('/api/machines');
      if (res.ok) {
        const data = await res.json();
        setMachines(data);
      }
    } catch { /* ignore */ }
  };

  const fetchDrivers = async (): Promise<void> => {
    try {
      const res = await apiFetch('/api/users/drivers');
      if (res.ok) {
        const data = await res.json();
        setDrivers(data);
      }
    } catch { /* ignore */ }
  };

  const transitionTo = async (
    toStatus: OrderStatus,
    extra?: Record<string, string>,
  ): Promise<void> => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: toStatus, ...extra }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Transition failed');
      }
      const updated = await res.json();
      setOrder(updated);
      onStatusChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setShowMachinePicker(false);
      setShowDriverPicker(false);
    }
  };

  const renderActions = (): JSX.Element | null => {
    if (!order) return null;

    switch (order.status) {
      case OrderStatus.Received:
        return (
          <button
            onClick={() => transitionTo(OrderStatus.NotStarted)}
            disabled={actionLoading}
            className="w-full rounded-md bg-brand-600 text-white py-2 px-4 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            Start Processing
          </button>
        );

      case OrderStatus.NotStarted:
        if (!showMachinePicker) {
          return (
            <button
              onClick={() => { setShowMachinePicker(true); void fetchMachines(); }}
              disabled={actionLoading}
              className="w-full rounded-md bg-brand-600 text-white py-2 px-4 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              Assign Machine & Begin
            </button>
          );
        }
        return (
          <div className="space-y-2">
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select a machine…</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.type})
                </option>
              ))}
            </select>
            <button
              onClick={() => transitionTo(OrderStatus.Working, { machineId: selectedMachineId })}
              disabled={actionLoading || !selectedMachineId}
              className="w-full rounded-md bg-brand-600 text-white py-2 px-4 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              Confirm & Start
            </button>
          </div>
        );

      case OrderStatus.Working:
        return (
          <button
            onClick={() => transitionTo(OrderStatus.Finished)}
            disabled={actionLoading}
            className="w-full rounded-md bg-emerald-600 text-white py-2 px-4 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            Mark Finished
          </button>
        );

      case OrderStatus.Finished:
        if (!showDriverPicker) {
          return (
            <button
              onClick={() => { setShowDriverPicker(true); void fetchDrivers(); }}
              disabled={actionLoading}
              className="w-full rounded-md bg-purple-600 text-white py-2 px-4 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              Send for Delivery
            </button>
          );
        }
        return (
          <div className="space-y-2">
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select a driver…</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => transitionTo(OrderStatus.OutForDelivery, { driverId: selectedDriverId })}
              disabled={actionLoading || !selectedDriverId}
              className="w-full rounded-md bg-purple-600 text-white py-2 px-4 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              Confirm & Dispatch
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Order Detail</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {order && !loading && (
            <>
              {/* Summary */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">{order.customerName}</h3>
                <p className="text-sm text-slate-600">{order.customerPhone}</p>
                {order.customerEmail && (
                  <p className="text-sm text-slate-500">{order.customerEmail}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                    {CLEANING_TYPE_LABELS[order.cleaningType]}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                  {order.processingSpeed === ProcessingSpeed.Express && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      Express
                    </span>
                  )}
                  {order.fulfillment === Fulfillment.Delivery && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Delivery
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs text-slate-400 mt-1">
                  {order.trackingCode}
                </p>
                {order.notes && (
                  <p className="text-sm text-slate-600 bg-slate-50 rounded p-2 mt-2">
                    {order.notes}
                  </p>
                )}
                {order.deliveryAddress && (
                  <p className="text-sm text-slate-500 mt-1">
                    Deliver to: {order.deliveryAddress}
                  </p>
                )}
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Timeline</h4>
                <div className="space-y-3 relative border-l-2 border-slate-200 pl-4">
                  {order.events.map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 border-2 border-white" />
                      <p className="text-sm text-slate-700">
                        {event.fromStatus
                          ? `${ORDER_STATUS_LABELS[event.fromStatus]} → ${ORDER_STATUS_LABELS[event.toStatus]}`
                          : ORDER_STATUS_LABELS[event.toStatus]}
                      </p>
                      <p className="text-xs text-slate-400">{timeAgo(event.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>{renderActions()}</div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
