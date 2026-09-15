'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Expense, ChickenLoss, DashboardSummary } from '@/types';
import { TrendingUp, ShieldCheck } from 'lucide-react';

interface ProfitFormulaBreakdownProps {
  summary: DashboardSummary;
  expenses: Expense[];
  losses: ChickenLoss[];
  profitReport?: {
    salesRevenue: number;
    purchaseCost: number;
    fuelExpense: number;
    labourExpense: number;
    maintenanceExpense: number;
    foodExpense: number;
    otherExpenses: number;
    totalExpenses: number;
    totalWastageKg: number;
    wastageCost: number;
    netProfit: number;
  };
}

export const ProfitFormulaBreakdown: React.FC<ProfitFormulaBreakdownProps> = ({
  summary,
  expenses,
  losses,
  profitReport,
}) => {
  // Use backend profitReport if available, else calculate fallback
  const salesRevenue = profitReport ? profitReport.salesRevenue : summary.todaySales;
  const fuelExpense = profitReport ? profitReport.fuelExpense : expenses.filter((e) => e.category === 'fuel').reduce((acc, e) => acc + e.amount, 0);
  const labourExpense = profitReport ? profitReport.labourExpense : expenses.filter((e) => e.category === 'labour').reduce((acc, e) => acc + e.amount, 0);
  const maintenanceExpense = profitReport ? profitReport.maintenanceExpense : expenses.filter((e) => e.category === 'maintenance').reduce((acc, e) => acc + e.amount, 0);
  const foodExpense = profitReport ? profitReport.foodExpense : expenses.filter((e) => e.category === 'food').reduce((acc, e) => acc + e.amount, 0);
  const otherExpense = profitReport ? profitReport.otherExpenses : expenses.filter((e) => e.category === 'other').reduce((acc, e) => acc + e.amount, 0);
  const purchaseCost = profitReport ? profitReport.purchaseCost : 0;
  const wastageKg = profitReport ? profitReport.totalWastageKg : losses.reduce((acc, l) => acc + l.quantityKg, 0);
  const wastageCost = profitReport ? profitReport.wastageCost : losses.reduce((acc, l) => acc + l.totalLossValue, 0);

  const totalExpenses = fuelExpense + labourExpense + maintenanceExpense + foodExpense + otherExpense;
  const netProfit = profitReport ? profitReport.netProfit : salesRevenue - purchaseCost - totalExpenses - wastageCost;

  return (
    <Card className="border-slate-200 bg-slate-900 text-white">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            🧮 Backend Profit Audit
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Authoritative financial formula computed by PostgreSQL backend
          </p>
        </div>

        <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Backend Calculated
        </span>
      </div>

      {/* FORMULA AUDIT DISPLAY */}
      <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-2 font-mono">
        <div className="text-slate-400 font-bold text-[11px] uppercase tracking-wider mb-1">
          Backend Profit Formula:
        </div>
        <div className="text-slate-300 leading-relaxed font-semibold">
          <span className="text-emerald-400">Revenue (₹{salesRevenue.toLocaleString('en-IN')})</span>
          <span className="text-slate-500"> − </span>
          <span className="text-amber-300">Purchase Cost (₹{purchaseCost.toLocaleString('en-IN')})</span>
          <span className="text-slate-500"> − </span>
          <span className="text-slate-300">Expenses (₹{totalExpenses.toLocaleString('en-IN')})</span>
          <span className="text-slate-500"> − </span>
          <span className="text-red-400">Wastage Loss (₹{wastageCost.toLocaleString('en-IN')})</span>
          <span className="text-slate-500"> = </span>
          <span className="text-emerald-400 font-bold">₹{netProfit.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Itemized Values Table */}
      <div className="pt-3 space-y-2 text-xs">
        <div className="flex justify-between items-center py-1 border-b border-slate-800/80 text-slate-300">
          <span>+ Gross Sales Revenue:</span>
          <span className="font-extrabold text-emerald-400 text-sm">₹{salesRevenue.toLocaleString('en-IN')}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-slate-800/80 text-slate-400">
          <span>− Chicken Purchase Cost (Loaded Stock):</span>
          <span className="font-semibold text-amber-300">- ₹{purchaseCost.toLocaleString('en-IN')}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-slate-800/80 text-slate-400">
          <span>− Fuel Expenses (Diesel):</span>
          <span className="font-semibold text-amber-400">- ₹{fuelExpense.toLocaleString('en-IN')}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-slate-800/80 text-slate-400">
          <span>− Labour & Driver Helper Allowance:</span>
          <span className="font-semibold text-blue-400">- ₹{labourExpense.toLocaleString('en-IN')}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-slate-800/80 text-slate-400">
          <span>− Vehicle Maintenance & Food:</span>
          <span className="font-semibold text-purple-400">- ₹{(maintenanceExpense + foodExpense).toLocaleString('en-IN')}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-slate-800/80 text-slate-400">
          <span>− Other / Toll Expenses:</span>
          <span className="font-semibold text-slate-400">- ₹{otherExpense.toLocaleString('en-IN')}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-slate-800/80 text-slate-400">
          <span>− Transportation Wastage ({wastageKg} kg dead @ cost price):</span>
          <span className="font-semibold text-red-400">- ₹{wastageCost.toLocaleString('en-IN')}</span>
        </div>

        {/* NET RESULT BANNER */}
        <div className="p-4 bg-emerald-950/80 border border-emerald-700/80 rounded-2xl flex items-center justify-between mt-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
              Net Backend Profit
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
              ₹{netProfit.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 shrink-0">
            <TrendingUp className="w-7 h-7" />
          </div>
        </div>
      </div>
    </Card>
  );
};
