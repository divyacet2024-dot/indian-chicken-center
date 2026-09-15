'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomer: (customerData: any) => Promise<void> | void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onAddCustomer }) => {
  const [shopName, setShopName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await onAddCustomer({
        shopName,
        customerName,
        contactNumber,
        address,
        openingBalance: parseFloat(openingBalance) || 0,
      });

      // Reset
      setShopName('');
      setCustomerName('');
      setContactNumber('');
      setAddress('');
      setOpeningBalance('0');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create customer account on backend.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="👥 Add New Customer" subtitle="Create account ledger for new wholesale buyer">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-in fade-in">
            ⚠️ {errorMsg}
          </div>
        )}

        <Input
          label="Shop / Business Name"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="e.g. Empire Restaurant"
          required
        />

        <Input
          label="Contact Person Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g. Mohammed Ibrahim"
          required
        />

        <Input
          label="Phone Number"
          type="tel"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          placeholder="e.g. +91 98450 12345"
          required
        />

        <Input
          label="Shop Address / Location"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. Main Road, Moodabidri"
          required
        />

        <Input
          label="Opening Balance Due (₹)"
          type="number"
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
          placeholder="0 if fresh account"
          min="0"
          step="0.01"
        />

        <div className="pt-2 flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Customer Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
