"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, SlidersHorizontal } from "lucide-react";
import type { Recommendation } from "@/domain/recommendations";
import {
  defaultRecommendationFilters,
  filterRecommendations,
  getUniqueNeighborhoods,
} from "@/lib/recommendations";
import { appOfficialRegion } from "@/lib/product";
import { DiscoveryFilters } from "./DiscoveryFilters";
import { DiscoveryMap } from "./DiscoveryMap";
import { RecommendationList } from "./RecommendationList";

interface DiscoveryExperienceProps {
  recommendations: Recommendation[];
}

export function DiscoveryExperience({ recommendations }: DiscoveryExperienceProps) {
  const [filters, setFilters] = useState(defaultRecommendationFilters);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const neighborhoods = useMemo(() => getUniqueNeighborhoods(recommendations), [recommendations]);
  const visibleRecommendations = useMemo(
    () => filterRecommendations(recommendations, filters),
    [filters, recommendations],
  );

  function requestUserLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFilters((currentFilters) => ({
          ...currentFilters,
          userLocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          maxDistanceKm: currentFilters.maxDistanceKm === "all" ? 5 : currentFilters.maxDistanceKm,
        }));
        setLocationStatus("ready");
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-4 py-4 lg:grid-cols-[1fr_360px] lg:items-end">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
            <SlidersHorizontal aria-hidden="true" size={15} />
            Curadoria aberta em {appOfficialRegion.label}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal text-stone-950 sm:text-5xl">
            Comidas que valem muito o dinheiro.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
            Encontre pratos recomendados por pessoas que comeram, pagaram e saíram pensando que o gasto compensou.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Metric label="recomendações" value={String(recommendations.length)} />
            <Metric label="bairros" value={String(neighborhoods.length)} />
            <Metric label="nota média" value="4.6" />
          </div>
          <Link
            href="/recommend/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            <Plus aria-hidden="true" size={17} />
            Recomendar um achado
          </Link>
        </div>
      </section>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <DiscoveryFilters
            filters={filters}
            neighborhoods={neighborhoods}
            locationStatus={locationStatus}
            onChange={setFilters}
            onUseCurrentLocation={requestUserLocation}
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-stone-600">
              {visibleRecommendations.length} achado{visibleRecommendations.length === 1 ? "" : "s"} que {visibleRecommendations.length === 1 ? "vale" : "valem"} a pena
            </p>
            <button
              type="button"
              onClick={() => {
                setFilters(defaultRecommendationFilters);
                setLocationStatus("idle");
              }}
              className="text-sm font-semibold text-emerald-800 hover:text-emerald-950"
            >
              Limpar filtros
            </button>
          </div>
          <RecommendationList recommendations={visibleRecommendations} />
        </div>
        <DiscoveryMap recommendations={visibleRecommendations} userLocation={filters.userLocation} />
      </div>
    </main>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-md bg-stone-50 p-3">
      <p className="text-xl font-semibold text-stone-950">{value}</p>
      <p className="text-xs font-medium text-stone-500">{label}</p>
    </div>
  );
}