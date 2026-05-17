"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import type { Coordinates } from "@/lib/geolocation";

interface RecommendationLocationPickerProps {
  location: Coordinates;
  onChange: (location: Coordinates) => void;
}

const selectedLocationIcon = L.divIcon({
  className: "vale-muito-selected-location-marker",
  html: '<span class="block size-7 rounded-full border-2 border-white bg-emerald-700 shadow-md ring-4 ring-emerald-200"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function RecommendationLocationPicker({ location, onChange }: RecommendationLocationPickerProps) {
  return (
    <div className="aspect-[16/9] overflow-hidden rounded-lg border border-stone-200">
      <MapContainer
        center={[location.latitude, location.longitude]}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapClickHandler onChange={onChange} />
        <MapCenter location={location} />
        <Marker
          position={[location.latitude, location.longitude]}
          icon={selectedLocationIcon}
          title="Local escolhido"
          alt="Local escolhido"
          draggable
          eventHandlers={{
            dragend: (event) => {
              const marker = event.target as L.Marker;
              const nextLocation = marker.getLatLng();
              onChange({ latitude: nextLocation.lat, longitude: nextLocation.lng });
            },
          }}
        />
      </MapContainer>
    </div>
  );
}

function MapClickHandler({ onChange }: Pick<RecommendationLocationPickerProps, "onChange">) {
  useMapEvents({
    click: (event) => onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
  });

  return null;
}

function MapCenter({ location }: Pick<RecommendationLocationPickerProps, "location">) {
  const map = useMap();

  useEffect(() => {
    map.setView([location.latitude, location.longitude], map.getZoom(), { animate: true });
  }, [location, map]);

  return null;
}