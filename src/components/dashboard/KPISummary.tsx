'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { DashboardSummary } from '@/types';
import { IndianRupee, Scale, TrendingDown, Wallet, ShoppingBag, ArrowUpRight, TrendingUp } from 'lucide-react';

interface KPISummaryProps {
  summary: DashboardSummary;
}

export const KPISummary: React.FC<KPISummaryProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
      {/* Today's Sales */}
      <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-emerald-100 uppercase tracking-wider">Today's Sales</span>
          <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
            <IndianRupee className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-black tracking-tight">
            ₹{summary.todaySales.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-200">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{summary.todayOrdersCount} Orders Delivered Today</span>
          </div>
        </div>
      </Card>

      {/* Estimated Profit */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider">Net Profit Today</span>
          <div className="p-2 bg-emerald-500/20 rounded-xl">
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
            ₹{summary.todayProfit.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-400">
            After Expenses & Wastage
          </div>
        </div>
      </Card>

      {/* Available Chicken Stock */}
      <Card className="bg-white border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Available Stock</span>
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <Scale className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {summary.availableStockKg.toLocaleString('en-IN')} <span className="text-lg font-bold text-slate-500">kg</span>
          </div>
          <div className="mt-1 text-xs font-semibold text-amber-700 flex items-center gap-1">
            <span>Truck 1 + Truck 2 Stock</span>
          </div>
        </div>
      </Card>

      {/* Customer Dues Total */}
      <Card className="bg-white border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Customer Outstanding</span>
          <div className="p-2 bg-red-100 text-red-700 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">
            ₹{summary.outstandingBalanceTotal.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs font-semibold text-red-600">
            Uncollected Dues Across Customers
          </div>
        </div>
      </Card>
    </div>
  );
};
