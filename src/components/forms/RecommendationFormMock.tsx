"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, ImagePlus, LocateFixed, MapPin, Save, Search, Send } from "lucide-react";
import {
  autofillRecommendationPlaceAction,
  createRecommendationAction,
  geocodeRecommendationAddressAction,
  searchRecommendationPlaceSuggestionsAction,
  updateRecommendationAction,
} from "@/app/recommendations/actions";
import {
  categoryLabels,
  type Recommendation,
  recommendationInputSchema,
  type RecommendationInput,
} from "@/domain/recommendations";
import type { Coordinates } from "@/lib/geolocation";
import type { PlaceSuggestion } from "@/lib/google-places";
import { appEditorialRule, appOfficialRegion, isRecommendationPhotoRequired } from "@/lib/product";
import type { RepositoryMode } from "@/repositories/recommendations/recommendations-repository";

const RecommendationLocationPicker = dynamic(() => import("./RecommendationLocationPicker"), {
  ssr: false,
  loading: () => <div className="aspect-[16/9] rounded-lg bg-stone-100" />,
});

const initialForm: RecommendationInput = {
  dishName: "",
  placeName: "",
  category: "lanche",
  neighborhood: "",
  pricePaid: 0,
  valueScore: 5,
  summary: "",
  whyWorthIt: "",
};
const defaultLocation: Coordinates = appOfficialRegion.coordinates;

interface RecommendationFormMockProps {
  placeAutocompleteEnabled?: boolean;
  recommendation?: Recommendation;
}

export function RecommendationFormMock({ placeAutocompleteEnabled = false, recommendation }: RecommendationFormMockProps) {
  const isEditing = Boolean(recommendation);
  const [form, setForm] = useState<RecommendationInput>(recommendation ? {
    dishName: recommendation.dishName,
    placeName: recommendation.placeName,
    category: recommendation.category,
    neighborhood: recommendation.neighborhood,
    pricePaid: recommendation.pricePaid,
    valueScore: recommendation.valueScore,
    summary: recommendation.summary,
    whyWorthIt: recommendation.whyWorthIt,
  } : initialForm);
  const [address, setAddress] = useState(recommendation?.address ?? "");
  const [tags, setTags] = useState(recommendation?.tags.join(", ") ?? "");
  const [location, setLocation] = useState<Coordinates>(recommendation ? {
    latitude: recommendation.latitude,
    longitude: recommendation.longitude,
  } : defaultLocation);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [placeLookupMessage, setPlaceLookupMessage] = useState<string | null>(
    placeAutocompleteEnabled ? "Digite o nome do lugar para tentar preencher endereço e mapa automaticamente." : null,
  );
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isAutofillingPlace, startAutofillPlaceTransition] = useTransition();
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageMode, setMessageMode] = useState<RepositoryMode | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSearchingPlaces, startPlaceSearchTransition] = useTransition();
  const skipNextPlaceSearchRef = useRef<string | null>(null);
  const placeSearchRequestRef = useRef(0);

  const validation = useMemo(() => recommendationInputSchema.safeParse(form), [form]);
  const canSubmit = validation.success && !isPending;
  const imagePreview = photoPreview ?? (!removePhoto ? recommendation?.imageUrl : null) ?? null;
  const trimmedPlaceQuery = form.placeName.trim();
  const placeFieldMessage = placeAutocompleteEnabled
    ? trimmedPlaceQuery.length < 3
      ? "Digite pelo menos 3 caracteres para buscar o lugar."
      : placeLookupMessage
    : null;

  useEffect(() => {
    const requestId = placeSearchRequestRef.current + 1;
    placeSearchRequestRef.current = requestId;

    if (!placeAutocompleteEnabled) {
      return;
    }

    if (skipNextPlaceSearchRef.current === trimmedPlaceQuery) {
      skipNextPlaceSearchRef.current = null;
      return;
    }

    if (trimmedPlaceQuery.length < 3) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startPlaceSearchTransition(async () => {
        try {
          const result = await searchRecommendationPlaceSuggestionsAction(trimmedPlaceQuery);

          if (placeSearchRequestRef.current !== requestId) {
            return;
          }

          setPlaceLookupMessage(result.message);
          setPlaceSuggestions(result.ok ? result.data ?? [] : []);
        } catch {
          if (placeSearchRequestRef.current !== requestId) {
            return;
          }

          setPlaceLookupMessage("Busca de lugar temporariamente indisponível. Você pode preencher manualmente.");
          setPlaceSuggestions([]);
        }
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [placeAutocompleteEnabled, startPlaceSearchTransition, trimmedPlaceQuery]);

  useEffect(() => () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
  }, [photoPreview]);

  return (
    <form
      className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = recommendation
            ? await updateRecommendationAction(recommendation.id, formData)
            : await createRecommendationAction(formData);
          setMessage(result.message);
          setMessageMode(result.mode);
        });
      }}
    >
      {message ? (
        <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <CheckCircle2 aria-hidden="true" className="mt-0.5" size={20} />
          <div>
            <p className="font-semibold">{message}</p>
            {messageMode === "offline" ? (
              <p className="mt-1 text-sm leading-6">
                Sem Supabase configurado, a publicação roda em modo local. Com env vars, a mesma ação persiste no banco.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <input type="hidden" name="city" value={recommendation?.city ?? appOfficialRegion.city} />
      <input type="hidden" name="latitude" value={location.latitude} />
      <input type="hidden" name="longitude" value={location.longitude} />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="dishName"
          label="Prato"
          value={form.dishName}
          onChange={(dishName) => setForm({ ...form, dishName })}
          placeholder="Ex.: Lamen de missô picante"
        />
        <PlaceAutocompleteField
          isAutocompleteEnabled={placeAutocompleteEnabled}
          isLoading={isSearchingPlaces || isAutofillingPlace}
          message={placeFieldMessage}
          onChange={(placeName) => {
            setForm((currentForm) => ({ ...currentForm, placeName }));
          }}
          onSelectSuggestion={(suggestion) => {
            skipNextPlaceSearchRef.current = suggestion.placeName;
            setPlaceSuggestions([]);

            startAutofillPlaceTransition(async () => {
              try {
                const result = await autofillRecommendationPlaceAction(suggestion.placeId, suggestion.placeName);

                setPlaceLookupMessage(result.message);

                if (!result.ok || !result.data) {
                  return;
                }

                const autofill = result.data;

                setForm((currentForm) => ({
                  ...currentForm,
                  neighborhood: autofill.neighborhood || currentForm.neighborhood,
                  placeName: autofill.placeName,
                }));
                setAddress(autofill.address);
                setLocation({ latitude: autofill.latitude, longitude: autofill.longitude });
                setLocationMessage(
                  autofill.neighborhood
                    ? "Coordenadas atualizadas pelo lugar selecionado."
                    : "Coordenadas atualizadas pelo lugar selecionado. Revise o bairro antes de publicar.",
                );
              } catch {
                setPlaceLookupMessage("Não foi possível preencher o lugar automaticamente. Complete os campos manualmente.");
              }
            });
          }}
          placeholder="Ex.: Tigela Norte"
          suggestions={placeSuggestions}
          value={form.placeName}
        />
        <label className="space-y-1 text-sm font-medium text-stone-700">
          Categoria
          <select
            name="category"
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value as RecommendationInput["category"] })}
            className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <TextField
          name="neighborhood"
          label="Bairro"
          value={form.neighborhood}
          onChange={(neighborhood) => setForm({ ...form, neighborhood })}
          placeholder="Ex.: Pinheiros"
        />
        <TextField name="address" label="Endereço" value={address} onChange={setAddress} placeholder="Rua e número" />
        <TextField name="tags" label="Tags" value={tags} onChange={setTags} placeholder="barato, bem servido" />
        <section className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-stone-800">
                <MapPin aria-hidden="true" size={16} />
                Local no mapa
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isGeocoding || address.trim().length < 5}
                onClick={async () => {
                  setIsGeocoding(true);
                  setLocationMessage("Buscando endereço...");

                  try {
                    const result = await geocodeRecommendationAddressAction(address, appOfficialRegion.city);

                    if (!result.ok || !result.data) {
                      setLocationMessage(result.message);
                      return;
                    }

                    setLocation(result.data);
                    setLocationMessage(result.message);
                  } finally {
                    setIsGeocoding(false);
                  }
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search aria-hidden="true" size={15} />
                {isGeocoding ? "Buscando..." : "Buscar endereço"}
              </button>
              <button
                type="button"
                disabled={isLocating}
                onClick={() => {
                  if (!navigator.geolocation) {
                    setLocationMessage("Seu navegador não oferece localização automática.");
                    return;
                  }

                  setIsLocating(true);
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
                      setLocationMessage("Coordenadas atualizadas pela sua localização.");
                      setIsLocating(false);
                    },
                    () => {
                      setLocationMessage("Não foi possível obter sua localização.");
                      setIsLocating(false);
                    },
                    { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
                  );
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LocateFixed aria-hidden="true" size={15} />
                {isLocating ? "Localizando..." : "Usar localização"}
              </button>
            </div>
          </div>
          <RecommendationLocationPicker location={location} onChange={(nextLocation) => {
            setLocation(nextLocation);
            setLocationMessage("Coordenadas atualizadas pelo mapa.");
          }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="Latitude"
              value={Number(location.latitude.toFixed(6))}
              onChange={(latitude) => setLocation((currentLocation) => ({ ...currentLocation, latitude }))}
              min={-90}
              max={90}
              step="0.000001"
            />
            <NumberField
              label="Longitude"
              value={Number(location.longitude.toFixed(6))}
              onChange={(longitude) => setLocation((currentLocation) => ({ ...currentLocation, longitude }))}
              min={-180}
              max={180}
              step="0.000001"
            />
          </div>
          {locationMessage ? <p className="text-xs font-medium text-stone-600">{locationMessage}</p> : null}
        </section>
        <label className="space-y-2 text-sm font-medium text-stone-700 sm:col-span-2">
          Foto {isRecommendationPhotoRequired ? null : <span className="font-normal text-stone-500">(opcional)</span>}
          <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:items-start">
            <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-stone-200 bg-stone-100">
              {imagePreview ? (
                <Image src={imagePreview} alt="Prévia da foto" fill className="object-cover" unoptimized={imagePreview.startsWith("blob:")} />
              ) : (
                <div className="flex h-full items-center justify-center text-stone-400">
                  <ImagePlus aria-hidden="true" size={28} />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <input
                name="photo"
                type="file"
                required={isRecommendationPhotoRequired}
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  setRemovePhoto(false);

                  if (photoPreview) {
                    URL.revokeObjectURL(photoPreview);
                  }

                  setPhotoPreview(file ? URL.createObjectURL(file) : null);
                }}
                className="block h-11 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-stone-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
              {recommendation ? (
                <label className="flex items-center gap-2 text-xs font-medium text-stone-600">
                  <input
                    name="removePhoto"
                    type="checkbox"
                    checked={removePhoto}
                    onChange={(event) => setRemovePhoto(event.target.checked)}
                    className="size-4 rounded border-stone-300 accent-emerald-700"
                  />
                  Remover foto atual
                </label>
              ) : null}
              <p className="text-xs leading-5 text-stone-500">
                A foto ajuda, mas a recomendação vale pelo contexto: {appEditorialRule.toLowerCase()}
              </p>
            </div>
          </div>
        </label>
        <NumberField
          name="pricePaid"
          label="Quanto você pagou?"
          value={form.pricePaid}
          onChange={(pricePaid) => setForm({ ...form, pricePaid })}
          min={1}
        />
        <label className="space-y-1 text-sm font-medium text-stone-700">
          Vale quanto?
          <input
            name="valueScore"
            type="range"
            min="1"
            max="5"
            step="1"
            value={form.valueScore}
            onChange={(event) => setForm({ ...form, valueScore: Number(event.target.value) })}
            className="h-11 w-full accent-emerald-700"
          />
          <span className="block text-xs text-stone-500">{form.valueScore} de 5</span>
        </label>
      </div>

      <TextAreaField
        name="summary"
        label="Resumo curto"
        value={form.summary}
        onChange={(summary) => setForm({ ...form, summary })}
        placeholder="O que alguém precisa saber antes de gastar?"
      />
      <TextAreaField
        name="whyWorthIt"
        label="Por que vale muito?"
        value={form.whyWorthIt}
        onChange={(whyWorthIt) => setForm({ ...form, whyWorthIt })}
        placeholder="Conte a parte que fez o gasto compensar."
      />

      {!validation.success ? (
        <div className="rounded-md bg-stone-50 p-3 text-sm text-stone-600">
          Preencha os campos com detalhes suficientes para publicar uma recomendação útil.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {isEditing ? <Save aria-hidden="true" size={17} /> : <Send aria-hidden="true" size={17} />}
        {isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Publicar recomendação"}
      </button>
    </form>
  );
}

interface PlaceAutocompleteFieldProps {
  isAutocompleteEnabled: boolean;
  isLoading: boolean;
  message: string | null;
  onChange: (value: string) => void;
  onSelectSuggestion: (suggestion: PlaceSuggestion) => void;
  placeholder: string;
  suggestions: PlaceSuggestion[];
  value: string;
}

function PlaceAutocompleteField({
  isAutocompleteEnabled,
  isLoading,
  message,
  onChange,
  onSelectSuggestion,
  placeholder,
  suggestions,
  value,
}: PlaceAutocompleteFieldProps) {
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const statusId = useId();
  const safeActiveSuggestionIndex = suggestions[activeSuggestionIndex] ? activeSuggestionIndex : 0;
  const shouldShowSuggestions = isAutocompleteEnabled && isInputFocused && suggestions.length > 0;
  const activeSuggestion = suggestions[safeActiveSuggestionIndex] ?? null;

  useEffect(() => {
    if (!isInputFocused) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsInputFocused(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isInputFocused]);

  return (
    <label className="space-y-1 text-sm font-medium text-stone-700">
      Lugar
      <div ref={containerRef} className="relative">
        <input
          name="placeName"
          value={value}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={shouldShowSuggestions ? listboxId : undefined}
          aria-describedby={statusId}
          aria-expanded={shouldShowSuggestions}
          aria-activedescendant={activeSuggestion ? `${listboxId}-option-${activeSuggestion.placeId}` : undefined}
          onChange={(event) => {
            setActiveSuggestionIndex(0);
            onChange(event.target.value);
          }}
          onFocus={() => {
            setIsInputFocused(true);
          }}
          onKeyDown={(event) => {
            if (!shouldShowSuggestions) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveSuggestionIndex((currentIndex) => (currentIndex + 1) % suggestions.length);
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveSuggestionIndex((currentIndex) => (currentIndex - 1 + suggestions.length) % suggestions.length);
            }

            if (event.key === "Enter") {
              event.preventDefault();
              onSelectSuggestion(activeSuggestion ?? suggestions[0]!);
              setIsInputFocused(false);
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setIsInputFocused(false);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
        {shouldShowSuggestions ? (
          <div className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-[500] overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg">
            <ul id={listboxId} role="listbox" className="max-h-64 overflow-y-auto py-1">
              {suggestions.map((suggestion, index) => (
                <li key={suggestion.placeId} role="presentation">
                  <button
                    id={`${listboxId}-option-${suggestion.placeId}`}
                    type="button"
                    role="option"
                    aria-selected={index === safeActiveSuggestionIndex}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    onClick={() => {
                      onSelectSuggestion(suggestion);
                      setIsInputFocused(false);
                    }}
                    className={`flex w-full flex-col items-start gap-1 px-3 py-2 text-left transition hover:bg-stone-50 ${index === safeActiveSuggestionIndex ? "bg-stone-50" : ""}`}
                  >
                    <span className="font-semibold text-stone-900">{suggestion.placeName}</span>
                    <span className="text-xs text-stone-500">{suggestion.secondaryText || suggestion.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {isAutocompleteEnabled ? (
        <p id={statusId} aria-live="polite" className="text-xs font-medium text-stone-500">
          {isLoading ? "Buscando lugares..." : message ?? "Escolha um lugar para preencher endereço e mapa automaticamente."}
        </p>
      ) : (
        <p id={statusId} aria-live="polite" className="text-xs font-medium text-stone-500">
          Autocomplete opcional. Configure GOOGLE_PLACES_API_KEY para preencher endereço e mapa a partir do lugar.
        </p>
      )}
    </label>
  );
}

interface TextFieldProps {
  name: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

function TextField({ name, label, value, placeholder, onChange }: TextFieldProps) {
  return (
    <label className="space-y-1 text-sm font-medium text-stone-700">
      {label}
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

interface NumberFieldProps {
  name?: string;
  label: string;
  value: number;
  min: number;
  max?: number;
  step?: string;
  onChange: (value: number) => void;
}

function NumberField({ name, label, value, min, max, step = "any", onChange }: NumberFieldProps) {
  return (
    <label className="space-y-1 text-sm font-medium text-stone-700">
      {label}
      <input
        name={name}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value || ""}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

interface TextAreaFieldProps {
  name: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

function TextAreaField({ name, label, value, placeholder, onChange }: TextAreaFieldProps) {
  return (
    <label className="space-y-1 text-sm font-medium text-stone-700">
      {label}
      <textarea
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-y rounded-md border border-stone-200 bg-white px-3 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}