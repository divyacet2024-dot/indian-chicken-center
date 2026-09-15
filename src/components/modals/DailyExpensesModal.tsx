'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Expense } from '@/types';
import { Plus, Receipt, Fuel, UserCheck, Wrench, Utensils, Tag } from 'lucide-react';

interface DailyExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  onOpenAddExpense: () => void;
}

export const DailyExpensesModal: React.FC<DailyExpensesModalProps> = ({
  isOpen,
  onClose,
  expenses,
  onOpenAddExpense,
}) => {
  const fuelTotal = expenses.filter((e) => e.category === 'fuel').reduce((acc, e) => acc + e.amount, 0);
  const labourTotal = expenses.filter((e) => e.category === 'labour').reduce((acc, e) => acc + e.amount, 0);
  const maintTotal = expenses.filter((e) => e.category === 'maintenance').reduce((acc, e) => acc + e.amount, 0);
  const foodTotal = expenses.filter((e) => e.category === 'food').reduce((acc, e) => acc + e.amount, 0);
  const otherTotal = expenses.filter((e) => e.category === 'other').reduce((acc, e) => acc + e.amount, 0);

  const grandTotal = fuelTotal + labourTotal + maintTotal + foodTotal + otherTotal;

  const handleAddNew = () => {
    onClose();
    setTimeout(() => {
      onOpenAddExpense();
    }, 120);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💸 Daily Trip & Fleet Expenses" subtitle="Today's expense category breakdown & records">
      <div className="space-y-4">
        {/* Total Header Banner */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Daily Expenses</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">
              ₹{grandTotal.toLocaleString('en-IN')}
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={handleAddNew} icon={<Plus className="w-4 h-4" />}>
            Add Expense
          </Button>
        </div>

        {/* Category Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-bold">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold mb-1">
              <Fuel className="w-3.5 h-3.5 text-amber-600" /> Fuel / Diesel
            </div>
            <div className="text-lg font-black text-amber-900">₹{fuelTotal.toLocaleString('en-IN')}</div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
            <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-semibold mb-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Labour & Bata
            </div>
            <div className="text-lg font-black text-blue-900">₹{labourTotal.toLocaleString('en-IN')}</div>
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900">
            <div className="flex items-center gap-1.5 text-[11px] text-purple-700 font-semibold mb-1">
              <Wrench className="w-3.5 h-3.5 text-purple-600" /> Maintenance
            </div>
            <div className="text-lg font-black text-purple-900">₹{maintTotal.toLocaleString('en-IN')}</div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold mb-1">
              <Utensils className="w-3.5 h-3.5 text-emerald-600" /> Food & Refreshment
            </div>
            <div className="text-lg font-black text-emerald-900">₹{foodTotal.toLocaleString('en-IN')}</div>
          </div>

          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold mb-1">
              <Tag className="w-3.5 h-3.5 text-slate-500" /> Other / Tolls
            </div>
            <div className="text-lg font-black text-slate-900">₹{otherTotal.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Expense List */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Recorded Daily Expense Items ({expenses.length})
          </div>

          {expenses.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              <Receipt className="w-8 h-8 mx-auto mb-1 opacity-40" />
              No expense records saved for today
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">
                        {exp.category}
                      </span>
                      <span>{exp.notes || exp.category}</span>
                    </div>
                    {exp.fuelDetails && (
                      <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                        ⛽ {exp.fuelDetails.litres} L Diesel @ ₹{exp.fuelDetails.pricePerLitre}/L
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 mt-0.5">{exp.date}</div>
                  </div>
                  <div className="font-black text-sm text-slate-900">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="outline" onClick={onClose} fullWidth>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
