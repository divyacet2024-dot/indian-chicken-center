'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Customer, Truck, Trip } from '@/types';

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  trucks: Truck[];
  trips?: Trip[];
  onAddOrder: (orderData: any) => Promise<void> | void;
  onOpenAddCustomer: () => void;
}

import { SearchableCustomerSelect } from '@/components/ui/SearchableCustomerSelect';

export const AddOrderModal: React.FC<AddOrderModalProps> = ({
  isOpen,
  onClose,
  customers,
  trucks,
  trips = [],
  onAddOrder,
  onOpenAddCustomer,
}) => {
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const activeTrips = trips.filter((t) => t.status === 'active');
  const [tripId, setTripId] = useState(activeTrips[0]?.id || trips[0]?.id || '');
  const [assignedTruckId, setAssignedTruckId] = useState(trucks[0]?.id || '');
  const [quantityKg, setQuantityKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (customers.length > 0 && !customerId) {
      setCustomerId(customers[0].id);
    }
    if (trips.length > 0 && !tripId) {
      const active = trips.find((t) => t.status === 'active') || trips[0];
      setTripId(active.id);
    }
  }, [customers, trips, customerId, tripId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setErrorMsg('Please select a customer.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const selectedCust = customers.find((c) => c.id === customerId);
      const selectedTrip = trips.find((t) => t.id === tripId);
      const selectedTruck = trucks.find((t) => t.id === (selectedTrip?.truckId || assignedTruckId));

      const qty = parseFloat(quantityKg) || 0;
      const rate = parseFloat(pricePerKg) || 0;

      await onAddOrder({
        customerId,
        customerName: selectedCust ? selectedCust.customerName : 'Walk-in Customer',
        shopName: selectedCust ? selectedCust.shopName : 'Local Store',
        tripId: tripId || selectedTrip?.id,
        quantityKg: qty,
        pricePerKg: rate,
        notes,
        assignedTruckId: selectedTruck?.id || assignedTruckId,
        assignedTruckName: selectedTruck ? selectedTruck.name : 'Truck 1',
      });

      setQuantityKg('');
      setPricePerKg('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order on backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const qty = parseFloat(quantityKg) || 0;
  const rate = parseFloat(pricePerKg) || 0;
  const estimatedTotal = qty * rate;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🛍️ Create Customer Order" subtitle="Record new road order while trip is active">
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
          label="Select Customer / Shop"
          onOpenAddCustomer={() => {
            onClose();
            onOpenAddCustomer();
          }}
        />

        {trips.length > 0 ? (
          <Select
            label="Select Active Trip / Route"
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
            options={trips.map((t) => ({
              value: t.id,
              label: `${t.startLocation} → ${t.destination} (${t.loadedQuantityKg} kg loaded)`,
            }))}
          />
        ) : (
          <Select
            label="Assign to Truck"
            value={assignedTruckId}
            onChange={(e) => setAssignedTruckId(e.target.value)}
            options={trucks.map((t) => ({
              value: t.id,
              label: `${t.name} (${t.regNumber})`,
            }))}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Chicken Quantity (in kg)"
            type="number"
            value={quantityKg}
            onChange={(e) => setQuantityKg(e.target.value)}
            placeholder="e.g. 150"
            min="0.1"
            step="0.1"
            required
          />
          <Input
            label="Selling Price (₹ per kg)"
            type="number"
            value={pricePerKg}
            onChange={(e) => setPricePerKg(e.target.value)}
            placeholder="e.g. 135"
            min="0.1"
            step="0.01"
            required
          />
        </div>

        <Input
          label="Order Notes / Delivery Instructions"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Deliver before 11:00 AM"
        />

        {/* Live Calculation Banner */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center justify-between font-bold">
          <div>
            <div className="text-xs text-slate-500 font-medium">Backend Calculated Total:</div>
            <div className="text-xl text-emerald-700">₹{estimatedTotal.toLocaleString('en-IN')}</div>
          </div>
          <span className="text-xs bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-md">
            {qty} kg @ ₹{rate}/kg
          </span>
        </div>

        <div className="pt-2 flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
            {isLoading ? 'Creating Order...' : 'Save Customer Order'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
