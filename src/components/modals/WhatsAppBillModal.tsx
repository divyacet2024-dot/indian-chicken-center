'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Order, Customer } from '@/types';
import { Share2, ExternalLink, Copy, AlertTriangle } from 'lucide-react';

interface WhatsAppBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  customer?: Customer;
}

export const WhatsAppBillModal: React.FC<WhatsAppBillModalProps> = ({ isOpen, onClose, order, customer }) => {
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!order) return null;

  // Backend Ledger math formula:
  // Current Balance = Opening Balance + Total Purchases - Total Payments
  const currentPurchase = order.totalAmount;
  const paidAmount = order.paidAmount || 0;
  const currentBalance = customer ? customer.currentBalance : currentPurchase;
  const previousBalance = Math.max(0, currentBalance - currentPurchase + paidAmount);
  const totalBalanceDue = currentBalance;

  const contactNumber = customer?.contactNumber || '';

  // Clean Indian phone number for WhatsApp deep link
  const getWhatsAppPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length > 10) return digits;
    return '';
  };

  const whatsappPhone = getWhatsAppPhone(contactNumber);

  // Construct structured WhatsApp bill message text.
  // DEPLOYMENT NOTE: The business letterhead below (Proprietor name + phone) is the
  // OWNER'S printed business contact — it appears on the invoice header exactly as it
  // would on a printed bill. It is NOT used as the WhatsApp recipient.
  // The WhatsApp recipient is always `whatsappPhone` derived from `customer.contactNumber`.
  // TODO (post-deployment): load owner name & phone from the business profile API
  // so this letterhead is configurable without a code change.
  const messageText = `🐔 *INDIAN CHICKEN CENTER* 🐔
Wholesale Fresh Chicken Distribution
Proprietor: Umarabba | Mob: +91 98450 99887
----------------------------------------
*CUSTOMER INVOICE BILL*
Invoice No: ${order.orderNumber}
Date: ${order.createdAt}
Shop / Customer: ${order.shopName} (${order.customerName})
Contact: ${contactNumber || 'N/A'}

*Item Details:*
• Fresh Chicken: ${order.quantityKg} kg × ₹${order.pricePerKg}/kg
• Today's Purchase Total: ₹${order.totalAmount.toLocaleString('en-IN')}

*Ledger Summary:*
• Previous Balance: ₹${previousBalance.toLocaleString('en-IN')}
• Payment Received Today: ₹${paidAmount.toLocaleString('en-IN')}
• *Current Balance Due: ₹${totalBalanceDue.toLocaleString('en-IN')}*

Thank you for doing business with Indian Chicken Center!`;

  const handleShareWhatsApp = () => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!whatsappPhone) {
      setErrorMessage('⚠️ Customer phone number is missing or invalid. Please enter a valid 10-digit contact number in customer settings.');
      return;
    }

    try {
      const encodedMsg = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodedMsg}`;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(messageText).catch(() => {});
      }

      const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      if (win) {
        setStatusMessage('✅ WhatsApp window opened with bill invoice!');
      } else {
        setStatusMessage('📋 Bill text copied to clipboard! (Allow pop-ups to open WhatsApp directly).');
      }
    } catch (err) {
      setErrorMessage('Could not launch WhatsApp link.');
    }
  };

  const handleCopyText = () => {
    setErrorMessage(null);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(messageText);
      setCopied(true);
      setStatusMessage('📋 Invoice text copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🧾 Customer Bill & Invoice" subtitle="Generate & Share Invoice with Buyer">
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Printable Bill Preview Card */}
        <div id="invoice-preview" className="p-4 sm:p-5 bg-emerald-50/40 border-2 border-emerald-200 rounded-2xl text-slate-900 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-emerald-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🐔</span>
                <h3 className="text-base sm:text-lg font-black text-emerald-950 uppercase tracking-tight">Indian Chicken Center</h3>
              </div>
              <p className="text-xs text-slate-600 font-semibold">Wholesale Fresh Chicken Distribution</p>
              <p className="text-xs text-slate-500 font-medium">Proprietor: Umarabba | Mob: +91 98450 99887</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-emerald-600 text-white font-bold text-xs rounded-lg">
                INVOICE
              </span>
              <p className="text-xs font-bold text-slate-700 mt-1">{order.orderNumber}</p>
              <p className="text-[11px] text-slate-500">{order.createdAt}</p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-white border border-slate-200 rounded-xl">
            <div>
              <span className="text-slate-400 font-bold uppercase block text-[10px]">Customer / Shop</span>
              <span className="font-bold text-slate-900 text-sm block">{order.shopName}</span>
              <span className="text-slate-600">{order.customerName} ({contactNumber || 'No Contact Number'})</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase block text-[10px]">Assigned Delivery</span>
              <span className="font-bold text-slate-800 text-sm block">{order.assignedTruckName || 'Distribution Fleet'}</span>
              <span className="text-slate-500">Route Delivery</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="grid grid-cols-12 bg-slate-100 p-2.5 font-bold text-slate-700 border-b border-slate-200">
              <div className="col-span-6">Item Description</div>
              <div className="col-span-2 text-right">Qty (kg)</div>
              <div className="col-span-2 text-right">Rate/kg</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            <div className="grid grid-cols-12 p-3 font-semibold text-slate-900 items-center">
              <div className="col-span-6">Fresh Broiler Chicken (Whole)</div>
              <div className="col-span-2 text-right">{order.quantityKg} kg</div>
              <div className="col-span-2 text-right">₹{order.pricePerKg}</div>
              <div className="col-span-2 text-right font-bold">₹{order.totalAmount.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Ledger Math */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Today's Purchase Amount:</span>
              <span className="font-bold text-slate-900">₹{order.totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Previous Balance Brought Forward:</span>
              <span className="font-bold text-slate-800">₹{previousBalance.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Amount Paid Today:</span>
              <span className="font-bold text-emerald-700">- ₹{paidAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
              <span>Current Balance Due:</span>
              <span className="text-base text-red-600">₹{totalBalanceDue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold rounded-xl text-center text-xs animate-in fade-in">
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            icon={<Copy className="w-4 h-4" />}
            onClick={handleCopyText}
            className="touch-manipulation min-h-[44px]"
          >
            {copied ? 'Copied!' : 'Copy Bill Text'}
          </Button>

          <Button
            type="button"
            variant="success"
            icon={<ExternalLink className="w-4 h-4" />}
            onClick={handleShareWhatsApp}
            className="touch-manipulation min-h-[44px]"
          >
            Send via WhatsApp 💬
          </Button>
        </div>
      </div>
    </Modal>
  );
};
