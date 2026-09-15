'use client';

import React from 'react';
import { Truck, ShoppingBag, UserPlus, AlertTriangle, Receipt, Wallet, DollarSign } from 'lucide-react';

interface QuickActionsProps {
  onOpenStartTrip: () => void;
  onOpenAddOrder: () => void;
  onOpenAddCustomer: () => void;
  onOpenRecordLoss: () => void;
  onOpenAddExpense: () => void;
  onOpenRecordPayment: () => void;
  onOpenDailyExpenses?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onOpenStartTrip,
  onOpenAddOrder,
  onOpenAddCustomer,
  onOpenRecordLoss,
  onOpenAddExpense,
  onOpenRecordPayment,
  onOpenDailyExpenses,
}) => {
  const actions = [
    {
      title: 'Start New Trip',
      subtitle: 'Load truck & set route',
      icon: Truck,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      iconBg: 'bg-emerald-700/50',
      onClick: onOpenStartTrip,
    },
    {
      title: 'Add Order',
      subtitle: 'Record customer order',
      icon: ShoppingBag,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      iconBg: 'bg-blue-700/50',
      onClick: onOpenAddOrder,
    },
    {
      title: 'Record Payment',
      subtitle: 'Collect customer cash/UPI',
      icon: Wallet,
      color: 'bg-teal-600 hover:bg-teal-700 text-white',
      iconBg: 'bg-teal-700/50',
      onClick: onOpenRecordPayment,
    },
    {
      title: 'Daily Expenses',
      subtitle: 'View & track expenses',
      icon: Receipt,
      color: 'bg-slate-800 hover:bg-slate-900 text-white',
      iconBg: 'bg-slate-700/50',
      onClick: onOpenDailyExpenses || onOpenAddExpense,
    },
    {
      title: 'Record Loss',
      subtitle: 'Transportation mortality',
      icon: AlertTriangle,
      color: 'bg-red-600 hover:bg-red-700 text-white',
      iconBg: 'bg-red-700/50',
      onClick: onOpenRecordLoss,
    },
    {
      title: 'Add Customer',
      subtitle: 'New shop account',
      icon: UserPlus,
      color: 'bg-amber-600 hover:bg-amber-700 text-white',
      iconBg: 'bg-amber-700/50',
      onClick: onOpenAddCustomer,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          ⚡ Quick Business Actions
        </h2>
        <span className="text-xs font-semibold text-slate-500">One-Tap Action Buttons</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={action.onClick}
              className={`p-4 rounded-2xl ${action.color} shadow-sm hover:shadow-md transition-all active:scale-[0.96] flex flex-col items-start justify-between min-h-[110px] text-left group touch-manipulation cursor-pointer select-none pointer-events-auto z-10`}
            >
              <div className={`p-2.5 rounded-xl ${action.iconBg} mb-2 group-hover:scale-110 transition-transform shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-extrabold text-base leading-tight">{action.title}</div>
                <div className="text-[11px] opacity-80 mt-0.5 font-medium leading-tight">{action.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
