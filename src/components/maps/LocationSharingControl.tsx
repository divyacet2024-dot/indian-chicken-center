'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Square } from 'lucide-react';
import { ApiClient } from '@/services/apiClient';

interface LocationSharingControlProps {
  tripId: string;
  onLocationSent?: (location: { latitude: number; longitude: number; recorded_at: string }) => void;
}

const SEND_INTERVAL_MS = 20_000;

export function LocationSharingControl({ tripId, onLocationSent }: LocationSharingControlProps) {
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const watcherRef = useRef<number | null>(null);
  const lastSentAtRef = useRef(0);

  useEffect(() => () => {
    if (watcherRef.current !== null) navigator.geolocation?.clearWatch(watcherRef.current);
  }, []);

  const stopSharing = () => {
    if (watcherRef.current !== null) navigator.geolocation.clearWatch(watcherRef.current);
    watcherRef.current = null;
    setSharing(false);
    setMessage('Location sharing stopped.');
  };

  const startSharing = () => {
    if (!navigator.geolocation) {
      setMessage('Location sharing unavailable on this device/browser.');
      return;
    }
    setMessage('Requesting location permission...');
    const watcher = navigator.geolocation.watchPosition(async (position) => {
      const now = Date.now();
      if (now - lastSentAtRef.current < SEND_INTERVAL_MS) return;
      lastSentAtRef.current = now;
      try {
        const location = await ApiClient.recordTripLocation(tripId, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setMessage(`Last updated ${new Date(location.recorded_at).toLocaleTimeString('en-IN')}`);
        onLocationSent?.(location);
      } catch (error: any) {
        setMessage(error.message || 'Could not send location.');
      }
    }, (error) => {
      const detail = error.code === error.PERMISSION_DENIED ? 'Location permission denied.'
        : error.code === error.POSITION_UNAVAILABLE ? 'GPS location is unavailable.'
        : 'GPS request timed out.';
      setMessage(detail);
      stopSharing();
    }, { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 });
    watcherRef.current = watcher;
    setSharing(true);
    setMessage('Sharing live GPS location.');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <button type="button" onClick={sharing ? stopSharing : startSharing} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold text-white ${sharing ? 'bg-slate-700' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
        {sharing ? <Square className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
        {sharing ? 'Stop location sharing' : 'Start location sharing'}
      </button>
      {message && <span className="text-xs font-semibold text-slate-600">{message}</span>}
    </div>
  );
}