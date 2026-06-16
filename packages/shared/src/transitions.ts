import { OrderStatus, UserRole } from './enums.js';

/**
 * Allowed forward transitions for the order state machine.
 * Backward transitions must be handled by admin-only override endpoints (future).
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.Received]: [OrderStatus.NotStarted],
  [OrderStatus.NotStarted]: [OrderStatus.Working],
  [OrderStatus.Working]: [OrderStatus.Finished],
  [OrderStatus.Finished]: [OrderStatus.OutForDelivery],
  [OrderStatus.OutForDelivery]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [],
};

/**
 * Which roles can perform each transition.
 * Admin always has implicit permission on top of the listed roles.
 */
export const TRANSITION_ROLES: Record<
  OrderStatus,
  Partial<Record<OrderStatus, readonly UserRole[]>>
> = {
  [OrderStatus.Received]: {
    [OrderStatus.NotStarted]: [UserRole.Staff],
  },
  [OrderStatus.NotStarted]: {
    [OrderStatus.Working]: [UserRole.Staff],
  },
  [OrderStatus.Working]: {
    [OrderStatus.Finished]: [UserRole.Staff],
  },
  [OrderStatus.Finished]: {
    [OrderStatus.OutForDelivery]: [UserRole.Staff],
  },
  [OrderStatus.OutForDelivery]: {
    [OrderStatus.Delivered]: [UserRole.Delivery],
  },
  [OrderStatus.Delivered]: {},
};

/** Returns true if `to` is a permitted next status from `from`. */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Returns true if the caller's role can perform a given transition. */
export function canRoleTransition(
  from: OrderStatus,
  to: OrderStatus,
  role: UserRole,
): boolean {
  if (role === UserRole.Admin) return isValidTransition(from, to);
  const allowedRoles = TRANSITION_ROLES[from]?.[to];
  return Boolean(allowedRoles?.includes(role));
}
