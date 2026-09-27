"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
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
  Navigation,
} from "lucide-react";

export interface OpenStreetMapLocationPickerProps {
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

// Default fallback coordinate (India central)
const DEFAULT_INDIA_COORDS = { lat: 19.076, lng: 72.8777 };

// Custom Morsel Brand Marker Pin created with Leaflet L.divIcon
const createBrandPinIcon = () => {
  return L.divIcon({
    className: "morsel-brand-marker",
    html: `
      <div style="position: relative; transform: translate(-50%, -100%); cursor: pointer; display: flex; flex-direction: column; align-items: center;">
        <!-- Pulsing Ground Radar Target -->
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

interface SearchResultItem {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
  category: "establishment" | "landmark" | "amenity" | "shop" | "address";
  tag?: string;
  distanceKm?: number;
  raw?: any;
}

export default function OpenStreetMapLocationPicker({
  onLocationSelect,
  initialPosition = null,
  readOnly = false,
  height = "420px",
}: OpenStreetMapLocationPickerProps) {
  // Coordinates & Address state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
    initialPosition || null
  );
  const [activePin, setActivePin] = useState<{ lat: number; lng: number } | null>(
    initialPosition || null
  );
  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [resolvedEstablishment, setResolvedEstablishment] = useState<string>("");
  const [addressLoading, setAddressLoading] = useState<boolean>(false);
  const [detectingLocation, setDetectingLocation] = useState<boolean>(false);
  const [detectedCountry, setDetectedCountry] = useState<string>("");

  // Search Engine state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>("");

  // DOM & Leaflet Refs (Kept outside render loop to prevent re-creation and vibration)
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const rootContainerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootContainerRef.current && !rootContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Safe Reverse Geocoding via internal API route (prevents CORS and policy blocks)
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setAddressLoading(true);
      try {
        const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
        if (!response.ok) throw new Error("Geocode API error");

        const data = await response.json();

        if (data && data.success) {
          const establishment = data.establishment || "";
          const city = data.city || "";
          const state = data.state || "";
          const country = data.country || "";
          const pincode = data.pincode || "";
          const display_name =
            data.display_name || establishment || `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;

          setResolvedAddress(display_name);
          setResolvedEstablishment(establishment);
          if (country) setDetectedCountry(country);

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
        console.warn("Reverse geocode fallback to coords:", err);
        const fallbackName = `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
        setResolvedAddress(fallbackName);
        onLocationSelect({
          lat,
          lng,
          address: { display_name: fallbackName },
        });
      } finally {
        setAddressLoading(false);
      }
    },
    [onLocationSelect]
  );

  // Position Leaflet Marker without re-creating map
  const setMarkerOnMap = useCallback(
    (lat: number, lng: number, pan = true) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      if (!markerInstanceRef.current) {
        const marker = L.marker([lat, lng], {
          draggable: !readOnly,
          icon: createBrandPinIcon(),
        }).addTo(map);

        if (!readOnly) {
          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            setActivePin({ lat: pos.lat, lng: pos.lng });
            reverseGeocode(pos.lat, pos.lng);
          });
        }

        markerInstanceRef.current = marker;
      } else {
        markerInstanceRef.current.setLatLng([lat, lng]);
      }

      if (pan) {
        map.flyTo([lat, lng], Math.max(map.getZoom(), 16), {
          duration: 1.2,
          easeLinearity: 0.25,
        });
      }
    },
    [readOnly, reverseGeocode]
  );

  // Handle location pick via click or drag
  const handleLocationPick = useCallback(
    (lat: number, lng: number, pan = true) => {
      setActivePin({ lat, lng });
      setMarkerOnMap(lat, lng, pan);
      reverseGeocode(lat, lng);
    },
    [setMarkerOnMap, reverseGeocode]
  );

  // Initialize Map exactly ONCE on mount (prevents map vibration and re-render loops)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const startCoords = initialPosition || DEFAULT_INDIA_COORDS;

    // Create Leaflet Map instance
    const map = L.map(mapContainerRef.current, {
      center: [startCoords.lat, startCoords.lng],
      zoom: initialPosition ? 16 : 13,
      zoomControl: true,
      attributionControl: true,
      fadeAnimation: false, // Prevents tile vibration
    });

    // Add standard OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Attach click listener
    if (!readOnly) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        handleLocationPick(e.latlng.lat, e.latlng.lng, false);
      });
    }

    // ResizeObserver ensures smooth, vibration-free layout resizing
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Auto-detect user's location & country
    if (initialPosition) {
      setMarkerOnMap(initialPosition.lat, initialPosition.lng, false);
      reverseGeocode(initialPosition.lat, initialPosition.lng);
    } else {
      setDetectingLocation(true);

      // Phase 1: Fast IP Geolocation (Jio and Indian ISP compatible)
      fetch("/api/geocode/ip")
        .then((res) => res.json())
        .then((ipData) => {
          if (ipData && ipData.success && ipData.lat && ipData.lng) {
            setUserCoords({ lat: ipData.lat, lng: ipData.lng });
            if (ipData.country) setDetectedCountry(ipData.country);

            // Center map on user's region
            map.setView([ipData.lat, ipData.lng], 14);
            handleLocationPick(ipData.lat, ipData.lng, false);
          }
        })
        .catch(() => {})
        .finally(() => {
          setDetectingLocation(false);
        });

      // Phase 2: Refine with Leaflet GPS if permitted
      map.locate({ maxZoom: 16, enableHighAccuracy: true });

      map.on("locationfound", (e: L.LocationEvent) => {
        setDetectingLocation(false);
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        setUserCoords({ lat, lng });
        handleLocationPick(lat, lng, true);
      });
    }

    // Clean up on component unmount
    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
  }, []); // Run once on mount!

  // Proximity-Biased Establishment Search via internal server proxy
  const performSearch = async (query: string, filterCategory?: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const biasCoords = userCoords || activePin || DEFAULT_INDIA_COORDS;
      let url = `/api/geocode/search?q=${encodeURIComponent(trimmed)}`;
      if (biasCoords) {
        url += `&lat=${biasCoords.lat}&lng=${biasCoords.lng}`;
      }
      if (filterCategory) {
        url += `&category=${filterCategory}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          setSearchResults(data.results);
          setShowDropdown(true);
        } else {
          setSearchResults([]);
        }
      }
    } catch (err) {
      console.warn("Search API failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setActiveFilter("");

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
    handleLocationPick(item.lat, item.lng, true);
    setSearchQuery(item.name);
    setShowDropdown(false);

    if (item.raw) {
      const city = item.raw.city || "";
      const state = item.raw.state || "";
      const country = item.raw.country || "";
      const pincode = item.raw.postcode || "";
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
    }
  };

  // Nearby Filter Triggers
  const handleNearbyFilter = (term: string, filterKey: string) => {
    setActiveFilter(filterKey);
    setSearchQuery(term);
    performSearch(term, filterKey);
  };

  // Track Current Location using Leaflet map.locate
  const handleLocateMe = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setDetectingLocation(true);
    map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
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

  return (
    <div
      ref={rootContainerRef}
      className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-900 dark:border-slate-700 shadow-md bg-slate-100 dark:bg-slate-950 font-sans"
      style={{ height, minHeight: height }}
    >
      {/* Top Search Bar & Proximity Filters */}
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
              placeholder={
                detectedCountry
                  ? `Search nearby establishments in ${detectedCountry} or worldwide...`
                  : "Search nearby establishments, food banks, hospitals..."
              }
              className="w-full px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white bg-transparent border-0 focus:outline-none placeholder:text-slate-400"
            />
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-sky-900 dark:text-sky-400 animate-spin mr-3 shrink-0" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("");
                  setSearchResults([]);
                  setShowDropdown(false);
                }}
                className="p-1 mr-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}

            {/* GPS Locate Me Button using Leaflet locate */}
            <button
              type="button"
              onClick={handleLocateMe}
              title="Track Current Device Location via Leaflet"
              className="px-2.5 py-1.5 mr-2 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-900 dark:text-sky-200 text-[10px] font-bold border border-sky-300 dark:border-sky-800 flex items-center gap-1 shrink-0 transition-colors"
            >
              {detectingLocation ? (
                <Loader2 className="w-3 h-3 text-sky-900 dark:text-sky-400 animate-spin" />
              ) : (
                <Crosshair className="w-3 h-3 text-sky-900 dark:text-sky-400" />
              )}
              <span className="hidden sm:inline">My Location</span>
            </button>
          </div>

          {/* Nearby Proximity Filter Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0 ml-1">
              Nearby:
            </span>
            <button
              type="button"
              onClick={() => handleNearbyFilter("Hospital", "hospital")}
              className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-bold transition-colors shadow-sm shrink-0 flex items-center gap-1 ${
                activeFilter === "hospital"
                  ? "bg-sky-900 text-white border-sky-900"
                  : "bg-white/95 dark:bg-slate-900/95 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-900 dark:hover:text-rose-300"
              }`}
            >
              <Building2 className="w-2.5 h-2.5 text-rose-600" />
              <span>Hospitals</span>
            </button>
            <button
              type="button"
              onClick={() => handleNearbyFilter("Food Bank", "foodbank")}
              className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-bold transition-colors shadow-sm shrink-0 flex items-center gap-1 ${
                activeFilter === "foodbank"
                  ? "bg-sky-900 text-white border-sky-900"
                  : "bg-white/95 dark:bg-slate-900/95 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-900 dark:hover:text-sky-300"
              }`}
            >
              <Building2 className="w-2.5 h-2.5 text-sky-700" />
              <span>Food Banks</span>
            </button>
            <button
              type="button"
              onClick={() => handleNearbyFilter("Market", "market")}
              className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-bold transition-colors shadow-sm shrink-0 flex items-center gap-1 ${
                activeFilter === "market"
                  ? "bg-sky-900 text-white border-sky-900"
                  : "bg-white/95 dark:bg-slate-900/95 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-900 dark:hover:text-emerald-300"
              }`}
            >
              <Store className="w-2.5 h-2.5 text-emerald-600" />
              <span>Markets</span>
            </button>
            <button
              type="button"
              onClick={() => handleNearbyFilter("Landmark", "landmark")}
              className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-bold transition-colors shadow-sm shrink-0 flex items-center gap-1 ${
                activeFilter === "landmark"
                  ? "bg-sky-900 text-white border-sky-900"
                  : "bg-white/95 dark:bg-slate-900/95 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-900 dark:hover:text-amber-300"
              }`}
            >
              <Landmark className="w-2.5 h-2.5 text-amber-600" />
              <span>Landmarks</span>
            </button>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showDropdown && (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border-2 border-slate-900 dark:border-slate-700 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {searchResults.length > 0 ? (
                searchResults.map((item, idx) => (
                  <button
                    key={`${item.id}-${idx}`}
                    type="button"
                    onClick={() => handleSelectResult(item)}
                    className="w-full text-left p-2.5 hover:bg-sky-50 dark:hover:bg-slate-800/80 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    {getCategoryIcon(item.category)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.distanceKm !== undefined && (
                            <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 font-bold bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                              {item.distanceKm < 1
                                ? `${Math.round(item.distanceKm * 1000)}m`
                                : `${item.distanceKm}km`}
                            </span>
                          )}
                          {item.tag && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {item.tag.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
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
                  {isSearching ? "Searching nearby OpenStreetMap establishments..." : "No establishments found nearby"}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Vibration-Free Leaflet Map DOM Element */}
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
        }}
      />

      {/* Bottom Status Bar */}
      <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-md text-white px-3 py-2 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-mono shadow-xl z-900 pointer-events-none">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">
            {addressLoading
              ? "Resolving OpenStreetMap address..."
              : detectingLocation
              ? "Detecting your location & country..."
              : resolvedAddress ||
                (activePin
                  ? "Present location tagged"
                  : "Click map or search nearby establishments to drop pin")}
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {detectedCountry && (
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1">
              <Navigation className="w-2.5 h-2.5 text-sky-400" />
              <span>{detectedCountry}</span>
            </span>
          )}
          {resolvedEstablishment && (
            <span className="bg-sky-900/80 text-sky-200 px-2 py-0.5 rounded text-[10px] font-sans font-bold">
              {resolvedEstablishment}
            </span>
          )}
          <span className="text-sky-300 font-bold">
            {activePin
              ? `${activePin.lat.toFixed(5)}°, ${activePin.lng.toFixed(5)}°`
              : userCoords
              ? `${userCoords.lat.toFixed(5)}°, ${userCoords.lng.toFixed(5)}°`
              : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
