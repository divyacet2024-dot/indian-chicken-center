'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Truck, Trip, ExpenseCategory } from '@/types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  trucks: Truck[];
  trips?: Trip[];
  onAddExpense: (expenseData: any) => Promise<void> | void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  trucks,
  trips = [],
  onAddExpense,
}) => {
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const activeTrips = trips.filter((t) => t.status === 'active');
  const [tripId, setTripId] = useState(activeTrips[0]?.id || trips[0]?.id || '');
  const [truckId, setTruckId] = useState(trucks[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [litres, setLitres] = useState('');
  const [pricePerLitre, setPricePerLitre] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (trips.length > 0 && !tripId) {
      const active = trips.find((t) => t.status === 'active') || trips[0];
      setTripId(active.id);
    }
    if (trucks.length > 0 && !truckId) {
      setTruckId(trucks[0].id);
    }
  }, [trips, trucks, tripId, truckId, isOpen]);

  const calculatedFuelCost = (parseFloat(litres) || 0) * (parseFloat(pricePerLitre) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const selectedTrip = trips.find((t) => t.id === tripId);
      const selectedTruck = trucks.find((t) => t.id === (selectedTrip?.truckId || truckId));

      await onAddExpense({
        tripId: tripId || selectedTrip?.id,
        truckId: selectedTruck?.id || truckId,
        category,
        amount: category === 'fuel' ? calculatedFuelCost : parseFloat(amount) || 0,
        quantity: category === 'fuel' ? parseFloat(litres) || 0 : undefined,
        unitPrice: category === 'fuel' ? parseFloat(pricePerLitre) || 0 : undefined,
        description: notes,
      });

      setAmount('');
      setNotes('');
      setLitres('');
      setPricePerLitre('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record expense on backend.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💸 Record Trip Expense" subtitle="Track fuel, labour, maintenance, food and other expenses">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-in fade-in">
            ⚠️ {errorMsg}
          </div>
        )}

        <Select
          label="Expense Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          options={[
            { value: 'fuel', label: '⛽ Fuel / Diesel' },
            { value: 'labour', label: '👷 Driver Labour / Helper Bata' },
            { value: 'maintenance', label: '🔧 Vehicle Maintenance' },
            { value: 'food', label: '🍲 Food & Refreshments' },
            { value: 'other', label: '🧾 Other / Toll Charges' },
          ]}
        />

        {trips.length > 0 ? (
          <Select
            label="Select Active Trip"
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
            options={trips.map((t) => ({
              value: t.id,
              label: `${t.startLocation} → ${t.destination}`,
            }))}
          />
        ) : (
          <Select
            label="Select Truck"
            value={truckId}
            onChange={(e) => setTruckId(e.target.value)}
            options={trucks.map((t) => ({
              value: t.id,
              label: `${t.name} (${t.regNumber})`,
            }))}
          />
        )}

        {category === 'fuel' ? (
          <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Fuel Details (Diesel)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Litres Filled (L)"
                type="number"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                placeholder="e.g. 40"
                min="0.1"
                step="0.1"
                required
              />
              <Input
                label="Rate per Litre (₹)"
                type="number"
                value={pricePerLitre}
                onChange={(e) => setPricePerLitre(e.target.value)}
                placeholder="e.g. 94"
                min="0.1"
                step="0.01"
                required
              />
            </div>
          </div>
        ) : (
          <Input
            label="Total Expense Amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1200"
            min="0.01"
            step="0.01"
            required
          />
        )}

        <Input
          label="Description / Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Highway HP bunk diesel / Helper bata"
          required
        />

        {/* Amount summary */}
        <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl text-slate-900 flex items-center justify-between font-bold">
          <div>
            <div className="text-xs text-slate-500 font-medium">Backend Calculated Expense:</div>
            <div className="text-xl text-slate-800">
              ₹{(category === 'fuel' ? calculatedFuelCost : parseFloat(amount) || 0).toLocaleString('en-IN')}
            </div>
          </div>
          {category === 'fuel' && parseFloat(litres) > 0 && parseFloat(pricePerLitre) > 0 && (
            <span className="text-xs bg-slate-200 text-slate-800 px-2.5 py-1 rounded-md">
              {litres} L @ ₹{pricePerLitre}/L
            </span>
          )}
        </div>

        <div className="pt-2 flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="secondary" fullWidth disabled={isLoading}>
            {isLoading ? 'Saving Expense...' : 'Save Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
