import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

// Features Imports
import ProductionDashboard from './features/production/pages/ProductionDashboard';
import StockDashboard from './features/stock/pages/StockDashboard';
import SellingDashboard from './features/selling/pages/SellingDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Wrap everything within our Core Sidebar Shell Layout */}
        <Route element={<MainLayout />}>
          {/* Automatically redirect root "/" to your production module */}
          <Route path="/" element={<Navigate to="/production" replace />} />
          
          {/* Dynamic Module Routes */}
          <Route path="/production/*" element={<ProductionDashboard />} />
          <Route path="/stock/*" element={<StockDashboard />} />
          <Route path="/selling/*" element={<SellingDashboard />} />
        </Route>

        {/* Catch-all fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}