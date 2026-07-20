import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Factory, BarChart3, ShoppingCart, Store } from 'lucide-react';

export default function MainLayout() {
  const location = useLocation();

  const navigation = [
    { name: 'Production', path: '/production', icon: Factory },
    { name: 'Stock Dashboard', path: '/stock', icon: BarChart3 },
    { name: 'Selling / POS', path: '/selling', icon: ShoppingCart },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar Navigation Panel */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between">
        <div>
          {/* Brand Logo Header */}
          <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-800">
            <Store className="text-emerald-400 h-6 w-6" />
            <span className="font-bold text-lg tracking-wider">ABASTOS SYSTEM</span>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 px-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System Version Footer */}
        <div className="p-4 text-xs text-slate-500 border-t border-slate-800 text-center">
          v1.0.0 © 2026 Abastos Inc.
        </div>
      </aside>

      {/* Main Content Workspace Content Canvas */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">
            {navigation.find(n => location.pathname.startsWith(n.path))?.name || 'Dashboard'}
          </h1>
        </header>
        
        <div className="p-8 max-w-7xl w-full mx-auto">
          {/* This renders the active sub-module pages dynamically */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}