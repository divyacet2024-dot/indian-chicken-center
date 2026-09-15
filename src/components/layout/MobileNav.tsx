'use client';

import React from 'react';
import { LayoutDashboard, Truck, ShoppingBag, Users, PlusCircle } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickActionClick: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, onQuickActionClick }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'trucks', label: 'Trucks', icon: Truck },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'customers', label: 'Customers', icon: Users },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 py-1 rounded-xl transition-all touch-manipulation cursor-pointer select-none active:scale-95 ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'scale-110 text-emerald-400' : ''}`} />
              <span className="text-[11px] font-semibold tracking-tight leading-none">{item.label}</span>
            </button>
          );
        })}

        {/* Center Quick Action Floating Button */}
        <button
          type="button"
          onClick={onQuickActionClick}
          className="flex flex-col items-center justify-center -mt-6 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-full p-3.5 shadow-lg shadow-emerald-950/70 ring-4 ring-slate-900 active:scale-95 transition-transform touch-manipulation cursor-pointer select-none z-10"
          aria-label="Quick Actions"
        >
          <PlusCircle className="w-7 h-7" />
        </button>

        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 py-1 rounded-xl transition-all touch-manipulation cursor-pointer select-none active:scale-95 ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'scale-110 text-emerald-400' : ''}`} />
              <span className="text-[11px] font-semibold tracking-tight leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
