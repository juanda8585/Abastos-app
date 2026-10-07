'use client';

import React, { useState, useEffect } from 'react';
import { productionApi, salesApi, customerApi } from '../../../services/productionService';
import SalesList from './SalesList';
import { statusBadge, statusLabel, isSettled } from '../saleStatus';
import { Search, ShoppingCart, Trash2, Plus, Minus, User, CheckCircle2, AlertCircle, Receipt, History, Check, Ban, X } from 'lucide-react';

export default function SellingDashboard() {
  // Tab State: 'pos' or 'history'
  const [activeTab, setActiveTab] = useState('pos');

  // State management
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Checkout Form State
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [employeeName, setEmployeeName] = useState('Ventas');

  // UI Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Sale created by the last checkout, still pending payment
  // { id, status, items } - `items` is the snapshot needed to give the
  // stock back locally if the sale is cancelled.
  const [lastSale, setLastSale] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  // Helper function to format Colombian Pesos
  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Fetch products, stock levels, and active customers on load
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const [prodData, stockData, customerData] = await Promise.all([
          productionApi.getAllProducts(),
          productionApi.getStockLevels(),
          customerApi.getActiveCustomers()
        ]);

        const safeProdList = Array.isArray(prodData) ? prodData : [];
        const safeStockList = Array.isArray(stockData) ? stockData : [];
        const safeCustomerList = Array.isArray(customerData) ? customerData : [];

        const stockMap = new Map(
          safeStockList.map(s => [s.product_id || s.productId, Number(s.current_stock ?? s.stock ?? 0)])
        );

        const combined = safeProdList.map(prod => ({
          ...prod,
          price: Number(prod.price) > 0 ? Number(prod.price) : 5000,
          current_stock: stockMap.get(prod.id) ?? Number(prod.current_stock ?? 0)
        }));

        setProducts(combined);
        setCustomers(safeCustomerList);

        if (safeCustomerList.length > 0) {
          setCustomerId(safeCustomerList[0].id);
        }
      } catch (err) {
        console.error('Failed to load POS data:', err);
        setFeedback({ type: 'error', message: 'Error al cargar los datos de POS.' });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredProducts = products.filter(p =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existing = prevCart.find(item => item.product_id === product.id);

      if (existing) {
        if (existing.quantity_sold >= product.current_stock) {
          setFeedback({ type: 'error', message: `No se puede superar las existencias disponibles (${product.current_stock}).` });
          return prevCart;
        }
        return prevCart.map(item =>
          item.product_id === product.id
            ? { ...item, quantity_sold: item.quantity_sold + 1 }
            : item
        );
      }

      if (product.current_stock < 1) {
        setFeedback({ type: 'error', message: `${product.name} ¡no tiene existencias!` });
        return prevCart;
      }

      return [...prevCart, {
        product_id: product.id,
        name: product.name,
        unit_price: product.price || 5000,
        quantity_sold: 1,
        max_stock: product.current_stock
      }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prevCart) =>
      prevCart.map(item => {
        if (item.product_id === productId) {
          const newQty = item.quantity_sold + delta;
          if (newQty <= 0) return null;
          if (newQty > item.max_stock) {
            setFeedback({ type: 'error', message: `Se alcanzó el máximo de existencias (${item.max_stock})` });
            return item;
          }
          return { ...item, quantity_sold: newQty };
        }
        return item;
      }).filter(Boolean)
    );
  };

  const updateUnitPrice = (productId, newPrice) => {
    const numericPrice = Math.max(0, Number(newPrice) || 0);
    setCart(prevCart =>
      prevCart.map(item =>
        item.product_id === productId
          ? { ...item, unit_price: numericPrice }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity_sold), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (!customerId) {
      setFeedback({ type: 'error', message: 'Seleccione un cliente antes de finalizar la compra.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const payload = {
      customer_id: Number(customerId),
      employee_name: employeeName,
      items: cart.map(item => ({
        product_id: item.product_id,
        quantity_sold: item.quantity_sold,
        unit_price: item.unit_price
      }))
    };

    try {
      const res = await salesApi.createSale(payload);
      const saleId = res?.id || res?.saleId;

      // The API stores the sale as `pending`: offer the payment/cancellation
      // right away instead of making the cashier hunt for it later.
      if (saleId) {
        setLastSale({ id: saleId, status: res?.status || 'pending', items: payload.items });
        setConfirmingCancel(false);
      }
      setFeedback({
        type: 'success',
        message: saleId
          ? `Venta #${saleId} registrada como pendiente. Marca su pago o cancélala.`
          : '¡Venta registrada con éxito!'
      });

      setProducts(prev => prev.map(prod => {
        const boughtItem = cart.find(c => c.product_id === prod.id);
        if (boughtItem) {
          return { ...prod, current_stock: prod.current_stock - boughtItem.quantity_sold };
        }
        return prod;
      }));

      setCart([]);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Error al registrar la venta.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Moves the just-created sale to `paid` or `cancelled`.
   *
   * Cancelling restocks on the server, so the local catalog is patched with
   * the same quantities to keep both views in sync.
   */
  const handleLastSaleStatus = async (status) => {
    if (!lastSale?.id || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    setFeedback(null);

    try {
      const updated = await salesApi.updateSaleStatus(lastSale.id, status);
      const newStatus = updated?.status || status;
      setLastSale(prev => (prev ? { ...prev, status: newStatus } : prev));
      setConfirmingCancel(false);

      if (newStatus === 'cancelled') {
        setProducts(prev => prev.map(prod => {
          const sold = lastSale.items.find(item => item.product_id === prod.id);
          return sold ? { ...prod, current_stock: prod.current_stock + sold.quantity_sold } : prod;
        }));
        setFeedback({ type: 'success', message: `Venta #${lastSale.id} cancelada. El stock volvió al inventario.` });
      } else {
        setFeedback({ type: 'success', message: `Venta #${lastSale.id} marcada como pagada.` });
      }
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Error al actualizar la venta.'
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-6rem)]">
      {/* Navigation Tabs Header */}
      <div className="flex justify-between items-center bg-white p-2 px-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
        <h1 className="font-bold text-slate-800 text-lg">Portal de Ventas</h1>
        <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'pos'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Nueva venta (POS)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial de ventas
          </button>
        </div>
      </div>

      {/* Render History Tab */}
      {activeTab === 'history' ? (
        <div className="flex-1 overflow-hidden">
          <SalesList />
        </div>
      ) : (
        /* Render POS Tab */
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
          {/* LEFT COLUMN: Product Catalog */}
          <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Productos e Inventario</h2>
                <span className="text-sm font-medium text-slate-500">{products.length} productos</span>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar productos por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {feedback && (
              <div className={`mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{feedback.message}</span>
              </div>
            )}

            <div className="flex-1 p-4 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400">Cargando catálogo...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">No hay productos disponibles</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredProducts.map((prod) => {
                    const isOutOfStock = prod.current_stock <= 0;
                    return (
                      <button
                        key={prod.id}
                        disabled={isOutOfStock}
                        onClick={() => addToCart(prod)}
                        className={`flex flex-col justify-between text-left p-3 rounded-lg border transition-all ${
                          isOutOfStock
                            ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                            : 'border-slate-200 hover:border-blue-500 hover:shadow-sm bg-white'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-slate-800 text-sm line-clamp-1">{prod.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Existencias: {prod.current_stock}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between w-full">
                          <span className="font-bold text-slate-900 text-xs">{formatCOP(prod.price)}</span>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Agregar +</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Cart & POS Checkout */}
          <div className="w-full lg:w-96 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
            <div className="p-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
              <ShoppingCart className="w-5 h-5 text-slate-700" />
              <h2 className="font-bold text-slate-800">Pedido actual</h2>
            </div>

            {/* Status of the sale created by the last checkout */}
            {lastSale && (
              <div className="p-3 border-b border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-slate-800 text-sm truncate">Venta #{lastSale.id}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${statusBadge(lastSale.status)}`}>
                      {statusLabel(lastSale.status)}
                    </span>
                  </div>
                  <button
                    onClick={() => { setLastSale(null); setConfirmingCancel(false); }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                    title="Ocultar panel de venta"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isSettled(lastSale.status) ? (
                  <p className="text-xs text-slate-500">
                    {lastSale.status === 'cancelled'
                      ? 'Venta cancelada: el stock fue devuelto al inventario.'
                      : 'Venta pagada. Ya puedes iniciar la siguiente.'}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLastSaleStatus('paid')}
                      disabled={isUpdatingStatus}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isUpdatingStatus ? 'Procesando...' : 'Marcar como pagada'}
                    </button>
                    <button
                      onClick={() => (confirmingCancel ? handleLastSaleStatus('cancelled') : setConfirmingCancel(true))}
                      disabled={isUpdatingStatus}
                      className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                        confirmingCancel
                          ? 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700'
                          : 'bg-white border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {confirmingCancel ? 'Confirmar' : 'Cancelar'}
                    </button>
                  </div>
                )}

                {confirmingCancel && !isSettled(lastSale.status) && (
                  <div className="flex items-center justify-between gap-2 text-[11px] text-rose-600">
                    <span>Se devolverá el stock al inventario.</span>
                    <button
                      onClick={() => setConfirmingCancel(false)}
                      className="font-semibold underline hover:text-rose-800"
                    >
                      No, volver
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Seleccionar cliente</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {customers.length === 0 ? (
                      <option value="">No hay clientes activos</option>
                    ) : (
                      customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company_name} ({c.contact_name})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre del empleado</label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <ShoppingCart className="w-8 h-8 stroke-1" />
                  <p className="text-sm">El carrito está vacío</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product_id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 line-clamp-1">{item.name}</p>
                      <button onClick={() => removeFromCart(item.product_id)} className="p-1 text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-slate-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={item.unit_price}
                          onChange={(e) => updateUnitPrice(item.product_id, e.target.value)}
                          className="w-24 px-2 py-1 border border-slate-200 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400 font-medium">COP</span>
                      </div>

                      <div className="flex items-center border border-slate-200 rounded-md">
                        <button onClick={() => updateQuantity(item.product_id, -1)} className="p-1 hover:bg-slate-100 text-slate-600">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-semibold">{item.quantity_sold}</span>
                        <button onClick={() => updateQuantity(item.product_id, 1)} className="p-1 hover:bg-slate-100 text-slate-600">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Total</span>
                <span className="text-xl font-bold text-slate-900">{formatCOP(cartSubtotal)}</span>
              </div>

              <button
                disabled={cart.length === 0 || isSubmitting}
                onClick={handleCheckout}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm transition-all"
              >
                {isSubmitting ? 'Procesando...' : 'Registrar venta (pendiente)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}