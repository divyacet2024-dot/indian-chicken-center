'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Truck } from '@/types';

interface StartTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trucks: Truck[];
  onStartTrip: (tripData: any) => Promise<void> | void;
  initialData?: Partial<{
    truckId: string;
    startLocation: string;
    destination: string;
    loadedKg: number;
    pricePerKg: number;
    loadingLocation: string;
  }>;
}

export const StartTripModal: React.FC<StartTripModalProps> = ({ isOpen, onClose, trucks, onStartTrip, initialData }) => {
  const [truckId, setTruckId] = useState(trucks[0]?.id || '');
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [loadedKg, setLoadedKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [loadingLocation, setLoadingLocation] = useState('');
  const [fuelLitres, setFuelLitres] = useState('');
  const [fuelRate, setFuelRate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialData) {
      if (initialData.truckId) setTruckId(initialData.truckId);
      if (initialData.startLocation) setStartLocation(initialData.startLocation);
      if (initialData.destination) setDestination(initialData.destination);
      if (initialData.loadedKg !== undefined) setLoadedKg(String(initialData.loadedKg));
      if (initialData.pricePerKg !== undefined) setPricePerKg(String(initialData.pricePerKg));
      if (initialData.loadingLocation) setLoadingLocation(initialData.loadingLocation);
    } else if (trucks.length > 0 && !truckId) {
      const available = trucks.find((t) => t.status === 'available') || trucks[0];
      setTruckId(available.id);
    }
  }, [trucks, truckId, isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const selectedTruck = trucks.find((t) => t.id === truckId);
      const qty = parseFloat(loadedKg) || 0;
      const rate = parseFloat(pricePerKg) || 0;

      if (qty <= 0 || rate <= 0) {
        throw new Error('Please enter valid positive numbers for loaded chicken quantity and purchase price.');
      }

      const litres = parseFloat(fuelLitres) || 0;
      const fRate = parseFloat(fuelRate) || 0;

      await onStartTrip({
        truckId,
        truckName: selectedTruck ? selectedTruck.name : 'Truck',
        startLocation: startLocation || 'Yard',
        destination: destination || 'Distribution Route',
        loadingLocation: loadingLocation || startLocation || 'Loading Dock',
        loadedQuantityKg: qty,
        purchasePricePerKg: rate,
        initialFuelLitres: litres > 0 ? litres : undefined,
        initialFuelRate: fRate > 0 ? fRate : undefined,
      });

      // Reset
      setLoadedKg('');
      setPricePerKg('');
      setStartLocation('');
      setDestination('');
      setLoadingLocation('');
      setFuelLitres('');
      setFuelRate('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start trip on backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const qty = parseFloat(loadedKg) || 0;
  const rate = parseFloat(pricePerKg) || 0;
  const totalCostEstimate = qty * rate;

  const fLitres = parseFloat(fuelLitres) || 0;
  const fRate = parseFloat(fuelRate) || 0;
  const fuelCostEstimate = fLitres * fRate;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🚚 Start New Truck Trip" subtitle="Load chicken & record initial trip details">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-in fade-in">
            ⚠️ {errorMsg}
          </div>
        )}

        <Select
          label="Select Distribution Truck"
          value={truckId}
          onChange={(e) => setTruckId(e.target.value)}
          options={trucks.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.regNumber}) - Status: ${t.status.toUpperCase()}`,
          }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Starting Location"
            value={startLocation}
            onChange={(e) => setStartLocation(e.target.value)}
            placeholder="e.g. Mangalore Farm Yard"
            required
          />
          <Input
            label="Destination / Route"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Bangalore Distribution"
            required
          />
        </div>

        <Input
          label="Loading Point / Yard Location"
          value={loadingLocation}
          onChange={(e) => setLoadingLocation(e.target.value)}
          placeholder="e.g. Yard Dock 1"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Chicken Loaded (in kg)"
            type="number"
            value={loadedKg}
            onChange={(e) => setLoadedKg(e.target.value)}
            placeholder="e.g. 5000"
            min="0.1"
            step="0.1"
            required
          />
          <Input
            label="Purchase Rate (₹ per kg)"
            type="number"
            value={pricePerKg}
            onChange={(e) => setPricePerKg(e.target.value)}
            placeholder="e.g. 120"
            min="0.1"
            step="0.01"
            required
          />
        </div>

        {/* Live Stock Calculation Banner */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center justify-between font-bold">
          <div>
            <div className="text-xs text-slate-500 font-medium">Backend Calculated Purchase Total:</div>
            <div className="text-xl text-emerald-700">₹{totalCostEstimate.toLocaleString('en-IN')}</div>
          </div>
          {qty > 0 && rate > 0 && (
            <span className="text-xs bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-md">
              {qty} kg × ₹{rate}/kg
            </span>
          )}
        </div>

        {/* Optional Initial Fuel Fill */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Initial Fuel Fill (Optional)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Fuel Litres (L)"
              type="number"
              value={fuelLitres}
              onChange={(e) => setFuelLitres(e.target.value)}
              placeholder="e.g. 40"
              min="0"
              step="0.1"
            />
            <Input
              label="Price per Litre (₹)"
              type="number"
              value={fuelRate}
              onChange={(e) => setFuelRate(e.target.value)}
              placeholder="e.g. 94"
              min="0"
              step="0.01"
            />
          </div>
          {fLitres > 0 && fRate > 0 && (
            <div className="text-xs text-slate-700 font-bold flex justify-between pt-1">
              <span>Fuel Fill Cost (Litres × Rate/L):</span>
              <span className="text-emerald-700">₹{fuelCostEstimate.toLocaleString('en-IN')} ({fLitres} L × ₹{fRate}/L)</span>
            </div>
          )}
        </div>

        <div className="pt-2 flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
            {isLoading ? 'Starting Trip...' : 'Start Trip & Load Stock'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
