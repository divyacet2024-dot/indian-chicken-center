"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface TruckTrackingMapProps {
  latitude: number;
  longitude: number;
  truckName?: string;
  status?: string;
}

export default function TruckTrackingMap({
  latitude,
  longitude,
  truckName = "Truck",
  status = "Active",
}: TruckTrackingMapProps) {
  return (
    <div className="h-[500px] w-full overflow-hidden rounded-2xl border">
      <MapContainer
        center={[latitude, longitude]}
        zoom={10}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[latitude, longitude]}>
          <Popup>
            <strong>{truckName}</strong>
            <br />
            Status: {status}
            <br />
            Location: {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}