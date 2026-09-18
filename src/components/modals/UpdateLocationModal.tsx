'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { MapPin, Navigation, Compass, AlertCircle, CheckCircle2, ShoppingBag, Phone, Store, Plus, ExternalLink } from 'lucide-react';
import { ApiClient } from '@/services/apiClient';

interface UpdateLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string | null;
  truckName?: string;
  currentStatus?: string;
  onLocationUpdated?: () => void;
  onOpenCreateOrderForCustomer?: (customer: { id: string; shopName: string; tripId: string }) => void;
}

export const UpdateLocationModal: React.FC<UpdateLocationModalProps> = ({
  isOpen,
  onClose,
  tripId,
  truckName = 'Truck',
  currentStatus = 'active',
  onLocationUpdated,
  onOpenCreateOrderForCustomer,
}) => {
  const [activeTab, setActiveTab] = useState<'location' | 'buyers' | 'add_buyer'>('location');

  
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');
  const [tripStatus, setTripStatus] = useState<string>(currentStatus);

  // New Potential Buyer Form State
  const [newShopName, setNewShopName] = useState('');
  const [newBusinessType, setNewBusinessType] = useState('chicken_shop');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [nearbyOrders, setNearbyOrders] = useState<any[]>([]);
  const [nearbyBuyers, setNearbyBuyers] = useState<any[]>([]);
  const [isLoadingBuyers, setIsLoadingBuyers] = useState(false);
  const [hasLocation, setHasLocation] = useState<boolean>(true);

  useEffect(() => {
    if (currentStatus) {
      setTripStatus(currentStatus);
    }
  }, [currentStatus]);

  const fetchNearbyData = async () => {
    if (!tripId) return;
    setIsLoadingBuyers(true);
    try {
      try {
        await ApiClient.getLatestTripLocation(tripId);
        setHasLocation(true);
      } catch (err: any) {
        if (err.status === 404 || err.status === 400) {
          setHasLocation(false);
          setNearbyOrders([]);
          setNearbyBuyers([]);
          setIsLoadingBuyers(false);
          return;
        }
      }

      const [orders, buyers] = await Promise.all([
        ApiClient.getNearbyPendingOrders(tripId, 150).catch(() => []),
        ApiClient.getNearbyBusinessesNearTrip(tripId, 100).catch(() => []),
      ]);
      setNearbyOrders(orders);
      setNearbyBuyers(buyers);
    } catch (err) {
      setNearbyOrders([]);
      setNearbyBuyers([]);
    } finally {
      setIsLoadingBuyers(false);
    }
  };

  useEffect(() => {
    if (isOpen && tripId) {
      fetchNearbyData();
    }
  }, [isOpen, tripId]);

  const setPresetLocation = (lat: string, lng: string, name: string) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocationName(name);
  };

  const handleGetCurrentLocation = () => {
  setError(null);
  setSuccessMsg(null);

  if (!navigator.geolocation) {
    setError('GPS location is not supported on this device.');
    return;
  }

  setIsLoading(true);

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toString();
      const lng = position.coords.longitude.toString();

      setLatitude(lat);
      setLongitude(lng);
      setLocationName('Current GPS Location');

      setSuccessMsg('📍 Current truck location detected successfully!');
      setIsLoading(false);
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        setError('Location permission denied. Please allow GPS access.');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setError('Current location is unavailable.');
      } else if (error.code === error.TIMEOUT) {
        setError('GPS request timed out. Please try again.');
      } else {
        setError('Unable to get current location.');
      }

      setIsLoading(false);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );
};
  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId) return;

    setError(null);
    setSuccessMsg(null);

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be a valid number between -90 and 90');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be a valid number between -180 and 180');
      return;
    }

    setIsLoading(true);

    try {
      await ApiClient.recordTripLocation(tripId, {
        latitude: lat,
        longitude: lng,
        locationName,
        status: tripStatus,
      });

      setSuccessMsg('✅ Truck GPS location & status recorded!');
      if (onLocationUpdated) onLocationUpdated();
      fetchNearbyData();
    } catch (err: any) {
      setError(err.message || 'Could not record truck location');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBuyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Please record valid latitude and longitude first.');
      return;
    }

    setIsLoading(true);

    try {
      await ApiClient.createNearbyBusiness({
        shopName: newShopName,
        businessType: newBusinessType,
        contactNumber: newContactNumber,
        address: newAddress,
        latitude: lat,
        longitude: lng,
        notes: newNotes,
      });

      setSuccessMsg(`✅ Added potential buyer "${newShopName}" into database!`);
      setNewShopName('');
      setNewContactNumber('');
      setNewAddress('');
      setNewNotes('');
      setActiveTab('buyers');
      fetchNearbyData();
    } catch (err: any) {
      setError(err.message || 'Could not add potential buyer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertToCustomerAndOrder = async (buyer: any) => {
    if (!tripId) return;
    try {
      // 1. Create or get Customer record in backend
      const cust = await ApiClient.createCustomer({
        shopName: buyer.shop_name,
        customerName: buyer.shop_name,
        contactNumber: buyer.contact_number,
        address: buyer.address || 'Nearby Route Customer',
        openingBalance: 0,
        latitude: buyer.latitude,
        longitude: buyer.longitude,
      }).catch(async () => {
        // If customer already exists, fetch list and match
        const list = await ApiClient.getCustomers();
        return list.find((c) => c.contactNumber === buyer.contact_number || c.shopName === buyer.shop_name) || list[0];
      });

      onClose();
      if (onOpenCreateOrderForCustomer) {
        onOpenCreateOrderForCustomer({
          id: cust.id,
          shopName: cust.shopName,
          tripId: tripId,
        });
      }
    } catch (err: any) {
      alert(`⚠️ Could not prepare order: ${err.message}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`📍 Truck GPS & Nearby Buyers: ${truckName}`} subtitle="Manage truck location & sell leftover stock to nearby buyers">
      <div className="space-y-4 text-xs">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 font-bold text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('location')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'location' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📍 GPS Location & Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('buyers')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'buyers' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🍗 Potential Buyers ({nearbyBuyers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('add_buyer')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'add_buyer' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ➕ Add Buyer
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: GPS LOCATION UPDATE */}
        {activeTab === 'location' && (
          <div className="space-y-4">
            {/* Quick Testing Location Presets */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-emerald-600" /> Quick Location Presets
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPresetLocation('12.9716', '77.5946', 'Bangalore Central Depot')}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  📍 Bangalore (12.97, 77.59)
                </button>
                <button
                  type="button"
                  onClick={() => setPresetLocation('13.0072', '76.1010', 'Hassan Highway Junction')}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  📍 Hassan (13.00, 76.10)
                </button>
                <button
                  type="button"
                  onClick={() => setPresetLocation('12.9141', '74.8560', 'Mangalore Yard')}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  📍 Mangalore (12.91, 74.85)
                </button>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={handleGetCurrentLocation}
              icon={<MapPin className="w-4 h-4" />}
            >
              Use My Current Location
            </Button>
            <form onSubmit={handleLocationSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Location Description</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Bangalore Highway Toll Plaza"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Trip Operational Status</label>
                <select
                  value={tripStatus}
                  onChange={(e) => setTripStatus(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="active">Active (On Road)</option>
                  <option value="distributing">Distributing Chicken</option>
                  <option value="returning">Returning Empty / Leftover Stock</option>
                  <option value="stopped_delayed">Stopped / Delayed</option>
                  <option value="completed">Completed Trip</option>
                </select>
              </div>

              <Button type="submit" variant="primary" fullWidth isLoading={isLoading} icon={<Navigation className="w-4 h-4" />}>
                Record Current GPS Location
              </Button>
            </form>
          </div>
        )}

        {/* TAB 2: POTENTIAL NEARBY BUYERS */}
        {activeTab === 'buyers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-600" /> Nearby Potential Chicken Buyers ({nearbyBuyers.length})
              </span>
              {isLoadingBuyers && <span className="text-[11px] text-emerald-600 font-bold animate-pulse">Calculating Distance...</span>}
            </div>

            {!hasLocation ? (
              <div className="py-6 text-center text-slate-500 space-y-2 font-semibold bg-slate-50 border border-slate-200 rounded-xl">
                <p>Location unavailable — start GPS sharing for this trip to find nearby orders/businesses.</p>
                <Button size="sm" variant="outline" onClick={() => setActiveTab('location')} icon={<MapPin className="w-4 h-4" />}>
                  Go to Location Tab
                </Button>
              </div>
            ) : nearbyBuyers.length === 0 ? (
              <div className="py-6 text-center text-slate-400 space-y-2">
                <p>No potential buyers registered within 100 km of current truck location ({latitude}, {longitude}).</p>
                <Button size="sm" variant="outline" onClick={() => setActiveTab('add_buyer')} icon={<Plus className="w-4 h-4" />}>
                  Add Potential Buyer
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                {nearbyBuyers.map((b) => (
                  <div key={b.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{b.shop_name}</span>
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">
                            {b.business_type.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-slate-600 text-xs block font-semibold mt-0.5">
                          📞 {b.contact_number} • {b.address || 'Address registered'}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-xs shrink-0">
                        {b.distance_km} km away
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`tel:${b.contact_number.replace(/\D/g, '')}`}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer touch-manipulation min-h-[36px]"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-700" /> Call
                      </a>

                      <a
                        href={`https://wa.me/91${b.contact_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${b.shop_name}, Indian Chicken Center truck is returning nearby with fresh wholesale chicken. Interested in stock?`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer touch-manipulation min-h-[36px]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> WhatsApp 💬
                      </a>

                      <button
                        type="button"
                        onClick={() => handleConvertToCustomerAndOrder(b)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer touch-manipulation min-h-[36px] ml-auto"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-400" /> Create Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADD NEW POTENTIAL BUYER */}
        {activeTab === 'add_buyer' && (
          <form onSubmit={handleAddBuyerSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Shop / Business Name</label>
              <input
                type="text"
                value={newShopName}
                onChange={(e) => setNewShopName(e.target.value)}
                placeholder="e.g. Royal Chicken Center / Green Hotel"
                className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Business Type</label>
                <select
                  value={newBusinessType}
                  onChange={(e) => setNewBusinessType(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 outline-none"
                >
                  <option value="chicken_shop">Chicken Shop</option>
                  <option value="meat_shop">Meat Shop</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="hotel">Hotel</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Contact Number</label>
                <input
                  type="text"
                  value={newContactNumber}
                  onChange={(e) => setNewContactNumber(e.target.value)}
                  placeholder="e.g. 9845011223"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Address / Highway Location</label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="e.g. Near Bangalore Highway Junction"
                className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold bg-white text-slate-900 outline-none"
              />
            </div>

            <div className="p-2.5 bg-slate-100 rounded-xl font-medium text-slate-600">
              Coordinates set from active truck position: <strong>{latitude}, {longitude}</strong>
            </div>

            <Button type="submit" variant="primary" fullWidth isLoading={isLoading} icon={<Plus className="w-4 h-4" />}>
              Save Potential Buyer into PostgreSQL
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
};
