import { LocateFixed, Search } from "lucide-react";
import {
  categoryLabels,
  priceBandLabels,
  type PriceBand,
  type RecommendationCategory,
  type RecommendationFilters,
} from "@/domain/recommendations";

interface DiscoveryFiltersProps {
  filters: RecommendationFilters;
  neighborhoods: string[];
  locationStatus: "idle" | "loading" | "ready" | "error";
  onChange: (filters: RecommendationFilters) => void;
  onUseCurrentLocation: () => void;
}

const categories: Array<"all" | RecommendationCategory> = [
  "all",
  "almoco",
  "cafe",
  "delivery",
  "jantar",
  "lanche",
  "sobremesa",
];

const priceBands: Array<"all" | PriceBand> = ["all", "ate-30", "30-60", "60-100", "100-plus"];
const distanceOptions = [1, 3, 5, 10, 25];

export function DiscoveryFilters({
  filters,
  neighborhoods,
  locationStatus,
  onChange,
  onUseCurrentLocation,
}: DiscoveryFiltersProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-label="Filtros">
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
        <input
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          placeholder="Buscar prato, lugar, bairro ou tag"
          className="h-12 w-full rounded-md border border-stone-200 bg-stone-50 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 text-sm font-medium text-stone-700">
          Categoria
          <select
            value={filters.category}
            onChange={(event) =>
              onChange({ ...filters, category: event.target.value as RecommendationFilters["category"] })
            }
            className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "Todas" : categoryLabels[category]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm font-medium text-stone-700">
          Bairro
          <select
            value={filters.neighborhood}
            onChange={(event) => onChange({ ...filters, neighborhood: event.target.value })}
            className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">Todos</option>
            {neighborhoods.map((neighborhood) => (
              <option key={neighborhood} value={neighborhood}>
                {neighborhood}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm font-medium text-stone-700">
          Preço
          <select
            value={filters.priceBand}
            onChange={(event) =>
              onChange({ ...filters, priceBand: event.target.value as RecommendationFilters["priceBand"] })
            }
            className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            {priceBands.map((priceBand) => (
              <option key={priceBand} value={priceBand}>
                {priceBand === "all" ? "Todos" : priceBandLabels[priceBand]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm font-medium text-stone-700">
          Nota mínima
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={filters.minimumValueScore}
            onChange={(event) =>
              onChange({ ...filters, minimumValueScore: Number(event.target.value) })
            }
            className="h-11 w-full accent-emerald-700"
          />
          <span className="block text-xs text-stone-500">{filters.minimumValueScore} de 5</span>
        </label>

        <label className="space-y-1 text-sm font-medium text-stone-700">
          Distância
          <select
            value={filters.maxDistanceKm}
            disabled={!filters.userLocation}
            onChange={(event) => onChange({
              ...filters,
              maxDistanceKm: event.target.value === "all" ? "all" : Number(event.target.value),
            })}
            className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100 disabled:text-stone-400"
          >
            <option value="all">Qualquer</option>
            {distanceOptions.map((distance) => (
              <option key={distance} value={distance}>
                Até {distance} km
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
        <button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={locationStatus === "loading"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LocateFixed aria-hidden="true" size={16} />
          {locationStatus === "loading" ? "Localizando..." : "Usar minha localização"}
        </button>
        {locationStatus === "ready" && filters.userLocation ? <span className="text-xs font-medium text-emerald-700">Filtro por distância ativo.</span> : null}
        {locationStatus === "error" ? <span className="text-xs font-medium text-red-700">Não foi possível obter sua localização.</span> : null}
      </div>
    </section>
  );
}