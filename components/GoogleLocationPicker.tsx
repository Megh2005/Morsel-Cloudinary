"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Search, MapPin } from "lucide-react";

interface GoogleLocationPickerProps {
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

// Brand-tailored custom map styling for Morsel (clean, premium ocean/navy and slate harmony)
const MORSEL_MAP_STYLES: any[] = [
  {
    featureType: "administrative",
    elementType: "labels.text.fill",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [{ color: "#94a3b8" }, { weight: 1.2 }],
  },
  {
    featureType: "landscape",
    elementType: "geometry.fill",
    stylers: [{ color: "#f8fafc" }],
  },
  {
    featureType: "poi",
    elementType: "geometry.fill",
    stylers: [{ color: "#f1f5f9" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry.fill",
    stylers: [{ color: "#ecfdf5" }],
  },
  {
    featureType: "poi.business",
    elementType: "labels.icon",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#e0f2fe" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0284c7" }, { weight: 0.8 }],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: "#bae6fd" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#0369a1" }],
  },
];

declare global {
  interface Window {
    google?: any;
    initGoogleMapsPromise?: Promise<void>;
  }
}

// Global script loader helper to ensure Google Maps JS is loaded only once
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject("Window is undefined");
  if (window.google?.maps) return Promise.resolve();

  if (window.initGoogleMapsPromise) {
    return window.initGoogleMapsPromise;
  }

  window.initGoogleMapsPromise = new Promise((resolve, reject) => {
    // Check if script tag already exists in DOM
    const existingScript = document.getElementById("google-maps-sdk");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-sdk";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return window.initGoogleMapsPromise;
}

export default function GoogleLocationPicker({
  onLocationSelect,
  initialPosition = null,
  readOnly = false,
  height = "420px",
}: GoogleLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(
    initialPosition || { lat: 22.5697, lng: 88.3697 } // Default Kolkata
  );
  const [addressLoading, setAddressLoading] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>("");

  const mapInstanceRef = useRef<any | null>(null);
  const markerInstanceRef = useRef<any | null>(null);
  const geocoderRef = useRef<any | null>(null);
  const autocompleteRef = useRef<any | null>(null);

  // Reverse geocoding helper using Google Geocoder API
  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (!geocoderRef.current) return;
      setAddressLoading(true);

      const latlng = { lat, lng };
      geocoderRef.current.geocode({ location: latlng }, (results: any, status: any) => {
        setAddressLoading(false);
        if (status === "OK" && results && results[0]) {
          const res = results[0];
          let city = "";
          let state = "";
          let country = "";
          let pincode = "";
          let establishment = "";

          for (const comp of res.address_components) {
            const types = comp.types;
            if (types.includes("locality") || types.includes("sublocality_level_1")) {
              city = comp.long_name;
            } else if (types.includes("administrative_area_level_1")) {
              state = comp.long_name;
            } else if (types.includes("country")) {
              country = comp.long_name;
            } else if (types.includes("postal_code")) {
              pincode = comp.long_name;
            } else if (types.includes("point_of_interest") || types.includes("establishment")) {
              establishment = comp.long_name;
            }
          }

          const display_name = res.formatted_address;
          setResolvedAddress(display_name);

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
      });
    },
    [onLocationSelect]
  );

  // Initialize Map
  useEffect(() => {
    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      "";

    if (!apiKey) {
      setMapError("Google Maps API Key is not configured.");
      return;
    }

    let isMounted = true;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!isMounted || !mapContainerRef.current) return;

        const defaultPos = initialPosition || { lat: 22.5697, lng: 88.3697 };
        geocoderRef.current = new window.google.maps.Geocoder();

        // Create Google Map instance with customized Morsel brand palette
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: defaultPos,
          zoom: 16,
          styles: MORSEL_MAP_STYLES,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: !readOnly,
          gestureHandling: "greedy",
        });
        mapInstanceRef.current = map;

        // Custom Brand Pin Icon for Morsel (Navy/Sky with white core)
        const pinIcon = {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: "#0369a1", // Sky-700
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#0f172a", // Slate-900 border
          scale: 1.8,
          anchor: new window.google.maps.Point(12, 22),
        };

        // Marker instance
        const marker = new window.google.maps.Marker({
          position: defaultPos,
          map,
          draggable: !readOnly,
          icon: pinIcon,
          animation: window.google.maps.Animation.DROP,
          title: "Drag to set exact field capture location",
        });
        markerInstanceRef.current = marker;

        // Marker dragend event
        if (!readOnly) {
          marker.addListener("dragend", () => {
            const pos = marker.getPosition();
            if (pos) {
              const lat = pos.lat();
              const lng = pos.lng();
              setCurrentCoords({ lat, lng });
              reverseGeocode(lat, lng);
            }
          });

          // Map click event to relocate marker
          map.addListener("click", (e: any) => {
            if (e.latLng) {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              marker.setPosition(e.latLng);
              setCurrentCoords({ lat, lng });
              reverseGeocode(lat, lng);
            }
          });

          // Initialize Places Autocomplete with GLOBAL establishment coverage
          if (searchInputRef.current) {
            const autocomplete = new window.google.maps.places.Autocomplete(
              searchInputRef.current,
              {
                fields: ["geometry", "formatted_address", "address_components", "name"],
                // Unrestricted bounds & types to support all establishments in all countries worldwide
              }
            );
            autocompleteRef.current = autocomplete;
            autocomplete.bindTo("bounds", map);

            autocomplete.addListener("place_changed", () => {
              const place = autocomplete.getPlace();
              if (!place.geometry || !place.geometry.location) {
                return;
              }

              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();

              map.panTo({ lat, lng });
              map.setZoom(17);
              marker.setPosition({ lat, lng });
              setCurrentCoords({ lat, lng });

              // Extract address components from place
              let city = "";
              let state = "";
              let country = "";
              let pincode = "";
              let establishment = place.name || "";

              if (place.address_components) {
                for (const comp of place.address_components) {
                  const types = comp.types;
                  if (types.includes("locality") || types.includes("sublocality_level_1")) {
                    city = comp.long_name;
                  } else if (types.includes("administrative_area_level_1")) {
                    state = comp.long_name;
                  } else if (types.includes("country")) {
                    country = comp.long_name;
                  } else if (types.includes("postal_code")) {
                    pincode = comp.long_name;
                  }
                }
              }

              const display_name = place.formatted_address || place.name || "";
              setResolvedAddress(display_name);

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
            });
          }
        }

        // Trigger initial reverse geocode
        reverseGeocode(defaultPos.lat, defaultPos.lng);
        setMapLoaded(true);
      })
      .catch((err) => {
        console.error("Google Maps load error:", err);
        setMapError("Failed to initialize Google Maps. Please check network or API key.");
      });

    return () => {
      isMounted = false;
    };
  }, [readOnly, reverseGeocode, initialPosition]);

  // Update marker if initialPosition changes externally
  useEffect(() => {
    if (initialPosition && markerInstanceRef.current && mapInstanceRef.current) {
      markerInstanceRef.current.setPosition(initialPosition);
      mapInstanceRef.current.panTo(initialPosition);
      setCurrentCoords(initialPosition);
    }
  }, [initialPosition]);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-900 dark:border-slate-700 shadow-md bg-slate-100 dark:bg-slate-900"
      style={{ height }}
    >
      {/* Search Bar Overlay with Places Autocomplete (Global Establishments) */}
      {!readOnly && (
        <div className="absolute top-3 left-3 right-3 z-10 max-w-lg mx-auto">
          <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-xl shadow-lg border-2 border-slate-900 dark:border-slate-700 overflow-hidden">
            <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search any place, market, cafe, shelter or city worldwide..."
              className="w-full px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white bg-transparent border-0 focus:outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      )}

      {/* Main Google Maps DOM Node */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-slate-100/90 dark:bg-slate-900/90 flex flex-col items-center justify-center space-y-2 z-20 backdrop-blur-xs">
          <Loader2 className="w-8 h-8 animate-spin text-sky-900 dark:text-sky-400" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Initializing High-Precision Google Map...
          </p>
        </div>
      )}

      {/* Error Fallback Overlay */}
      {mapError && (
        <div className="absolute inset-0 bg-rose-50/95 dark:bg-rose-950/95 flex flex-col items-center justify-center p-6 text-center z-20">
          <MapPin className="w-10 h-10 text-rose-600 mb-2" />
          <p className="text-sm font-bold text-rose-900 dark:text-rose-200">{mapError}</p>
          <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
            Please ensure Maps JavaScript API and Places API are enabled in Google Cloud Console.
          </p>
        </div>
      )}

      {/* Address Resolution Bar */}
      <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-white/10 flex items-center justify-between text-[11px] font-mono shadow-md z-10">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">
            {addressLoading ? "Resolving address..." : resolvedAddress || "Pin dropped on map"}
          </span>
        </div>
        <span className="shrink-0 text-sky-300 font-bold ml-2">
          {currentCoords.lat.toFixed(4)}°, {currentCoords.lng.toFixed(4)}°
        </span>
      </div>
    </div>
  );
}
