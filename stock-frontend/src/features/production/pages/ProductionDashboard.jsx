import React, { useState, useEffect } from 'react';
import { productionApi } from '../../../services/productionService';
import { Plus, List, User, PlusCircle, Trash2, Layers, CheckCircle2, Eye } from 'lucide-react';

export default function ProductionDashboard() {
  // State variables
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State for creating a new batch workflow
  const [employeeName, setEmployeeName] = useState('');
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [itemsToSubmit, setItemsToSubmit] = useState([]);
  
  // Item inputs state
  const [newItem, setNewItem] = useState({ productId: '', quantityProduced: '', expirationDate: '' });

  // Selected batch detailed modal view state
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Fetch batches on mount
  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await productionApi.getAllBatches();
      setBatches(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError('Failed to download production records from api service.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Workflow step: Initialize batch header
  const handleStartBatch = async (e) => {
    e.preventDefault();
    if (!employeeName.trim()) return;

    try {
      const response = await productionApi.createBatch(employeeName);
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

    setNewItem({ productId: '', quantityProduced: '', expirationDate: '' });
  };

  // 3. Workflow step: Finalize batch details dispatch
  const handleFinalizeBatch = async () => {
    if (itemsToSubmit.length === 0) return;
    try {
      await productionApi.submitBatchDetails(activeBatchId, itemsToSubmit);
      // Reset variables on success
      setActiveBatchId(null);
      setEmployeeName('');
      setItemsToSubmit([]);
      loadBatches(); // Reload records datatable
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
      {/* Metrics Banner cards summary layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total System Batches</p>
            <h3 className="text-2xl font-bold text-slate-900">{batches.length}</h3>
          </div>
        </div>
      </div>

      {/* Main Core Layout Splits Grid splitting actions vs histories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Create Production Batch Panel Wizard Workspace */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <Plus className="text-emerald-500 h-5 w-5" /> Open Production Batch
          </h3>

          {!activeBatchId ? (
            /* Step A: Initialize the header form config */
            <form onSubmit={handleStartBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Responsible Operator</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter Employee Name"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-slate-800 transition-colors">
                Initialize Active Batch
              </button>
            </form>
          ) : (
            /* Step B: The batch header is created, now add items to it */
            <div className="space-y-6">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                <strong>Active Batch initialized: #{activeBatchId}</strong><br/>
                Operator: {employeeName}
              </div>

              {/* Local Staging Inline Form Submitting row items */}
              <form onSubmit={handleAddItemToStage} className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Add Batch Items</h4>
                <div>
                  <input
                    type="number"
                    placeholder="Product ID Code"
                    required
                    value={newItem.productId}
                    onChange={(e) => setNewItem({ ...newItem, productId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Qty Produced"
                    required
                    value={newItem.quantityProduced}
                    onChange={(e) => setNewItem({ ...newItem, quantityProduced: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="date"
                    value={newItem.expirationDate}
                    onChange={(e) => setNewItem({ ...newItem, expirationDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button type="submit" className="w-full bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold py-2 rounded-lg hover:bg-slate-200 flex items-center justify-center gap-1 transition-colors">
                  <PlusCircle className="h-4 w-4" /> Stage Item Row
                </button>
              </form>

              {/* Local staged preview stack list ready to save */}
              {itemsToSubmit.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-700 uppercase">Staged Registry Elements</span><span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-bold">{itemsToSubmit.length}</span></div>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {itemsToSubmit.map((itm, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded border border-slate-100">
                        <div>
                          <p className="font-semibold text-slate-800">Prod ID: {itm.productId}</p>
                          <p className="text-slate-500">Qty: {itm.quantityProduced} {itm.expirationDate && `| Exp: ${itm.expirationDate}`}</p>
                        </div>
                        <button onClick={() => setItemsToSubmit(itemsToSubmit.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleFinalizeBatch} className="w-full bg-emerald-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 shadow-sm">
                    <CheckCircle2 className="h-4 w-4" /> Finalize & Submit Batch
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Production History Data Ledger view */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
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
                    <th className="px-4 py-3">Operator Name</th>
                    <th className="px-4 py-3">Timestamp Run</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {batches.map((b) => (
                    <tr key={b.id || b.batchId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">#{b.id || b.batchId}</td>
                      <td className="px-4 py-3 font-medium">{b.employee_name || b.employeeName}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {b.created_at ? new Date(b.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleViewBatchDetails(b.id || b.batchId)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition-colors"
                        >
                          <Eye className="h-3 w-3" /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* POPUP MODAL DRAWER OVERLAY: Inspect items inside a selected batch view */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-lg">Inspection Panel: Batch #{selectedBatch.id || selectedBatch.batchId}</h3>
                <p className="text-xs text-slate-400">Created by: {selectedBatch.employee_name || selectedBatch.employeeName}</p>
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
                      {selectedBatch.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-slate-400">#{item.id}</td>
                          <td className="p-3 font-semibold text-slate-900">Prod {item.product_id || item.productId}</td>
                          <td className="p-3 font-medium text-slate-700">{item.quantity_produced || item.quantityProduced} units</td>
                          <td className="p-3 text-slate-500">
                            {item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : 'None Marked'}
                          </td>
                        </tr>
                      ))}
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