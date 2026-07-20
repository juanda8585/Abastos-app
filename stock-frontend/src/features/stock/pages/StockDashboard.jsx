import React, { useState, useEffect } from 'react';
import { productionApi } from '../../../services/productionService';
import { 
  Boxes, 
  Search, 
  AlertTriangle, 
  RefreshCw, 
  Edit3, 
  X, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';

export default function StockDashboard() {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Edit stock modal state
  const [editingItem, setEditingItem] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadStockLevels();
  }, []);

  const loadStockLevels = async () => {
    try {
      setLoading(true);
      // Calls API returning joined stock_levels + products data      
      const data = await productionApi.getStockLevels();
      setStockData(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError('Failed to download current stock metrics from database.');
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setNewStockValue(item.current_stock ?? item.currentStock);
  };

  // Submit stock adjustment
  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!editingItem || newStockValue === '') return;

    try {
      setIsUpdating(true);
      const productId = editingItem.product_id || editingItem.productId;
      
      await productionApi.updateStockLevel(productId, Number(newStockValue));
      
      // Local state optimistic update / refresh
      await loadStockLevels();
      setEditingItem(null);
    } catch (err) {
      alert('Failed to update stock value.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter logic
  const filteredStock = stockData.filter((item) => {
    const productName = item.name || item.product_name || '';
    const sku = item.sku || '';
    const stock = Number(item.current_stock ?? item.currentStock ?? 0);

    const matchesSearch = 
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesLowStock = filterLowStock ? stock <= 10 : true; // Default low stock threshold at 10

    return matchesSearch && matchesLowStock;
  });

  // Summary Metrics calculations
  const totalProductsCount = stockData.length;
  const totalUnitsInStock = stockData.reduce((acc, item) => acc + Number(item.current_stock ?? item.currentStock ?? 0), 0);
  const lowStockCount = stockData.filter(item => Number(item.current_stock ?? item.currentStock ?? 0) <= 10).length;

  return (
    <div className="space-y-8">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory & Stock Levels</h1>
          <p className="text-sm text-slate-500 font-medium">Real-time balances across registered product units</p>
        </div>
        <button
          onClick={loadStockLevels}
          className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Sync Stock
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tracked SKUs</p>
            <h3 className="text-2xl font-bold text-slate-900">{totalProductsCount}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <ArrowUpRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Volume Units</p>
            <h3 className="text-2xl font-bold text-slate-900">{totalUnitsInStock.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className={`p-3 rounded-lg ${lowStockCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Low Stock Alerts</p>
            <h3 className="text-2xl font-bold text-slate-900">{lowStockCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Stock Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search and Filters Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
              filterLowStock 
                ? 'bg-amber-50 border-amber-300 text-amber-800' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            {filterLowStock ? 'Showing Low Stock Only' : 'Filter Low Stock (≤ 10)'}
          </button>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Querying current stock levels...</div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200">{error}</div>
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No inventory balances match your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3">Last Updated</th>
                  <th className="px-4 py-3 text-center">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStock.map((item) => {
                  const stock = Number(item.current_stock ?? item.currentStock ?? 0);
                  const isLow = stock <= 10;
                  
                  return (
                    <tr key={item.product_id || item.productId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">
                        {item.sku || `#${item.product_id || item.productId}`}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.name || item.product_name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        <span className="bg-slate-100 px-2 py-0.5 rounded uppercase font-semibold text-slate-600">
                          {item.unit || 'units'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        <div className="flex items-center gap-2">
                          <span className={`text-base ${isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                            {stock}
                          </span>
                          {isLow && (
                            <span className="inline-flex items-center text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                              LOW
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {item.updated_at ? new Date(item.updated_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Set Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Direct Stock Override/Adjustment */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-emerald-400" /> Adjust Stock Balance
              </h3>
              <button 
                onClick={() => setEditingItem(null)} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStock} className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Product</p>
                <p className="text-sm font-bold text-slate-900">{editingItem.name || editingItem.product_name}</p>
                <p className="text-xs text-slate-400 font-mono">{editingItem.sku}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  New Current Stock ({editingItem.unit || 'units'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1 shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" /> {isUpdating ? 'Saving...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}