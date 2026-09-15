'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Truck, Trip } from '@/types';

interface RecordLossModalProps {
  isOpen: boolean;
  onClose: () => void;
  trucks: Truck[];
  trips?: Trip[];
  onRecordLoss: (lossData: any) => Promise<void> | void;
}

export const RecordLossModal: React.FC<RecordLossModalProps> = ({
  isOpen,
  onClose,
  trucks,
  trips = [],
  onRecordLoss,
}) => {
  const activeTrips = trips.filter((t) => t.status === 'active');
  const [tripId, setTripId] = useState(activeTrips[0]?.id || trips[0]?.id || '');
  const [truckId, setTruckId] = useState(trucks[0]?.id || '');
  const [quantityKg, setQuantityKg] = useState('');
  const [reason, setReason] = useState('transit_loss');
  const [notes, setNotes] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const selectedTrip = trips.find((t) => t.id === tripId);
      const selectedTruck = trucks.find((t) => t.id === (selectedTrip?.truckId || truckId));
      const qty = parseFloat(quantityKg) || 0;

      await onRecordLoss({
        tripId: tripId || selectedTrip?.id,
        truckId: selectedTruck?.id || truckId,
        truckName: selectedTruck ? selectedTruck.name : 'Truck 1',
        quantityKg: qty,
        reason,
        notes,
      });

      setQuantityKg('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record chicken loss on backend.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚠️ Record Chicken Loss (Wastage)" subtitle="Track dead or lost chicken during transportation">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-in fade-in">
            ⚠️ {errorMsg}
          </div>
        )}

        {trips.length > 0 ? (
          <Select
            label="Select Active Trip"
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
            options={trips.map((t) => ({
              value: t.id,
              label: `${t.startLocation} → ${t.destination} (${t.remainingQuantityKg} kg remaining)`,
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

        <Input
          label="Wastage Weight (in kg)"
          type="number"
          value={quantityKg}
          onChange={(e) => setQuantityKg(e.target.value)}
          placeholder="e.g. 15.5"
          min="0.1"
          step="0.1"
          required
        />

        <Select
          label="Wastage Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          options={[
            { value: 'transit_loss', label: '🚚 Transportation Loss / Heat Mortality' },
            { value: 'dead_chicken', label: '🐔 Dead Chicken on Arrival' },
            { value: 'damaged_stock', label: '⚠️ Damaged Stock' },
            { value: 'other', label: '🌐 Other Reason' },
          ]}
        />

        <Input
          label="Notes / Explanation"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Heat mortality during transit on highway"
        />

        <div className="pt-2 flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" fullWidth disabled={isLoading}>
            {isLoading ? 'Recording Loss...' : 'Save Chicken Loss'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
