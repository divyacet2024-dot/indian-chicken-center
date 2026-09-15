'use client';

import React from 'react';
import {
  LayoutDashboard,
  Truck,
  MapPin,
  Scale,
  ShoppingBag,
  Users,
  Receipt,
  FileText,
  Settings,
  PlusCircle,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickActionClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onQuickActionClick }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trucks', label: 'Trucks & Drivers', icon: Truck, badge: '2 Active' },
    { id: 'trips', label: 'Truck Trips', icon: MapPin },
    { id: 'stock', label: 'Chicken Stock & Loading', icon: Scale },
    { id: 'orders', label: 'Customer Orders', icon: ShoppingBag, badge: '3 Today' },
    { id: 'customers', label: 'Customers & Ledgers', icon: Users },
    { id: 'expenses', label: 'Daily Expenses', icon: Receipt },
    { id: 'reports', label: 'Profit & Reports', icon: FileText },
    { id: 'settings', label: 'Business Profile', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 min-h-[calc(100dvh-5rem)] p-4 shrink-0">
      {/* Quick Action Large Primary Button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onQuickActionClick}
          className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Quick Actions</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5">
        <div className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Business Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer touch-manipulation ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                    isActive ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="mt-auto pt-4 border-t border-slate-800 text-xs text-slate-500 space-y-1">
        <div className="font-bold text-slate-400">Indian Chicken Center v1.0</div>
        <div>Offline Mode Ready</div>
      </div>
    </aside>
  );
};
