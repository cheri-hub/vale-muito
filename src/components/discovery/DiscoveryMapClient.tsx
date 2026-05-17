"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from "react-leaflet";
import type { Recommendation } from "@/domain/recommendations";
import type { Coordinates } from "@/lib/geolocation";
import { appOfficialRegion } from "@/lib/product";
import { formatCurrency } from "@/lib/recommendations";

interface DiscoveryMapClientProps {
  recommendations: Recommendation[];
  userLocation: Coordinates | null;
}

const markerIcon = L.divIcon({
  className: "vale-muito-marker",
  html: '<span class="block size-6 rounded-full border-2 border-white bg-emerald-700 shadow-md"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const userMarkerIcon = L.divIcon({
  className: "vale-muito-user-marker",
  html: '<span class="block size-6 rounded-full border-2 border-white bg-sky-600 shadow-md ring-4 ring-sky-200"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function DiscoveryMapClient({ recommendations, userLocation }: DiscoveryMapClientProps) {
  const center = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : recommendations[0]
    ? [recommendations[0].latitude, recommendations[0].longitude]
    : [appOfficialRegion.coordinates.latitude, appOfficialRegion.coordinates.longitude];

  return (
    <div className="mt-4 aspect-[4/3] overflow-hidden rounded-lg border border-stone-200">
      <MapContainer
        center={center as [number, number]}
        zoom={12}
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapRecenter center={center as [number, number]} />
        {userLocation ? (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userMarkerIcon}
            title="Sua localização"
            alt="Sua localização"
          >
            <Popup>Sua localização</Popup>
          </Marker>
        ) : null}
        {recommendations.map((recommendation) => (
          <Marker
            key={recommendation.id}
            position={[recommendation.latitude, recommendation.longitude]}
            icon={markerIcon}
            title={`${recommendation.dishName} em ${recommendation.placeName}`}
            alt={`${recommendation.dishName} em ${recommendation.placeName}`}
          >
            <Popup>
              <strong>{recommendation.dishName}</strong>
              <br />
              {recommendation.placeName} - {formatCurrency(recommendation.pricePaid)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}