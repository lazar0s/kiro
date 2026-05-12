/**
 * DashboardPage — real-time Kanban board for order management.
 *
 * Groups orders by status into five columns. Subscribes to Socket.IO events
 * to move cards between columns without refetching. Includes a filter bar
 * (location dropdown + text search) and opens OrderDetailPanel on card click.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  OrderStatus,
  ORDER_STATUS_LABELS,
  SocketEvent,
  type OrderSummary,
  type OrderCreatedPayload,
  type OrderStatusChangedPayload,
} from '@laundry/shared';
import { apiFetch } from '../lib/api';
import { useSocketEvent } from '../hooks/useSocket';
import { OrderCard } from '../components/OrderCard';
import { OrderDetailPanel } from '../components/OrderDetailPanel';

/** Columns displayed on the Kanban board. */
const KANBAN_COLUMNS: OrderStatus[] = [
  OrderStatus.Received,
  OrderStatus.NotStarted,
  OrderStatus.Working,
  OrderStatus.Finished,
  OrderStatus.OutForDelivery,
];

interface Location {
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

export function DashboardPage(): JSX.Element {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch orders on mount
  useEffect(() => {
    let cancelled = false;

    const fetchOrders = async (): Promise<void> => {
      try {
        const res = await apiFetch('/api/orders?limit=200');
        if (!res.ok) throw new Error('Failed to fetch orders');
        const data = await res.json();
        if (!cancelled) setOrders(data);
      } catch (err) {
        console.error('[DashboardPage] Error loading orders:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchOrders();
    return () => { cancelled = true; };
  }, []);

  // Fetch locations for filter dropdown
  useEffect(() => {
    const fetchLocations = async (): Promise<void> => {
      try {
        const res = await apiFetch('/api/locations');
        if (res.ok) {
          const data = await res.json();
          setLocations(data);
        }
      } catch { /* ignore */ }
    };
    void fetchLocations();
  }, []);

  // Real-time: new order created
  useSocketEvent(
    SocketEvent.OrderCreated,
    useCallback((payload: OrderCreatedPayload) => {
      // Fetch the full order summary to add to the board
      const fetchNewOrder = async (): Promise<void> => {
        try {
          const res = await apiFetch(`/api/orders/${payload.orderId}`);
          if (res.ok) {
            const order = await res.json();
            setOrders((prev) => [order, ...prev]);
          }
        } catch { /* ignore */ }
      };
      void fetchNewOrder();
    }, []),
  );

  // Real-time: order status changed — move card between columns
  useSocketEvent(
    SocketEvent.OrderStatusChanged,
    useCallback((payload: OrderStatusChangedPayload) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === payload.orderId
            ? { ...o, status: payload.toStatus, updatedAt: payload.changedAt }
            : o,
        ),
      );
    }, []),
  );

  // Filter logic
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (selectedLocationId) {
      result = result.filter((o) => o.locationId === selectedLocationId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q) ||
          o.trackingCode.toLowerCase().includes(q),
      );
    }

    return result;
  }, [orders, selectedLocationId, searchQuery]);

  // Group orders by status
  const columns = useMemo(() => {
    const grouped: Record<OrderStatus, OrderSummary[]> = {
      [OrderStatus.Received]: [],
      [OrderStatus.NotStarted]: [],
      [OrderStatus.Working]: [],
      [OrderStatus.Finished]: [],
      [OrderStatus.OutForDelivery]: [],
      [OrderStatus.Delivered]: [],
    };

    for (const order of filteredOrders) {
      if (grouped[order.status]) {
        grouped[order.status].push(order);
      }
    }

    return grouped;
  }, [filteredOrders]);

  const handleCardClick = (order: OrderSummary): void => {
    setSelectedOrderId(order.id);
  };

  const handlePanelClose = (): void => {
    setSelectedOrderId(null);
  };

  const handleStatusChange = (): void => {
    // Refetch orders to ensure consistency after a manual status change
    const refetch = async (): Promise<void> => {
      try {
        const res = await apiFetch('/api/orders?limit=200');
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch { /* ignore */ }
    };
    void refetch();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Header + filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Orders</h2>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Location filter */}
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          {/* Search input */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, code…"
            className="flex-1 sm:w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {KANBAN_COLUMNS.map((status) => (
            <div
              key={status}
              className="bg-slate-50 rounded-lg border border-slate-200 min-h-[400px] p-3"
            >
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                <span>{ORDER_STATUS_LABELS[status]}</span>
                <span className="text-xs font-normal text-slate-400 bg-slate-200 rounded-full px-2 py-0.5">
                  {columns[status].length}
                </span>
              </h3>

              <div className="space-y-2">
                {columns[status].length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-8">
                    No orders
                  </div>
                ) : (
                  columns[status].map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onClick={handleCardClick}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order detail slide-over */}
      {selectedOrderId && (
        <OrderDetailPanel
          orderId={selectedOrderId}
          onClose={handlePanelClose}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
