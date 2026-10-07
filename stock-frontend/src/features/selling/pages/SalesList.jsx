'use client';

import React, { useState, useEffect } from 'react';
import { salesApi } from '../../../services/productionService';
import {
  STATUS_FILTERS,
  canCancel,
  canMarkPaid,
  canRefund,
  matchesStatusFilter,
  statusBadge,
  statusLabel
} from '../saleStatus';
import { ShoppingBag, RefreshCw, Calendar, User, Search, AlertCircle, XCircle, RotateCcw, Check, Ban } from 'lucide-react';

export default function SalesList() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(null);

  // Status change state
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  // Sale waiting for destructive confirmation: { saleId, status }
  const [confirmTarget, setConfirmTarget] = useState(null);

  // Format currency in COP
  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format date readable
  const formatDate = (dateString) => {
    if (!dateString) return 'N/D';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);
      // Calls API to get all sales
      const data = await salesApi.getAllSales();
      setSales(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load sales history:', err);
      setError(err.response?.data?.error || err.message || 'Error al cargar la lista de ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // Filter sales by customer, employee, sale ID, or status chip
  const filteredSales = sales.filter((sale) => {
    const query = searchQuery.toLowerCase();
    const customer = (sale.customer_name || sale.company_name || '').toLowerCase();
    const employee = (sale.employee_name || '').toLowerCase();
    const id = String(sale.id || sale.sale_id || '');

    const matchesSearch = customer.includes(query) || employee.includes(query) || id.includes(query);
    return matchesSearch && matchesStatusFilter(sale.status, statusFilter);
  });

  /**
   * Moves one sale to another status through POST /api/sales/:id/status.
   * Only the status of the row is patched: the API answers with the sale
   * header (no line items), so the rest of the row is left untouched.
   */
  const applyStatusChange = async (saleId, status) => {
    setBusyId(saleId);
    setActionError(null);

    try {
      const updated = await salesApi.updateSaleStatus(saleId, status);
      setSales((prev) =>
        prev.map((sale) =>
          (sale.id || sale.sale_id) === saleId
            ? { ...sale, status: updated?.status || status }
            : sale
        )
      );
    } catch (err) {
      console.error(`Failed to move sale #${saleId} to ${status}:`, err);
      setActionError(
        err.response?.data?.error || err.message || `Error al actualizar la venta #${saleId}`
      );
    } finally {
      setBusyId(null);
      setConfirmTarget(null);
    }
  };

  // Paying does not touch stock, so it can happen with a single click.
  const handleAction = (sale, status) => {
    const saleId = sale.id || sale.sale_id;

    if (status === 'paid') {
      applyStatusChange(saleId, status);
      return;
    }

    // Cancelling/refunding hands the stock back, so it always confirms first.
    setConfirmTarget({ saleId, status });
  };

  const confirmLabel = confirmTarget?.status === 'cancelled' ? 'Cancelar' : 'Reembolsar';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            Registros de ventas
          </h2>
          <p className="text-xs text-slate-500">Resumen de todas las transacciones de clientes</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ID de venta, cliente, empleado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
            />
          </div>

          <button
            onClick={fetchSales}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Actualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => {
          const count = sales.filter((sale) => matchesStatusFilter(sale.status, filter.value)).length;
          const isActive = statusFilter === filter.value;

          return (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700'
              }`}
            >
              {filter.label}
              <span className={`ml-1.5 font-bold ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status change error */}
      {actionError && (
        <div className="mx-4 mt-3 p-3 rounded-lg flex items-center gap-2 text-sm bg-rose-50 text-rose-800 border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-auto text-rose-500 hover:text-rose-700">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content / Table */}
      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 text-sm">
            Cargando historial de ventas...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-12 text-rose-600 text-sm">
            {error}
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-sm gap-2">
            <ShoppingBag className="w-8 h-8 stroke-1 text-slate-300" />
            <p>{sales.length === 0 ? 'Aún no hay ventas registradas.' : 'No hay ventas que coincidan con el filtro.'}</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <th className="py-3 px-4">ID de venta</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Empleado</th>
                <th className="py-3 px-4">Detalle de productos</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Monto total</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSales.map((sale) => {
                const saleId = sale.id || sale.sale_id;
                const totalAmount = sale.total_amount ||
                  (sale.items || []).reduce((sum, item) => sum + (item.quantity_sold * item.unit_price), 0);
                const status = sale.status || 'pending';
                const isBusy = busyId === saleId;

                return (
                  <tr key={saleId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{saleId}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(sale.created_at || sale.date)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {sale.customer_name || sale.company_name || `Cliente #${sale.customer_id}`}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {sale.employee_name || 'Ventas'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {Array.isArray(sale.items) && sale.items.length > 0 ? (
                        <div className="space-y-0.5">
                          {sale.items.map((item, idx) => (
                            <div key={idx} className="text-slate-600">
                              <span className="font-semibold">{item.quantity_sold}x</span> {item.product_name || item.name || `Producto #${item.product_id}`}
                              <span className="text-slate-400 ml-1">({formatCOP(item.unit_price)})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Sin detalles</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${statusBadge(status)}`}>
                        {statusLabel(status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCOP(totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {canMarkPaid(status) && (
                          <button
                            onClick={() => handleAction(sale, 'paid')}
                            disabled={isBusy}
                            title="Marcar como pagada"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Pagar
                          </button>
                        )}
                        {canCancel(status) && (
                          <button
                            onClick={() => handleAction(sale, 'cancelled')}
                            disabled={isBusy}
                            title="Cancelar venta y devolver stock"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 disabled:opacity-50 transition-colors"
                          >
                            <Ban className="w-3 h-3" />
                            Cancelar
                          </button>
                        )}
                        {canRefund(status) && (
                          <button
                            onClick={() => handleAction(sale, 'refunded')}
                            disabled={isBusy}
                            title="Reembolsar venta y devolver stock"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-sky-200 bg-sky-50 text-sky-700 font-semibold hover:bg-sky-100 disabled:opacity-50 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reembolsar
                          </button>
                        )}
                        {!canMarkPaid(status) && !canCancel(status) && !canRefund(status) && (
                          <span className="text-slate-400 italic">Sin acciones</span>
                        )}
                        {isBusy && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Destructive confirmation */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-50 text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">
                  {confirmLabel} la venta #{confirmTarget.saleId}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Se devolverán sus productos al inventario y la venta quedará como{' '}
                  <span className="font-semibold">
                    {statusLabel(confirmTarget.status).toLowerCase()}
                  </span>
                  . Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmTarget(null)}
                disabled={busyId !== null}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Volver
              </button>
              <button
                onClick={() => applyStatusChange(confirmTarget.saleId, confirmTarget.status)}
                disabled={busyId !== null}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-300"
              >
                {busyId !== null ? 'Procesando...' : `Sí, ${confirmLabel.toLowerCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
