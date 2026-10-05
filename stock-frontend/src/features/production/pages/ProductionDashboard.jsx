import React, { useState, useEffect, useCallback } from 'react';
import { productionApi, employeeApi } from '../../../services/productionService';
import { Plus, List, User, PlusCircle, Trash2, Layers, CheckCircle2, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductionDashboard() {
  // State variables
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]); // Added state to store database products list
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal control state for adding/editing a batch
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State for creating a new batch workflow
  const [employeeIds, setEmployeeIds] = useState([]); // Employees selected for the new batch
  const [employees, setEmployees] = useState([]); // Full roster loaded from the API
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [itemsToSubmit, setItemsToSubmit] = useState([]);
  
  // Item inputs state
  const [newItem, setNewItem] = useState({ productId: '', quantityProduced: '', expirationDate: '' });

  // Selected batch detailed modal view state
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Ledger pagination: the table shows 10 rows per page by default
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Loads one window of the ledger. Its identity tracks the page window, so
  // the effect below refetches exactly when the window changes.
  const loadBatches = useCallback(async (targetPage = page, targetSize = pageSize) => {
    try {
      setLoading(true);
      const data = await productionApi.getAllBatches({
        limit: targetSize,
        offset: targetPage * targetSize
      });
      setBatches(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total) || 0);
      setError(null);
    } catch (err) {
      setError('Failed to download production records from api service.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // Products and roster are loaded once; batches are refetched whenever the
  // requested page window changes
  useEffect(() => {
    loadProducts();
    loadEmployees();
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Paging controls
  const goToPage = (nextPage) => setPage(Math.min(Math.max(nextPage, 0), pageCount - 1));

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value));
    setPage(0);
  };

  const loadProducts = async () => {
    try {
      // Assuming your productionApi service has a corresponding method to fetch products
      const data = await productionApi.getAllProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load products list:', err);
    }
  };

  // Roster of employees who can be assigned to a batch
  const loadEmployees = async () => {
    try {
      const data = await employeeApi.getAllEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load employee roster:', err);
    }
  };

  // Toggle one employee in/out of the batch selection
  const toggleEmployee = (employeeId) => {
    setEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Names of the currently selected employees (roster order)
  const selectedEmployeeNames = employees
    .filter((emp) => employeeIds.includes(emp.id))
    .map((emp) => emp.name);

  // Helper to safely close the creation modal and clear wizard state
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setActiveBatchId(null);
    setEmployeeIds([]);
    setItemsToSubmit([]);
    setNewItem({ productId: '', quantityProduced: '', expirationDate: '' });
  };

  // 1. Workflow step: Initialize batch header
  const handleStartBatch = async (e) => {
    e.preventDefault();
    if (employeeIds.length === 0) return;

    try {
      const response = await productionApi.createBatch(employeeIds);
      if (response.success) {
        setActiveBatchId(response.batchId);
        setItemsToSubmit([]);
      }
    } catch (err) {
      alert('Error initializing batch header.');
    }
  };

  // 2. Workflow step: Stage local item to list
  const handleAddItemToStage = (e) => {
    e.preventDefault();
    if (!newItem.productId || !newItem.quantityProduced) return;

    setItemsToSubmit([...itemsToSubmit, {
      productId: Number(newItem.productId),
      quantityProduced: Number(newItem.quantityProduced),
      expirationDate: newItem.expirationDate || null
    }]);

    setNewItem({ productId: '', quantityProduced: '', expirationDate: newItem.expirationDate });
  };

  // 3. Workflow step: Finalize batch details dispatch
  const handleFinalizeBatch = async () => {
    if (itemsToSubmit.length === 0) return;
    try {
      await productionApi.submitBatchDetails(activeBatchId, itemsToSubmit);
      // A fresh batch sorts to the top of the ledger, so go back to page 1
      if (page === 0) {
        loadBatches(0, pageSize);
      } else {
        setPage(0);
      }
      handleCloseCreateModal(); // Close modal and clean up
    } catch (err) {
      alert('Error finalizing batch items entry processing.');
    }
  };

  // 4. View Detail Action Modal trigger
  const handleViewBatchDetails = async (id) => {
    try {
      const detailedData = await productionApi.getBatchById(id);
      setSelectedBatch(detailedData);
    } catch (err) {
      alert('Failed to retrieve batch elements.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Production Dashboard</h1>
          <p className="text-sm text-slate-500 font-medium">Monitor and manage your active batch records</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors text-sm"
        >
          <Plus className="h-5 w-5" /> Open Production Batch
        </button>
      </div>

      {/* Metrics Banner cards summary layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total System Batches</p>
            <h3 className="text-2xl font-bold text-slate-900">{total}</h3>
          </div>
        </div>
      </div>

      {/* Main Core Layout Ledger View */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
          <List className="text-slate-500 h-5 w-5" /> Production Batch Ledger History Logs
        </h3>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Processing api data streams...</div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200">{error}</div>
        ) : batches.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No historical production runs recorded in database storage yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Batch ID</th>
                  <th className="px-4 py-3">Employees</th>
                  <th className="px-4 py-3">Timestamp Run</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {batches.map((b) => (
                  <tr key={b.id || b.batchId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">#{b.id || b.batchId}</td>
                    <td className="px-4 py-3 font-medium">
                      {(b.employees || []).map((emp) => emp.name).join(', ') || 'None assigned'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {b.created_at ? new Date(b.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewBatchDetails(b.id || b.batchId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-side pager over the ledger */}
        {!loading && !error && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 mt-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <label htmlFor="ledger-page-size" className="font-medium">Rows per page</label>
              <select
                id="ledger-page-size"
                value={pageSize}
                onChange={handlePageSizeChange}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="ml-2">
                Showing {page * pageSize + 1}&ndash;{Math.min((page + 1) * pageSize, total)} of {total}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="text-slate-500 font-medium px-1">Page {page + 1} of {pageCount}</span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= pageCount - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* POPUP MODAL DRAWER OVERLAY: Create & Edit Batch Form Wizard */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Plus className="text-emerald-400 h-5 w-5" /> Open Production Batch
              </h3>
              <button 
                onClick={handleCloseCreateModal} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {!activeBatchId ? (
                /* Step A: Pick one or more employees from the roster */
                <form onSubmit={handleStartBatch} className="space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase mb-2">
                      <User className="h-3.5 w-3.5" /> Employees working on this batch
                    </label>

                    {employees.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No employees in the roster yet.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {employees.map((emp) => {
                          const isSelected = employeeIds.includes(emp.id);
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => toggleEmployee(emp.id)}
                              aria-pressed={isSelected}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {emp.name}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <p className={`text-xs mt-2 ${employeeIds.length === 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {employeeIds.length === 0
                        ? 'Select at least one employee.'
                        : `${employeeIds.length} employee${employeeIds.length === 1 ? '' : 's'} selected: ${selectedEmployeeNames.join(', ')}`}
                    </p>
                  </div>
                  <button 
                    type="submit" 
                    disabled={employeeIds.length === 0}
                    className="w-full bg-slate-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    Initialize Active Batch
                  </button>
                </form>
              ) : (
                /* Step B: The batch header is created, now add items to it */
                <div className="space-y-6">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                    <strong>Active Batch initialized: #{activeBatchId}</strong><br/>
                    Employees: {selectedEmployeeNames.join(', ')}
                  </div>

                  {/* Local Staging Inline Form Submitting row items with Product Dropdown */}
                  <form onSubmit={handleAddItemToStage} className="space-y-3 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Add Batch Items</h4>
                    <div>
                      <select
                        required
                        value={newItem.productId}
                        onChange={(e) => setNewItem({ ...newItem, productId: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                      >
                        <option value="" disabled>Select Product Name</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Qty Produced"
                        required
                        value={newItem.quantityProduced}
                        onChange={(e) => setNewItem({ ...newItem, quantityProduced: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                      />
                      <input
                        type="date"
                        value={newItem.expirationDate}
                        onChange={(e) => setNewItem({ ...newItem, expirationDate: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                      />
                    </div>
                    <button type="submit" className="w-full bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold py-2 rounded-lg hover:bg-slate-200 flex items-center justify-center gap-1 transition-colors">
                      <PlusCircle className="h-4 w-4" /> Stage Item Row
                    </button>
                  </form>

                  {/* Local staged preview stack list ready to save */}
                  {itemsToSubmit.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 uppercase">Staged Registry Elements</span>
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-bold">{itemsToSubmit.length}</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                        {itemsToSubmit.map((itm, idx) => {
                          // Find corresponding product object to render its name instead of raw ID
                          const productObj = products.find(p => p.id === itm.productId);
                          return (
                            <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded border border-slate-100">
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {productObj ? productObj.name : `Prod ID: ${itm.productId}`}
                                </p>
                                <p className="text-slate-500">Qty: {itm.quantityProduced} {itm.expirationDate && `| Exp: ${itm.expirationDate}`}</p>
                              </div>
                              <button onClick={() => setItemsToSubmit(itemsToSubmit.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={handleFinalizeBatch} className="w-full bg-emerald-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 shadow-sm">
                        <CheckCircle2 className="h-4 w-4" /> Finalize & Submit Batch
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL DRAWER OVERLAY: Inspect items inside a selected batch view */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-lg">Inspection Panel: Batch #{selectedBatch.batch_id}</h3>
                <p className="text-xs text-slate-400">
                  Employees: {(selectedBatch.employees || []).map((emp) => emp.name).join(', ') || 'None assigned'}
                </p>
              </div>
              <button onClick={() => setSelectedBatch(null)} className="text-slate-400 hover:text-white text-sm font-semibold bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                Close
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Registered Components Array</h4>
              {!selectedBatch.items || selectedBatch.items.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No entry rows attached to this layout frame shell header node.</p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Item ID</th>
                        <th className="p-3">Product ID</th>
                        <th className="p-3">Quantity</th>
                        <th className="p-3">Expiration Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedBatch.items.map((item) => {
                        const prodId =  item.productId;
                        const productObj = products.find(p => p.id === prodId);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-slate-400">#{item.productId}</td>
                            <td className="p-3 font-semibold text-slate-900">
                              {productObj ? productObj.name : `Prod ${prodId}`}
                            </td>
                            <td className="p-3 font-medium text-slate-700">{item.quantityProduced} units</td>
                            <td className="p-3 text-slate-500">
                              {item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : 'None Marked'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}