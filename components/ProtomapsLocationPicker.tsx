"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import * as protomapsL from "protomaps-leaflet";
import {
  Search,
  MapPin,
  Loader2,
  Building2,
  Landmark,
  Utensils,
  Store,
  Crosshair,
  X,
} from "lucide-react";

export interface ProtomapsLocationPickerProps {
  onLocationSelect: (location: {
    lat: number;
    lng: number;
    address?: {
      state?: string;
      city?: string;
      pincode?: string;
      display_name?: string;
      establishment?: string;
      country?: string;
    };
  }) => void;
  initialPosition?: { lat: number; lng: number } | null;
  readOnly?: boolean;
  height?: string;
}

// Google Headquarters default coordinates (Mountain View, CA)
const GOOGLE_HQ = { lat: 37.422, lng: -122.0841 };

// Protomaps Vector Layer automatically harmonized with Morsel's brand palette
function BrandVectorLayer({ apiKey }: { apiKey: string }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    try {
      const tileUrl = apiKey
        ? `https://api.protomaps.com/tiles/v3/{z}/{x}/{y}.mvt?key=${apiKey}`
        : "/api/protomaps/tiles/{z}/{x}/{y}.mvt";

      const layer: any = protomapsL.leafletLayer({
        url: tileUrl,
        flavor: "light",
        lang: "en",
        maxZoom: 19,
        attribution:
          '<a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> &copy; <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      });

      layer.addTo(map);

      return () => {
        if (map && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      };
    } catch (err) {
      console.warn("Protomaps brand layer notice:", err);
    }
  }, [map, apiKey]);

  return null;
}

// Bespoke Morsel Brand Marker Pin
const createBrandPinIcon = () => {
  return L.divIcon({
    className: "morsel-brand-marker",
    html: `
      <div style="position: relative; transform: translate(-50%, -100%); cursor: pointer; display: flex; flex-direction: column; align-items: center;">
        <!-- Pulsing Ground Radar -->
        <div style="
          position: absolute;
          bottom: -4px;
          width: 24px;
          height: 9px;
          background: rgba(12, 74, 110, 0.28);
          border-radius: 50%;
        "></div>
        
        <!-- Morsel Primary Pin Body -->
        <div style="
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%);
          border: 2.5px solid #0f172a;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.42);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <!-- Inner Core Beacon -->
          <div style="
            width: 13px;
            height: 13px;
            background: #ffffff;
            border: 2px solid #38bdf8;
            border-radius: 50%;
            transform: rotate(45deg);
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.25);
          "></div>
        </div>
        
        <!-- Ground Anchor Point -->
        <div style="
          width: 10px;
          height: 3px;
          background: #0f172a;
          opacity: 0.6;
          border-radius: 50%;
          margin-top: 2px;
          filter: blur(0.5px);
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

// Map click event subscriber
const MapClickHandler = ({
  onLocationPick,
  readOnly,
}: {
  onLocationPick: (lat: number, lng: number) => void;
  readOnly?: boolean;
}) => {
  useMapEvents({
    click(e) {
      if (!readOnly) {
        onLocationPick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Smooth Pan & Zoom on selection
const MapFlyTo = ({
  coords,
  zoom = 16,
}: {
  coords: { lat: number; lng: number } | null;
  zoom?: number;
}) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lng], zoom, {
        duration: 1.3,
        easeLinearity: 0.25,
      });
    }
  }, [coords, zoom, map]);
  return null;
};

interface SearchResultItem {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
  category: "establishment" | "landmark" | "amenity" | "shop" | "address";
  tag?: string;
  raw?: any;
}

export default function ProtomapsLocationPicker({
  onLocationSelect,
  initialPosition = null,
  readOnly = false,
  height = "420px",
}: ProtomapsLocationPickerProps) {
  const protomapsApiKey =
    process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY ||
    process.env.PROTOMAPS_API_KEY ||
    "6d806a97016ece02";

  // Center on initialPosition or Google HQ
  const [mapCenter] = useState<{ lat: number; lng: number }>(
    initialPosition || GOOGLE_HQ
  );
  // Pin marker is null on initial load unless explicitly supplied
  const [activePin, setActivePin] = useState<{ lat: number; lng: number } | null>(
    initialPosition || null
  );

  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [resolvedEstablishment, setResolvedEstablishment] = useState<string>("");
  const [addressLoading, setAddressLoading] = useState<boolean>(false);

  // Search Engine state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // OpenStreetMap Nominatim reverse geocoder
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setAddressLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1`,
          { headers: { Accept: "application/json" } }
        );

        if (!response.ok) throw new Error("Reverse geocode request failed");

        const data = await response.json();

        if (data && data.address) {
          const addr = data.address;
          const establishment =
            data.name ||
            addr.amenity ||
            addr.shop ||
            addr.tourism ||
            addr.building ||
            addr.office ||
            addr.leisure ||
            data.extratags?.brand ||
            "";

          const city =
            addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
          const state = addr.state || addr.region || "";
          const country = addr.country || "";
          const pincode = addr.postcode || "";
          const display_name = data.display_name || establishment || "Selected Field Location";

          setResolvedAddress(display_name);
          setResolvedEstablishment(establishment);

          onLocationSelect({
            lat,
            lng,
            address: {
              state,
              city,
              country,
              pincode,
              display_name,
              establishment,
            },
          });
        } else {
          onLocationSelect({ lat, lng });
        }
      } catch (err) {
        console.error("OSM Geocoding Error:", err);
        onLocationSelect({ lat, lng });
      } finally {
        setAddressLoading(false);
      }
    },
    [onLocationSelect]
  );

  // Handle location pick via map click or marker drag
  const handleLocationPick = useCallback(
    (lat: number, lng: number) => {
      setActivePin({ lat, lng });
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  const markerEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          handleLocationPick(lat, lng);
        }
      },
    }),
    [handleLocationPick]
  );

  // Global Establishment & Landmark Search Engine (Photon + Nominatim)
  const performSearch = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      // 1. Photon OpenSearch (indexes all OSM shops, amenities, tourism, landmarks, offices)
      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=8`
      );

      const items: SearchResultItem[] = [];

      if (photonRes.ok) {
        const photonData = await photonRes.json();
        if (photonData.features && Array.isArray(photonData.features)) {
          for (const feat of photonData.features) {
            const props = feat.properties;
            const coords = feat.geometry?.coordinates;
            if (!coords || coords.length < 2) continue;

            const lon = coords[0];
            const lat = coords[1];

            let category: SearchResultItem["category"] = "address";
            if (props.osm_key === "amenity") category = "amenity";
            else if (props.osm_key === "shop") category = "shop";
            else if (props.osm_key === "tourism" || props.osm_key === "historic")
              category = "landmark";
            else if (props.osm_key === "office" || props.osm_key === "building")
              category = "establishment";

            const name = props.name || props.street || "Location";
            const subtitleParts = [
              props.street,
              props.city || props.district,
              props.state,
              props.country,
            ].filter(Boolean);

            items.push({
              id: `photon-${props.osm_id || Math.random()}`,
              name,
              subtitle: subtitleParts.join(", "),
              lat,
              lng: lon,
              category,
              tag: props.osm_value || props.osm_key,
              raw: props,
            });
          }
        }
      }

      // 2. Secondary fallback if Photon results are sparse
      if (items.length < 3) {
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
              trimmed
            )}&format=json&addressdetails=1&extratags=1&limit=5`,
            { headers: { Accept: "application/json" } }
          );
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (Array.isArray(nomData)) {
              for (const hit of nomData) {
                const lat = parseFloat(hit.lat);
                const lng = parseFloat(hit.lon);
                if (isNaN(lat) || isNaN(lng)) continue;

                if (
                  items.some(
                    (i) => Math.abs(i.lat - lat) < 0.001 && Math.abs(i.lng - lng) < 0.001
                  )
                ) {
                  continue;
                }

                let category: SearchResultItem["category"] = "address";
                if (hit.class === "amenity") category = "amenity";
                else if (hit.class === "tourism" || hit.class === "historic") category = "landmark";
                else if (hit.class === "shop") category = "shop";
                else if (hit.class === "office" || hit.class === "building") category = "establishment";

                items.push({
                  id: `nom-${hit.place_id}`,
                  name: hit.name || hit.display_name?.split(",")[0] || "Location",
                  subtitle: hit.display_name,
                  lat,
                  lng,
                  category,
                  tag: hit.type || hit.class,
                  raw: hit,
                });
              }
            }
          }
        } catch {
          // ignore fallback errors
        }
      }

      setSearchResults(items);
      setShowDropdown(true);
    } catch (err) {
      console.error("OSM Search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (val.trim().length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        performSearch(val);
      }, 250);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleSelectResult = (item: SearchResultItem) => {
    setActivePin({ lat: item.lat, lng: item.lng });
    setSearchQuery(item.name);
    setShowDropdown(false);

    if (item.raw) {
      const city = item.raw.city || item.raw.address?.city || item.raw.district || "";
      const state = item.raw.state || item.raw.address?.state || "";
      const country = item.raw.country || item.raw.address?.country || "";
      const pincode = item.raw.postcode || item.raw.address?.postcode || "";
      const establishment = item.name;
      const display_name = item.subtitle ? `${item.name}, ${item.subtitle}` : item.name;

      setResolvedAddress(display_name);
      setResolvedEstablishment(establishment);

      onLocationSelect({
        lat: item.lat,
        lng: item.lng,
        address: {
          state,
          city,
          country,
          pincode,
          display_name,
          establishment,
        },
      });
    } else {
      reverseGeocode(item.lat, item.lng);
    }
  };

  const handleQuickPreset = (term: string) => {
    setSearchQuery(term);
    performSearch(term);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleLocationPick(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn("Geolocation error:", err);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const getCategoryIcon = (category: SearchResultItem["category"]) => {
    switch (category) {
      case "establishment":
        return <Building2 className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />;
      case "landmark":
        return <Landmark className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />;
      case "amenity":
        return <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />;
      case "shop":
        return <Store className="w-4 h-4 text-sky-900 dark:text-sky-300 shrink-0 mt-0.5" />;
      default:
        return <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />;
    }
  };

  const pinIcon = useMemo(() => createBrandPinIcon(), []);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-900 dark:border-slate-700 shadow-md bg-slate-100 dark:bg-slate-950 font-sans"
      style={{ height }}
    >
      {/* Top Search Bar & Filters (Disabled in readOnly) */}
      {!readOnly && (
        <div className="absolute top-3 left-3 right-3 z-1000 max-w-xl mx-auto space-y-2 pointer-events-auto">
          {/* Main Search Input */}
          <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-xl shadow-xl border-2 border-slate-900 dark:border-slate-700 overflow-hidden">
            <Search className="w-4 h-4 text-slate-400 ml-3.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search establishments, landmarks, cafes, markets worldwide..."
              className="w-full px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white bg-transparent border-0 focus:outline-none placeholder:text-slate-400"
            />
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-sky-900 dark:text-sky-400 animate-spin mr-3 shrink-0" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowDropdown(false);
                }}
                className="p-1 mr-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}

            {/* GPS Locate Me Button */}
            <button
              type="button"
              onClick={handleLocateMe}
              title="Use Device GPS Location"
              className="px-2.5 py-1.5 mr-2 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-900 dark:text-sky-200 text-[10px] font-bold border border-sky-300 dark:border-sky-800 flex items-center gap-1 shrink-0 transition-colors"
            >
              <Crosshair className="w-3 h-3 text-sky-900 dark:text-sky-400" />
              <span className="hidden sm:inline">My GPS</span>
            </button>
          </div>

          {/* Quick Filter Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => handleQuickPreset("Community Food Bank")}
              className="px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-900 dark:hover:text-sky-300 transition-colors shadow-sm shrink-0 flex items-center gap-1"
            >
              <Building2 className="w-2.5 h-2.5 text-sky-700 dark:text-sky-400" />
              <span>Food Banks</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset("Farmers Market")}
              className="px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-900 dark:hover:text-emerald-300 transition-colors shadow-sm shrink-0 flex items-center gap-1"
            >
              <Store className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
              <span>Markets</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset("Hospital")}
              className="px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-900 dark:hover:text-rose-300 transition-colors shadow-sm shrink-0 flex items-center gap-1"
            >
              <Building2 className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
              <span>Hospitals</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset("Eiffel Tower Paris")}
              className="px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-900 dark:hover:text-amber-300 transition-colors shadow-sm shrink-0 flex items-center gap-1"
            >
              <Landmark className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
              <span>Landmarks</span>
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border-2 border-slate-900 dark:border-slate-700 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectResult(item)}
                    className="w-full text-left p-2.5 hover:bg-sky-50 dark:hover:bg-slate-800/80 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    {getCategoryIcon(item.category)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </span>
                        {item.tag && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.tag.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  {isSearching ? "Searching OpenStreetMap establishments..." : "No establishments or landmarks found"}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MapContainer: Locked to Morsel Brand Kit */}
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={activePin ? 16 : 14}
        className="w-full h-full"
        style={{ height: "100%", width: "100%" }}
      >
        {/* Curated Morsel Brand Tiles: Crisp streets, pastel water, clear labels */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        {/* Protomaps vector layer enhancement */}
        <BrandVectorLayer apiKey={protomapsApiKey} />

        {/* Brand Marker Pin */}
        {activePin && (
          <Marker
            position={[activePin.lat, activePin.lng]}
            draggable={!readOnly}
            ref={markerRef}
            eventHandlers={markerEventHandlers}
            icon={pinIcon}
          />
        )}

        <MapClickHandler onLocationPick={handleLocationPick} readOnly={readOnly} />
        {activePin && <MapFlyTo coords={activePin} zoom={16} />}
      </MapContainer>

      {/* Bottom Status Bar */}
      <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-md text-white px-3 py-2 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-mono shadow-xl z-900 pointer-events-none">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">
            {addressLoading
              ? "Resolving OpenStreetMap address..."
              : resolvedAddress ||
                (activePin
                  ? "Field coordinates tagged"
                  : "Search any establishment or landmark, or click anywhere on the map")}
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {resolvedEstablishment && (
            <span className="bg-sky-900/80 text-sky-200 px-2 py-0.5 rounded text-[10px] font-sans font-bold">
              {resolvedEstablishment}
            </span>
          )}
          <span className="text-sky-300 font-bold">
            {activePin
              ? `${activePin.lat.toFixed(5)}°, ${activePin.lng.toFixed(5)}°`
              : "Google HQ: 37.42200°, -122.08410°"}
          </span>
        </div>
      </div>
    </div>
  );
}
