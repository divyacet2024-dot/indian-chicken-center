'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Customer } from '@/types';
import { Button } from '@/components/ui/Button';
import { Wallet, PhoneCall, Plus } from 'lucide-react';

interface OutstandingBalancesProps {
  customers: Customer[];
  onOpenRecordPayment: (customerId?: string) => void;
  onOpenAddCustomer: () => void;
}

export const OutstandingBalances: React.FC<OutstandingBalancesProps> = ({
  customers,
  onOpenRecordPayment,
  onOpenAddCustomer,
}) => {
  const debtors = customers.filter((c) => c.currentBalance > 0);

  return (
    <Card className="border-slate-200">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            💰 Customer Balance Ledger
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Customers with pending payment balances
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={onOpenAddCustomer} icon={<Plus className="w-4 h-4" />}>
          Add Customer
        </Button>
      </div>

      <div className="space-y-3">
        {debtors.length === 0 ? (
          <div className="py-6 text-center text-slate-400">
            <p className="font-bold text-slate-600">All customer dues are paid in full! 🎉</p>
          </div>
        ) : (
          debtors.map((customer) => (
            <div
              key={customer.id}
              className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-emerald-300 transition-colors"
            >
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{customer.shopName}</h3>
                <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                  <span>{customer.customerName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <PhoneCall className="w-3 h-3 text-slate-400" /> {customer.contactNumber}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs text-slate-400 font-semibold">Balance Due</div>
                <div className="text-lg font-black text-red-600">
                  ₹{customer.currentBalance.toLocaleString('en-IN')}
                </div>
                <button
                  onClick={() => onOpenRecordPayment(customer.id)}
                  className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs active:scale-95 transition-all"
                >
                  Collect Cash
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
