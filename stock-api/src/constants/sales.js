/**
 * Sale lifecycle (`sale_status` enum in Postgres).
 *
 * A sale is written as `pending` once its line items exist, moves to `paid`
 * when the customer settles it, and ends in `cancelled` (voided before
 * payment) or `refunded` (returned after payment). `created` is only the
 * column default, so legacy rows are still covered by the transitions.
 *
 * The service (transition rules) and the controller (payload validation)
 * both read from this module, so the API can never accept a status the
 * schema does not know about.
 */

/** Every value of the `sale_status` enum, in lifecycle order. */
const SALE_STATUSES = ['created', 'pending', 'paid', 'cancelled', 'refunded'];

/**
 * Legal moves per current status. `cancelled` and `refunded` are terminal.
 * @type {Object.<string, string[]>}
 */
const ALLOWED_TRANSITIONS = {
  created: ['pending', 'paid', 'cancelled', 'refunded'],
  pending: ['paid', 'cancelled', 'refunded'],
  paid: ['refunded'],
  cancelled: [],
  refunded: [],
};

/** Statuses that hand the reserved stock back to the warehouse. */
const RESTOCK_STATUSES = new Set(['cancelled', 'refunded']);

/** Statuses the UI can still move away from. */
const TERMINAL_STATUSES = new Set(['cancelled', 'refunded']);

/** Spanish labels used in user-facing API error messages. */
const STATUS_LABELS = {
  created: 'creada',
  pending: 'pendiente',
  paid: 'pagada',
  cancelled: 'cancelada',
  refunded: 'reembolsada',
};

module.exports = {
  SALE_STATUSES,
  ALLOWED_TRANSITIONS,
  RESTOCK_STATUSES,
  TERMINAL_STATUSES,
  STATUS_LABELS,
};
