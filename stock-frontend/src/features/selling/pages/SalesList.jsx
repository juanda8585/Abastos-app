'use client';

import React, { useState, useEffect } from 'react';
import { salesApi } from '../../../services/productionService';
import { ShoppingBag, RefreshCw, Calendar, User, Search } from 'lucide-react';

export default function SalesList() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

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
    if (!dateString) return 'N/A';
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
      setError(err.message || 'Error fetching sales list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // Filter sales by customer, employee, or sale ID
  const filteredSales = sales.filter((sale) => {
    const query = searchQuery.toLowerCase();
    const customer = (sale.customer_name || sale.company_name || '').toLowerCase();
    const employee = (sale.employee_name || '').toLowerCase();
    const id = String(sale.id || sale.sale_id || '');
    
    return customer.includes(query) || employee.includes(query) || id.includes(query);
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            Sales Records
          </h2>
          <p className="text-xs text-slate-500">Overview of all completed client transactions</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by sale ID, customer, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
            />
          </div>

          <button
            onClick={fetchSales}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content / Table */}
      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 text-sm">
            Loading sales history...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-12 text-rose-600 text-sm">
            {error}
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-sm gap-2">
            <ShoppingBag className="w-8 h-8 stroke-1 text-slate-300" />
            <p>No sales records found.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <th className="py-3 px-4">Sale ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Staff</th>
                <th className="py-3 px-4">Items Breakdown</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSales.map((sale) => {
                const totalAmount = sale.total_amount || 
                  (sale.items || []).reduce((sum, item) => sum + (item.quantity_sold * item.unit_price), 0);

                return (
                  <tr key={sale.id || sale.sale_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{sale.id || sale.sale_id}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(sale.created_at || sale.date)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {sale.customer_name || sale.company_name || `Customer #${sale.customer_id}`}
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
                              <span className="font-semibold">{item.quantity_sold}x</span> {item.product_name || item.name || `Product #${item.product_id}`}
                              <span className="text-slate-400 ml-1">({formatCOP(item.unit_price)})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No details</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCOP(totalAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}