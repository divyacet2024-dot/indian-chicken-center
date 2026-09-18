'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Customer } from '@/types';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  selectedCustomerId?: string;
  onRecordPayment: (paymentData: any) => Promise<void> | void;
  onOpenAddCustomer: () => void;
}

import { SearchableCustomerSelect } from '@/components/ui/SearchableCustomerSelect';

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  customers,
  selectedCustomerId,
  onRecordPayment,
  onOpenAddCustomer,
}) => {
  const [customerId, setCustomerId] = useState(selectedCustomerId || customers[0]?.id || '');
  const [amount, setAmount] = useState('10000');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('Payment received by Umarabba');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCustomerId) {
      setCustomerId(selectedCustomerId);
    } else if (customers.length > 0 && !customerId) {
      setCustomerId(customers[0].id);
    }
  }, [selectedCustomerId, customers, customerId]);

  const selectedCustomer = customers.find((c) => c.id === customerId) || customers[0];
  const currentDue = selectedCustomer ? selectedCustomer.currentBalance : 0;
  const payAmt = parseFloat(amount) || 0;
  const remainingDue = Math.max(0, currentDue - payAmt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setErrorMsg('Please select a customer.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      await onRecordPayment({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.customerName,
        shopName: selectedCustomer.shopName,
        amount: payAmt,
        paymentMethod,
        notes,
        previousBalance: currentDue,
        newBalance: remainingDue,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record payment on backend.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💰 Record Customer Payment" subtitle="Receive full or partial payment & update balance">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-in fade-in">
            ⚠️ {errorMsg}
          </div>
        )}

        <SearchableCustomerSelect
          customers={customers}
          value={customerId}
          onChange={setCustomerId}
          label="Select Customer"
          onOpenAddCustomer={() => {
            onClose();
            onOpenAddCustomer();
          }}
        />

        {/* Customer Balance Banner */}
        <div className="p-3.5 bg-slate-100 rounded-xl flex items-center justify-between text-sm">
          <div>
            <div className="text-slate-500 font-semibold">Current Balance Due:</div>
            <div className="text-lg font-bold text-red-600">₹{currentDue.toLocaleString('en-IN')}</div>
          </div>
          <button
            type="button"
            onClick={() => setAmount(currentDue.toString())}
            className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 active:scale-95 touch-manipulation"
          >
            Pay Full Amount
          </button>
        </div>

        <Input
          label="Amount Received (₹)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 5000"
          min="0.01"
          step="0.01"
          required
        />

        <Select
          label="Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          options={[
            { value: 'UPI', label: '📱 UPI / GPay / PhonePe' },
            { value: 'cash', label: '💵 Hard Cash' },
            { value: 'bank', label: '🏦 Bank Transfer / NEFT' },
            { value: 'cheque', label: '📜 Cheque' },
            { value: 'other', label: '🌐 Other' },
          ]}
        />

        <Input
          label="Notes / Reference"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Received cash at store"
        />

        {/* Calculation Summary */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900 flex items-center justify-between font-bold">
          <div>
            <div className="text-xs text-slate-500 font-medium">New Remaining Balance:</div>
            <div className="text-xl text-emerald-700">₹{remainingDue.toLocaleString('en-IN')}</div>
          </div>
          <span className="text-xs bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-md">
            {remainingDue === 0 ? 'Fully Cleared 🎉' : 'Partial Payment'}
          </span>
        </div>

        <div className="pt-2 flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="success" fullWidth disabled={isLoading}>
            {isLoading ? 'Recording Payment...' : 'Save Payment Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
