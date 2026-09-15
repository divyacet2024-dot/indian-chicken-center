'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Expense, ChickenLoss, DashboardSummary } from '@/types';
import { Receipt, Fuel, Users, Wrench, AlertTriangle, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ExpensesProfitBreakdownProps {
  expenses: Expense[];
  losses: ChickenLoss[];
  summary: DashboardSummary;
  onOpenAddExpense: () => void;
  onOpenRecordLoss: () => void;
}

export const ExpensesProfitBreakdown: React.FC<ExpensesProfitBreakdownProps> = ({
  expenses,
  losses,
  summary,
  onOpenAddExpense,
  onOpenRecordLoss,
}) => {
  const getCategoryIcon = (category: Expense['category']) => {
    switch (category) {
      case 'fuel':
        return <Fuel className="w-4 h-4 text-amber-600" />;
      case 'labour':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-purple-600" />;
      default:
        return <Receipt className="w-4 h-4 text-slate-600" />;
    }
  };

  const totalLossValue = losses.reduce((acc, l) => acc + l.totalLossValue, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Expenses Card */}
      <Card className="border-slate-200">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              🧾 Today's Trip Expenses
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Fuel, labour, food & vehicle maintenance
            </p>
          </div>

          <Button size="sm" variant="outline" onClick={onOpenAddExpense} icon={<Plus className="w-4 h-4" />}>
            Add Expense
          </Button>
        </div>

        <div className="space-y-2.5">
          {expenses.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No expenses recorded for today</p>
          ) : (
            expenses.map((exp) => (
              <div
                key={exp.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">{getCategoryIcon(exp.category)}</div>
                  <div>
                    <div className="font-bold text-slate-900 capitalize text-sm">{exp.category} Expense</div>
                    <div className="text-slate-500">{exp.notes}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-slate-900 text-sm">₹{exp.amount.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-slate-400">{exp.date}</div>
                </div>
              </div>
            ))
          )}

          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-slate-900">
            <span>Total Expenses Today:</span>
            <span className="text-slate-900 text-base">₹{summary.todayExpenses.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </Card>

      {/* Trip Profitability & Loss Card */}
      <Card className="border-slate-200 bg-slate-900 text-white">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              📊 Daily Profit Calculation
            </h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Income minus loading, fuel & wastage costs
            </p>
          </div>

          <Button size="sm" variant="danger" onClick={onOpenRecordLoss} icon={<AlertTriangle className="w-4 h-4" />}>
            Record Loss
          </Button>
        </div>

        <div className="space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
            <span className="text-slate-400 font-medium">Total Delivered Sales Income:</span>
            <span className="font-extrabold text-emerald-400 text-base">₹{summary.todaySales.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
            <span className="text-slate-400 font-medium">Total Trip Operating Expenses:</span>
            <span className="font-bold text-slate-300">- ₹{summary.todayExpenses.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
            <span className="text-slate-400 font-medium">Transportation Loss ({summary.todayLossKg} kg chicken):</span>
            <span className="font-bold text-red-400">- ₹{totalLossValue.toLocaleString('en-IN')}</span>
          </div>

          <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl flex items-center justify-between mt-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block">
                Net Profit Today
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                ₹{summary.todayProfit.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
