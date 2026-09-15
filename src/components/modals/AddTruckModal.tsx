'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface AddTruckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTruck: (truckData: any) => Promise<void> | void;
}

export const AddTruckModal: React.FC<AddTruckModalProps> = ({ isOpen, onClose, onAddTruck }) => {
  const [truckName, setTruckName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await onAddTruck({
        name: truckName,
        regNumber,
      });

      setTruckName('');
      setRegNumber('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register truck on backend.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🚚 Add New Distribution Truck" subtitle="Register a new vehicle into the distribution fleet">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-in fade-in">
            ⚠️ {errorMsg}
          </div>
        )}

        <Input
          label="Truck Name / Identifier"
          value={truckName}
          onChange={(e) => setTruckName(e.target.value)}
          placeholder="e.g. Truck 3"
          required
        />

        <Input
          label="Vehicle Registration Number"
          value={regNumber}
          onChange={(e) => setRegNumber(e.target.value)}
          placeholder="e.g. KA-19-EA-9900"
          required
        />

        <div className="pt-2 flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register Truck'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
