/**
 * Shared vocabulary for the sale lifecycle.
 *
 * The stored values are the English members of the `sale_status` enum owned
 * by the API; the labels are Spanish to match the rest of the UI. Keeping
 * them here means the POS confirmation panel and the history table always
 * describe a sale the same way.
 */

/** Human readable label per status, keyed by the stored enum value. */
export const SALE_STATUS_LABELS = {
  created: 'Creada',
  pending: 'Pendiente',
  paid: 'Pagada',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
};

/** Tailwind classes for the status pill per status. */
export const SALE_STATUS_BADGES = {
  created: 'bg-slate-100 text-slate-700 border-slate-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  refunded: 'bg-sky-50 text-sky-700 border-sky-200',
};

/**
 * Filter chips offered above the sales history.
 * `created` is the legacy column default, so it is grouped with `pending`.
 */
export const STATUS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'paid', label: 'Pagadas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'refunded', label: 'Reembolsadas' },
];

/** Statuses the cashier can still settle (create -> pay/cancel). */
export const isAwaitingPayment = (status) => status === 'pending' || status === 'created';

export const canMarkPaid = (status) => isAwaitingPayment(status);

export const canCancel = (status) => isAwaitingPayment(status);

export const canRefund = (status) => status === 'paid';

/** Statuses that need no further action from the cashier in the POS panel. */
export const isSettled = (status) => status === 'paid' || status === 'cancelled' || status === 'refunded';

export const statusLabel = (status) => SALE_STATUS_LABELS[status] || status || 'Sin estado';

export const statusBadge = (status) =>
  SALE_STATUS_BADGES[status] || 'bg-slate-100 text-slate-600 border-slate-200';

/** True when a sale (possibly with an unknown/missing status) fits a chip. */
export const matchesStatusFilter = (status, filter) => {
  if (filter === 'all') return true;
  if (filter === 'pending') return isAwaitingPayment(status);
  return status === filter;
};
