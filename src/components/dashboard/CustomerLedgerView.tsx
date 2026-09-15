'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Customer, LedgerTransaction } from '@/types';
import { Button } from '@/components/ui/Button';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, PhoneCall, RefreshCw } from 'lucide-react';
import { ApiClient } from '@/services/apiClient';

interface CustomerLedgerViewProps {
  customers: Customer[];
  ledgerTransactions: LedgerTransaction[];
  onOpenRecordPayment: (customerId?: string) => void;
  onOpenAddCustomer: () => void;
  onRefreshCustomers?: () => void;
}

export const CustomerLedgerView: React.FC<CustomerLedgerViewProps> = ({
  customers,
  ledgerTransactions,
  onOpenRecordPayment,
  onOpenAddCustomer,
  onRefreshCustomers,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [backendLedger, setBackendLedger] = useState<{
    openingBalance: number;
    totalPurchases: number;
    totalPayments: number;
    currentBalance: number;
    entries: LedgerTransaction[];
  } | null>(null);

  const [isLoadingLedger, setIsLoadingLedger] = useState<boolean>(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // Fetch live ledger from GET /api/customers/{customer_id}/ledger
  useEffect(() => {
    if (!activeCustomer?.id) return;

    let isMounted = true;
    const fetchLedger = async () => {
      setIsLoadingLedger(true);
      setLedgerError(null);
      try {
        const liveData = await ApiClient.getCustomerLedger(activeCustomer.id);
        if (isMounted) {
          setBackendLedger(liveData as any);
        }
      } catch (err: any) {
        if (isMounted) {
          // Fallback to local filtering if backend offline
          const fallbackTxns = ledgerTransactions.filter(
            (t) => t.customerId === activeCustomer.id || t.customerName === activeCustomer.shopName
          );
          const purchases = fallbackTxns.filter((t) => t.type === 'purchase').reduce((a, b) => a + b.amount, 0);
          const payments = fallbackTxns.filter((t) => t.type === 'payment').reduce((a, b) => a + b.amount, 0);
          setBackendLedger({
            openingBalance: 0,
            totalPurchases: purchases,
            totalPayments: payments,
            currentBalance: activeCustomer.currentBalance,
            entries: fallbackTxns,
          });
        }
      } finally {
        if (isMounted) setIsLoadingLedger(false);
      }
    };

    fetchLedger();
    return () => {
      isMounted = false;
    };
  }, [activeCustomer?.id, ledgerTransactions]);

  const openingBal = backendLedger?.openingBalance ?? 0;
  const purchasesTotal = backendLedger?.totalPurchases ?? 0;
  const paymentsTotal = backendLedger?.totalPayments ?? 0;
  const computedBalance = backendLedger?.currentBalance ?? activeCustomer?.currentBalance ?? 0;
  const entries = backendLedger?.entries || [];

  return (
    <Card className="border-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            📖 Customer Ledger Accounts
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Backend verified formula: Opening Balance + Purchases − Payments = Current Balance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshCustomers && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefreshCustomers}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              title="Refresh ledger data from backend"
            >
              Sync API
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onOpenAddCustomer} icon={<Plus className="w-4 h-4" />}>
            Add Customer
          </Button>
          <Button
            size="sm"
            variant="success"
            onClick={() => onOpenRecordPayment(activeCustomer?.id)}
            icon={<Wallet className="w-4 h-4" />}
          >
            Record Payment
          </Button>
        </div>
      </div>

      {/* Customer Selector Pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
        {customers.map((cust) => {
          const isSelected = cust.id === selectedCustomerId;
          return (
            <button
              key={cust.id}
              onClick={() => setSelectedCustomerId(cust.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer touch-manipulation flex items-center gap-2 border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{cust.shopName}</span>
              {cust.currentBalance > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                    isSelected ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'
                  }`}
                >
                  ₹{cust.currentBalance.toLocaleString('en-IN')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeCustomer ? (
        <div className="space-y-4 pt-2">
          {/* VISUAL LEDGER FORMULA CARD */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                  Active Customer Profile
                </span>
                <span className="text-lg font-black text-white">{activeCustomer.shopName}</span>
                <span className="text-xs text-slate-400 block font-medium flex items-center gap-1 mt-0.5">
                  <PhoneCall className="w-3 h-3 text-emerald-400" /> {activeCustomer.contactNumber} • {activeCustomer.address}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold uppercase block">Backend Current Due</span>
                <span className="text-2xl font-black text-red-400">
                  ₹{computedBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Formula Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center font-bold pt-1">
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Opening Balance</span>
                <span className="text-slate-200 text-sm font-black">₹{openingBal.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-[10px] text-amber-400 uppercase block font-semibold">+ Purchases</span>
                <span className="text-amber-300 text-sm font-black">₹{purchasesTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-[10px] text-emerald-400 uppercase block font-semibold">− Payments</span>
                <span className="text-emerald-400 text-sm font-black">₹{paymentsTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2.5 bg-emerald-950 border border-emerald-800 rounded-xl">
                <span className="text-[10px] text-emerald-300 uppercase block font-semibold">= Current Balance</span>
                <span className="text-white text-sm font-black">₹{computedBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Transaction History Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ledger Transaction History ({entries.length})
              </h3>
              {isLoadingLedger && <span className="text-[11px] text-emerald-600 font-bold animate-pulse">Syncing Backend...</span>}
            </div>

            {entries.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No transaction history recorded yet</p>
            ) : (
              <div className="space-y-2">
                {entries.map((txn) => {
                  const isPurchase = txn.type === 'purchase';
                  const isPayment = txn.type === 'payment';
                  return (
                    <div
                      key={txn.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isPurchase
                              ? 'bg-amber-100 text-amber-800'
                              : isPayment
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isPurchase ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : isPayment ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : (
                            <Wallet className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm capitalize">
                            {isPurchase ? 'Chicken Purchase' : isPayment ? 'Payment Received' : 'Opening Balance'}
                          </div>
                          <div className="text-slate-500 font-medium">
                            {isPurchase
                              ? `${txn.quantityKg} kg × ₹${txn.pricePerKg}/kg • ${txn.notes || ''}`
                              : isPayment
                              ? `Method: ${txn.paymentMethod || 'UPI/Cash'} • ${txn.notes || ''}`
                              : txn.notes || 'Opening Balance B/F'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-black text-sm ${
                            isPurchase ? 'text-amber-700' : isPayment ? 'text-emerald-700' : 'text-slate-700'
                          }`}
                        >
                          {isPurchase
                            ? `+ ₹${txn.amount.toLocaleString('en-IN')}`
                            : isPayment
                            ? `- ₹${txn.amount.toLocaleString('en-IN')}`
                            : `₹${txn.amount.toLocaleString('en-IN')}`}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Running: ₹{txn.newBalance?.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 text-xs">
          No customer accounts found in database. Add a customer to view ledger history.
        </div>
      )}
    </Card>
  );
};
