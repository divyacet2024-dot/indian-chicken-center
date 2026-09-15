'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { TruckStatusBadge } from '@/components/ui/Badge';
import { Truck, Trip } from '@/types';
import { Button } from '@/components/ui/Button';
import { MapPin, AlertTriangle, Plus, Navigation } from 'lucide-react';
import { UpdateLocationModal } from '@/components/modals/UpdateLocationModal';

interface ActiveTrucksCardProps {
  trucks: Truck[];
  trips: Trip[];
  onStartTripForTruck: (truckId: string) => void;
  onOpenRecordLoss: () => void;
  onOpenAddTruck: () => void;
  onRefreshTrips?: () => void;
  onOpenCreateOrderForCustomer?: (customer: { id: string; shopName: string; tripId: string }) => void;
}

export const ActiveTrucksCard: React.FC<ActiveTrucksCardProps> = ({
  trucks,
  trips,
  onStartTripForTruck,
  onOpenRecordLoss,
  onOpenAddTruck,
  onRefreshTrips,
  onOpenCreateOrderForCustomer,
}) => {
  const [selectedTripForLocation, setSelectedTripForLocation] = useState<{
    tripId: string;
    truckName: string;
    currentStatus: string;
  } | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">🚚 Distribution Trucks ({trucks.length})</h2>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {trucks.filter((t) => t.status === 'on_trip').length} On Road
          </span>
        </div>

        <Button size="sm" variant="outline" onClick={onOpenAddTruck} icon={<Plus className="w-4 h-4" />}>
          Add Truck
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trucks.map((truck) => {
          const activeTrip = trips.find((t) => t.truckId === truck.id && (t.status === 'active' || t.status === 'distributing' || t.status === 'returning' || t.status === 'stopped_delayed'));
          const loadedKg = activeTrip ? activeTrip.loadedQuantityKg : truck.loadedKg;
          const remainingKg = activeTrip ? activeTrip.remainingQuantityKg : truck.loadedKg;
          const deliveredKg = activeTrip ? activeTrip.deliveredQuantityKg : 0;
          const wastageKg = activeTrip ? activeTrip.wastageQuantityKg : 0;
          const purchaseTotal = activeTrip ? activeTrip.loadedTotalCost : 0;
          const ratePerKg = activeTrip ? activeTrip.purchasePricePerKg : 0;

          const percentageRemaining = loadedKg > 0 ? Math.round((remainingKg / loadedKg) * 100) : 0;

          return (
            <Card key={truck.id} className="border-slate-200 hover:border-emerald-300">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{truck.name}</h3>
                    <TruckStatusBadge status={truck.status} />
                  </div>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">Reg: {truck.regNumber}</p>
                </div>
                {activeTrip && (
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">Stock Load Value</div>
                    <div className="text-sm font-black text-emerald-700">
                      ₹{purchaseTotal.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>

              {/* Route */}
              <div className="py-2.5 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 border-b border-slate-100">
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    {activeTrip ? `${activeTrip.startLocation} → ${activeTrip.destination}` : 'Yard Stock (Ready)'}
                  </span>
                </div>
                {activeTrip && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase shrink-0">
                    {activeTrip.status.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Stock Progress & Metrics */}
              <div className="py-3 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-500">
                    {ratePerKg > 0 ? `Chicken Stock (@ ₹${ratePerKg}/kg):` : 'Chicken Stock:'}
                  </span>
                  <span className="text-slate-900 font-extrabold text-sm">
                    {remainingKg.toLocaleString('en-IN')} kg / {loadedKg.toLocaleString('en-IN')} kg
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-3 transition-all duration-500"
                    style={{ width: `${percentageRemaining}%` }}
                    title={`${percentageRemaining}% stock remaining`}
                  />
                  <div
                    className="bg-red-400 h-3 transition-all duration-500"
                    style={{ width: `${loadedKg > 0 ? (wastageKg / loadedKg) * 100 : 0}%` }}
                    title="Wastage loss"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 text-xs">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <div className="text-[10px] text-emerald-800 font-bold uppercase">Delivered</div>
                    <div className="font-extrabold text-emerald-700 text-sm">{deliveredKg} kg</div>
                  </div>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <div className="text-[10px] text-red-800 font-bold uppercase">Loss / Dead</div>
                    <div className="font-extrabold text-red-700 text-sm">{wastageKg} kg</div>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <div className="text-[10px] text-slate-600 font-bold uppercase">Remaining</div>
                    <div className="font-extrabold text-slate-900 text-sm">{remainingKg} kg</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                {truck.status === 'available' ? (
                  <Button
                    size="sm"
                    variant="primary"
                    fullWidth
                    onClick={() => onStartTripForTruck(truck.id)}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Start Trip & Load Stock
                  </Button>
                ) : (
                  <>
                    {activeTrip && (
                      <Button
                        size="sm"
                        variant="primary"
                        fullWidth
                        onClick={() =>
                          setSelectedTripForLocation({
                            tripId: activeTrip.id,
                            truckName: truck.name,
                            currentStatus: activeTrip.status,
                          })
                        }
                        icon={<Navigation className="w-3.5 h-3.5" />}
                      >
                        Find Buyers & Location
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onOpenRecordLoss}
                      icon={<AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                    >
                      Loss
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <UpdateLocationModal
        isOpen={selectedTripForLocation !== null}
        onClose={() => setSelectedTripForLocation(null)}
        tripId={selectedTripForLocation?.tripId || null}
        truckName={selectedTripForLocation?.truckName}
        currentStatus={selectedTripForLocation?.currentStatus}
        onLocationUpdated={onRefreshTrips}
        onOpenCreateOrderForCustomer={onOpenCreateOrderForCustomer}
      />
    </div>
  );
};
