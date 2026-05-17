"use client";

import dynamic from "next/dynamic";
import { MapPinned } from "lucide-react";
import type { Recommendation } from "@/domain/recommendations";
import type { Coordinates } from "@/lib/geolocation";
import { appOfficialRegion } from "@/lib/product";
import { formatCurrency } from "@/lib/recommendations";

const DiscoveryMapClient = dynamic(() => import("./DiscoveryMapClient"), {
  ssr: false,
  loading: () => <div className="mt-4 aspect-[4/3] rounded-lg bg-stone-100" />,
});

interface DiscoveryMapProps {
  recommendations: Recommendation[];
  userLocation: Coordinates | null;
}

export function DiscoveryMap({ recommendations, userLocation }: DiscoveryMapProps) {
  return (
    <aside className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Mapa de valor</p>
          <h2 className="text-xl font-semibold tracking-normal text-stone-950">{appOfficialRegion.label}</h2>
        </div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <MapPinned aria-hidden="true" size={20} />
        </span>
      </div>

      <DiscoveryMapClient recommendations={recommendations} userLocation={userLocation} />

      <div className="mt-4 space-y-3">
        {recommendations.slice(0, 4).map((recommendation) => (
          <div key={recommendation.id} className="flex items-center justify-between gap-3 rounded-md bg-stone-50 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-950">{recommendation.placeName}</p>
              <p className="truncate text-xs text-stone-500">{recommendation.neighborhood}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-emerald-800">
              {formatCurrency(recommendation.pricePaid)}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}