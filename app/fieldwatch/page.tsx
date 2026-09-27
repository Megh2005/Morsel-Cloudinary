"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Globe,
  MapPin,
  Camera,
  UploadCloud,
  CheckCircle2,
  Layers,
  Search,
  Crosshair,
  Sliders,
  X,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";

// Dynamically import GoogleLocationPicker with custom Morsel palette and global places autocomplete
const GoogleLocationPicker = dynamic(() => import("@/components/GoogleLocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-90 rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 animate-pulse text-center p-4">
      <Loader2 className="w-8 h-8 animate-spin text-sky-900 dark:text-sky-400 mb-2" />
      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
        Loading Interactive Map...
      </p>
      <p className="text-xs text-slate-500 mt-1">
        You will be able to search and pick your exact coordinates shortly.
      </p>
    </div>
  ),
});

interface LocationData {
  lat: number;
  lng: number;
  display_name?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export default function FieldWatchPage() {
  // Navigation tabs: 'create' | 'compare' | 'vault'
  const [activeTab, setActiveTab] = useState<"create" | "compare" | "vault">("create");

  // Projects state
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Form State
  const [projectTitle, setProjectTitle] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [phase, setPhase] = useState<"before" | "after">("before");
  const [activityType, setActivityType] = useState("surplus_harvest");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Geolocation State
  const [selectedLocation, setSelectedLocation] = useState<LocationData>({
    lat: 22.5697,
    lng: 88.3697,
    display_name: "Sealdah Wholesale Market, Bepin Behari Ganguly St, Bowbazar, Kolkata, West Bengal 700012",
    city: "Kolkata",
    state: "West Bengal",
    country: "India",
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationSource, setLocationSource] = useState<string>("default");

  // Submission & AI progress state
  const [submitting, setSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState("");

  // Compare slider state (0 to 100)
  const [sliderPos, setSliderPos] = useState(50);

  // Vault search filter
  const [vaultSearch, setVaultSearch] = useState("");

  // Map popup modal state
  const [inspectLocation, setInspectLocation] = useState<LocationData | null>(null);

  // Fetch real projects from DB
  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await fetch("/api/fieldwatch/projects");
      const data = await res.json();
      if (data.projects && data.projects.length > 0) {
        setProjects(data.projects);
        if (!activeProject) {
          setActiveProject(data.projects[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
      toast.error("Could not fetch field projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // HTML5 Browser Geolocation Auto-Detection
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let resolvedAddress: any = {
          city: "Detected Region",
          state: "",
          country: "India",
          display_name: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`,
        };

        try {
          const revRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const revData = await revRes.json();
          if (revData && revData.address) {
            resolvedAddress = {
              city:
                revData.address.city ||
                revData.address.town ||
                revData.address.village ||
                revData.address.county ||
                "",
              state: revData.address.state || "",
              country: revData.address.country || "India",
              pincode: revData.address.postcode || "",
              display_name: revData.display_name,
            };
          }
        } catch (revErr) {
          console.warn("Reverse geocode notice:", revErr);
        }

        setSelectedLocation({
          lat: latitude,
          lng: longitude,
          ...resolvedAddress,
        });
        setLocationSource("gps_browser");
        setGpsLoading(false);
        toast.success(`Locked coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      },
      (err) => {
        setGpsLoading(false);
        console.warn("GPS error:", err);
        toast.info("GPS unavailable. Search or click any point on the map below.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Location select from map picker
  const handleMapLocationSelect = (loc: any) => {
    setSelectedLocation({
      lat: loc.lat,
      lng: loc.lng,
      display_name: loc.address?.display_name || `Coordinates: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`,
      city: loc.address?.city || "",
      state: loc.address?.state || "",
      country: loc.address?.country || "India",
      pincode: loc.address?.pincode || "",
    });
    setLocationSource("map_picker");
  };

  // File pick handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Handle Form Submission
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please choose or take a field photo first.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmissionStep("1/3: Ingesting photo to Cloudinary DAM & analyzing EXIF metadata...");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", activeProject?._id || "new");
      formData.append("projectTitle", projectTitle.trim() || activeProject?.title || "Community Food Rescue Drive");
      formData.append("organizationName", organizationName.trim() || activeProject?.organizationName || "Morsel Volunteer Team");
      formData.append("category", "food_rescue");
      formData.append("phase", phase);
      formData.append("activityType", activityType);

      // Coordinates & Location details
      formData.append("lat", selectedLocation.lat.toString());
      formData.append("lng", selectedLocation.lng.toString());
      formData.append("display_name", selectedLocation.display_name || "");
      formData.append("city", selectedLocation.city || "");
      formData.append("state", selectedLocation.state || "");
      formData.append("country", selectedLocation.country || "India");
      formData.append("pincode", selectedLocation.pincode || "");
      formData.append("locationSource", locationSource);

      setSubmissionStep("2/3: Running Multimodal AI audit for meal counts and CO2 diversion...");

      const res = await fetch("/api/fieldwatch/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process field media");
      }

      setSubmissionStep("3/3: Stamping GPS coordinates & Cloudinary DAM audit context...");

      toast.success(
        `Field evidence verified! Coordinates (${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}) synced.`
      );

      // Reset form & reload
      setSelectedFile(null);
      setPreviewUrl(null);
      setProjectTitle("");
      await loadProjects();
      setActiveTab("compare");
    } catch (err: any) {
      console.error("Evidence upload error:", err);
      toast.error(err.message || "Failed to submit field evidence");
    } finally {
      setSubmitting(false);
      setSubmissionStep("");
    }
  };

  // Extract all evidence items across projects
  const allEvidence = projects.flatMap((p) => {
    const list = p.evidenceList || [];
    const beforeItem = p.beforeEvidence ? [p.beforeEvidence] : [];
    const afterItem = p.afterEvidence ? [p.afterEvidence] : [];
    return [...list, ...beforeItem, ...afterItem].map((e) => ({
      ...e,
      projectTitle: p.title,
      organizationName: p.organizationName,
    }));
  });

  const filteredEvidence = allEvidence.filter((item, idx, self) => {
    const unique =
      self.findIndex(
        (o) => (o._id && o._id === item._id) || o.cloudinaryPublicId === item.cloudinaryPublicId
      ) === idx;
    if (!unique) return false;

    if (!vaultSearch.trim()) return true;
    const q = vaultSearch.toLowerCase();
    const cityMatch = item.location?.city?.toLowerCase().includes(q);
    const titleMatch = item.projectTitle?.toLowerCase().includes(q) || item.title?.toLowerCase().includes(q);
    const coordsMatch = `${item.location?.lat},${item.location?.lng}`.includes(q);
    const itemMatch = (item.aiAnalysis?.detectedFoodItems || []).some((f: string) =>
      f.toLowerCase().includes(q)
    );
    return cityMatch || titleMatch || coordsMatch || itemMatch;
  });

  const activeBefore = activeProject?.beforeEvidence || null;
  const activeAfter = activeProject?.afterEvidence || null;

  return (
    <div className="w-[90%] max-w-6xl mx-auto py-8 sm:py-10 space-y-8 flex flex-col items-center">
      {/* ========================================================================= */}
      {/* 1. HORIZONTALLY CENTERED HERO & GUIDANCE HEADER                           */}
      {/* ========================================================================= */}
      <div className="w-full text-center space-y-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-100 dark:bg-sky-900/40 border border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200 text-xs font-bold uppercase tracking-wider">
          <Globe className="w-4 h-4 text-sky-800 dark:text-sky-300" />
          Morsel FieldWatch · Visual Evidence & Geotag Platform
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Verify Community Impact With{" "}
          <span className="text-sky-900 dark:text-sky-400 underline decoration-sky-500/40">
            Geotagged Evidence
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Record surplus food rescue and community meal distributions. Pin exact coordinates on the map,
          and automatically generate verifiable Before-and-After impact reports backed by Cloudinary DAM.
        </p>

        {/* 3-Step Clear Action Guide */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
          <div className="p-3.5 rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-sky-900 text-white font-black text-xs flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">Pin Field Location</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Search or pick the exact address on the map, or tap GPS.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-sky-900 text-white font-black text-xs flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">Upload Drive Media</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Take photo of surplus harvest or served community meals.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-sky-900 text-white font-black text-xs flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">AI & Geotag Audit</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Cloudinary stamps coordinates and calculates meals & CO2.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HORIZONTAL NAVIGATION PILLS                                            */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-center p-1.5 rounded-full border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md">
        <button
          onClick={() => setActiveTab("create")}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "create"
              ? "bg-sky-900 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload & Geotag</span>
        </button>

        <button
          onClick={() => setActiveTab("compare")}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "compare"
              ? "bg-sky-900 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Before & After Showcase</span>
        </button>

        <button
          onClick={() => setActiveTab("vault")}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "vault"
              ? "bg-sky-900 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Evidence Vault</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: UPLOAD MEDIA & MAP LOCATION PICKER                                 */}
      {/* ========================================================================= */}
      {activeTab === "create" && (
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Log Verified Field Evidence
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Select or search your location on the map, choose your field photograph, and run the verification audit.
            </p>
          </div>

          <form onSubmit={handleSubmitEvidence} className="space-y-6">
            {/* Step A: Choose Phase */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block text-center">
                Step 1: Select Operation Phase
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPhase("before");
                    setActivityType("surplus_harvest");
                  }}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                    phase === "before"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 shadow-sm"
                      : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-black uppercase">Phase 1: Baseline Surplus</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Crates of raw produce, market surplus, farm discards before rescue.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPhase("after");
                    setActivityType("meal_distribution");
                  }}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                    phase === "after"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-sm"
                      : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-black uppercase">Phase 2: Distribution Outcome</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Prepared community meals, meal box distribution, or living compost.
                  </p>
                </button>
              </div>
            </div>

            {/* Step B: Photo Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block text-center">
                Step 2: Choose Field Photograph
              </label>

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-6 text-center hover:border-sky-800 transition-colors max-w-2xl mx-auto">
                {previewUrl ? (
                  <div className="space-y-3">
                    <div className="relative w-full h-56 rounded-xl overflow-hidden shadow-inner bg-slate-950">
                      <img src={previewUrl} alt="Field preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Photo ready for AI audit. EXIF camera details will be automatically extracted.
                    </p>
                  </div>
                ) : (
                  <label className="cursor-pointer block py-4">
                    <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs font-bold text-sky-900 dark:text-sky-300">
                      Click to browse or take field photo
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Supports JPG, PNG, WEBP (Max 10MB)
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Step C: Drive & Organization Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Drive Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sealdah Morning Vegetable Rescue"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Organization / NGO Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morsel Community Aid Bengal"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Step D: Geolocation & Map Picker */}
            <div className="space-y-3 pt-4 border-t-2 border-slate-200 dark:border-slate-800 max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-center sm:text-left">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
                    <MapPin className="w-4 h-4 text-red-500" />
                    Step 3: Lock Geolocation Coordinates
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Use the search bar on the map, click anywhere, or tap "Use My GPS".
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={gpsLoading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-all shrink-0"
                >
                  {gpsLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-800" />
                  ) : (
                    <Crosshair className="w-3.5 h-3.5 text-sky-800" />
                  )}
                  <span>{gpsLoading ? "Detecting..." : "Use My Current GPS"}</span>
                </button>
              </div>

              {/* Active Coordinates Display Bar */}
              <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5 text-left">
                  <span className="text-[10px] font-black uppercase text-sky-800 dark:text-sky-300">
                    Active Coordinates Stamp
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {selectedLocation.display_name || "Location pinned on map"}
                  </p>
                </div>
                <div className="text-xs font-mono font-bold text-sky-950 dark:text-sky-200 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-sky-300 dark:border-sky-700 shrink-0 text-center">
                  Lat: {selectedLocation.lat.toFixed(6)}°, Lng: {selectedLocation.lng.toFixed(6)}°
                </div>
              </div>

              {/* Google Maps Location Picker Component with Places Autocomplete */}
              <div className="w-full rounded-2xl overflow-hidden border-2 border-slate-900 dark:border-slate-700 shadow-md">
                <GoogleLocationPicker
                  onLocationSelect={handleMapLocationSelect}
                  initialPosition={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                />
              </div>
            </div>

            {/* Submission Progress Feedback */}
            {submitting && (
              <div className="p-4 rounded-2xl bg-sky-900 text-white space-y-2 animate-pulse max-w-2xl mx-auto text-center">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-bold">{submissionStep}</span>
                </div>
                <p className="text-xs text-sky-200">
                  Syncing structured DAM context and geocoding coordinates...
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3.5 rounded-2xl bg-sky-900 hover:bg-sky-800 text-white font-black text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <span>{submitting ? "Auditing Evidence..." : "Audit & Sync with Cloudinary DAM"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INTERACTIVE BEFORE-AND-AFTER COMPARISON SHOWCASE                    */}
      {/* ========================================================================= */}
      {activeTab === "compare" && (
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Drive Selector Bar */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-sky-800 dark:text-sky-300">
                  Active Sustainability Project
                </span>
                {activeProject?.isSample && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-[10px] font-black border border-amber-300 dark:border-amber-700">
                    Sample Reference
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                {activeProject?.title || "Community Food Rescue Drive"}
              </h3>
              <p className="text-xs text-slate-500">
                Organized by: {activeProject?.organizationName || "Morsel Volunteer Team"}
              </p>
            </div>

            {/* Quick Switcher */}
            {projects.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {projects.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => setActiveProject(p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all whitespace-nowrap ${
                      activeProject?._id === p._id
                        ? "bg-sky-900 text-white border-sky-900"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {p.title.slice(0, 24)}...
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Before & After Interactive Comparator */}
          {activeBefore && activeAfter ? (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Interactive Impact Verification
                </h3>
                <p className="text-xs text-slate-500">
                  Drag the slider handle horizontally to reveal the direct physical transformation of rescued food surplus into community meals.
                </p>
              </div>

              {/* Split-Screen Slider Box */}
              <div className="relative w-full h-90 sm:h-115 rounded-2xl overflow-hidden select-none border-2 border-slate-900 dark:border-slate-700 shadow-inner bg-slate-950">
                {/* AFTER LAYER */}
                <div className="absolute inset-0 w-full h-full">
                  <img
                    src={activeAfter.cloudinaryUrl || activeAfter.transformedCardUrl}
                    alt="Outcome Evidence"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 right-4 bg-slate-950/85 backdrop-blur-md text-white p-3 rounded-xl border border-white/20 text-right shadow-lg max-w-55 pointer-events-none">
                    <span className="text-[10px] font-black uppercase text-emerald-400 block">
                      Phase 2: Distribution
                    </span>
                    <p className="text-xs font-bold truncate mt-0.5">{activeAfter.title}</p>
                    <p className="text-[10px] font-mono text-slate-300 mt-0.5">
                      Lat {activeAfter.location?.lat?.toFixed(4)}, Lng {activeAfter.location?.lng?.toFixed(4)}
                    </p>
                  </div>
                </div>

                {/* BEFORE LAYER WITH CLIP */}
                <div
                  className="absolute inset-0 w-full h-full overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  <img
                    src={activeBefore.cloudinaryUrl || activeBefore.transformedCardUrl}
                    alt="Baseline Evidence"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-slate-950/85 backdrop-blur-md text-white p-3 rounded-xl border border-white/20 shadow-lg max-w-55 pointer-events-none">
                    <span className="text-[10px] font-black uppercase text-amber-400 block">
                      Phase 1: Baseline Surplus
                    </span>
                    <p className="text-xs font-bold truncate mt-0.5">{activeBefore.title}</p>
                    <p className="text-[10px] font-mono text-slate-300 mt-0.5">
                      Lat {activeBefore.location?.lat?.toFixed(4)}, Lng {activeBefore.location?.lng?.toFixed(4)}
                    </p>
                  </div>
                </div>

                {/* Divider Line */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(0,0,0,0.9)] pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-xs shadow-xl border-2 border-slate-900">
                    <Sliders className="w-4 h-4" />
                  </div>
                </div>

                {/* Native touch range slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                  aria-label="Before and after split slider"
                />
              </div>

              {/* Side-by-Side Geotag Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                {/* Before Box */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">
                      Phase 1: Harvest Location
                    </span>
                    <button
                      onClick={() => setInspectLocation(activeBefore.location)}
                      className="text-xs font-bold text-sky-900 dark:text-sky-300 hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      View on Map
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {activeBefore.location?.display_name || "Tagged Field Location"}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500">
                    Coordinates: Lat {activeBefore.location?.lat?.toFixed(5)}°, Lng {activeBefore.location?.lng?.toFixed(5)}°
                  </p>
                </div>

                {/* After Box */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                      Phase 2: Distribution Location
                    </span>
                    <button
                      onClick={() => setInspectLocation(activeAfter.location)}
                      className="text-xs font-bold text-sky-900 dark:text-sky-300 hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      View on Map
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {activeAfter.location?.display_name || "Tagged Field Location"}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500">
                    Coordinates: Lat {activeAfter.location?.lat?.toFixed(5)}°, Lng {activeAfter.location?.lng?.toFixed(5)}°
                  </p>
                </div>
              </div>

              {/* Cumulative Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center pt-2">
                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Meals Rescued</span>
                  <p className="text-xl font-black text-sky-900 dark:text-sky-300 mt-0.5">
                    {activeProject?.totalMealsRescued || activeAfter.aiAnalysis?.estimatedMealsCount || 0}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">CO2 Diverted</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {(activeProject?.totalCo2DivertedKg || activeAfter.aiAnalysis?.co2DivertedKg || 0).toFixed(1)} kg
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">DAM Integrity</span>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-10 text-center space-y-4">
              <Layers className="w-12 h-12 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Incomplete Evidence Pair
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  To view an interactive Before-and-After split comparison, you need both a Baseline Surplus photo and an Outcome Distribution photo.
                </p>
              </div>
              <button
                onClick={() => {
                  setPhase(activeBefore ? "after" : "before");
                  setActiveTab("create");
                }}
                className="px-5 py-2.5 rounded-2xl bg-sky-900 text-white font-bold text-xs shadow-md"
              >
                Upload {activeBefore ? "After (Outcome)" : "Before (Surplus)"} Media
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRACEABLE EVIDENCE VAULT (GEOTAGGED GRID)                          */}
      {/* ========================================================================= */}
      {activeTab === "vault" && (
        <div className="w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-4xl mx-auto w-full">
            <div className="text-left">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Tamper-Evident Media Vault
              </h2>
              <p className="text-xs text-slate-500">
                Audited field media tagged with coordinates and Cloudinary DAM context.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search city, food, coords..."
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Evidence Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {filteredEvidence.map((ev, index) => {
              const isBefore = ev.phase === "before";
              return (
                <div
                  key={ev._id || index}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Image with Coordinates Overlay */}
                    <div className="relative w-full h-48 bg-slate-950 overflow-hidden">
                      <img
                        src={ev.cloudinaryUrl || ev.transformedCardUrl}
                        alt={ev.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-md ${
                            isBefore
                              ? "bg-amber-500 text-slate-950"
                              : "bg-emerald-500 text-slate-950"
                          }`}
                        >
                          {isBefore ? "Phase: Before" : "Phase: After"}
                        </span>
                      </div>

                      {/* Coordinates Stamp */}
                      <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-md rounded-lg px-2.5 py-1.5 flex items-center justify-between text-white text-[11px] font-mono border border-white/10">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">
                            {ev.location?.lat ? `${ev.location.lat.toFixed(4)}°, ${ev.location.lng.toFixed(4)}°` : "No GPS"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 uppercase font-sans font-bold">
                          {ev.location?.city || "Geo"}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Content */}
                    <div className="p-5 space-y-3 text-left">
                      <div>
                        <span className="text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wide">
                          {ev.organizationName || "Community Initiative"}
                        </span>
                        <h4 className="text-base font-black text-slate-900 dark:text-white line-clamp-1 mt-0.5">
                          {ev.title || "Field Evidence"}
                        </h4>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">
                          {ev.location?.display_name || `${ev.location?.city}, ${ev.location?.state}`}
                        </span>
                      </div>

                      {/* AI Audit Pill */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Impact</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {ev.aiAnalysis?.estimatedMealsCount || 0} Meals Rescued
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Carbon Diverted</span>
                          <span className="font-black text-sky-800 dark:text-sky-300">
                            {ev.aiAnalysis?.co2DivertedKg || 0} kg CO2
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-5 pt-0 flex items-center gap-2">
                    <button
                      onClick={() => setInspectLocation(ev.location)}
                      className="flex-1 py-2 px-3 rounded-xl border-2 border-slate-900 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-800" />
                      Inspect on Map
                    </button>
                    <a
                      href={ev.cloudinaryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl border-2 border-slate-900 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="View Raw Cloudinary Master Asset"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. INSPECT ON MAP POPUP MODAL                                             */}
      {/* ========================================================================= */}
      {inspectLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-black uppercase text-sky-800 dark:text-sky-400">
                  Verified Geotag Inspection
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Field Capture Coordinates
                </h3>
              </div>
              <button
                onClick={() => setInspectLocation(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border text-xs space-y-1 font-mono text-left">
              <p className="font-bold text-slate-900 dark:text-white font-sans text-sm">
                {inspectLocation.display_name || "Tagged Field Location"}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Latitude: {inspectLocation.lat}° | Longitude: {inspectLocation.lng}°
              </p>
            </div>

            <div className="w-full h-80 rounded-2xl overflow-hidden border-2 border-slate-900 dark:border-slate-700">
              <GoogleLocationPicker
                readOnly
                initialPosition={{ lat: inspectLocation.lat, lng: inspectLocation.lng }}
                onLocationSelect={() => {}}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setInspectLocation(null)}
                className="px-5 py-2 rounded-xl bg-sky-900 text-white text-xs font-bold"
              >
                Close Map Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
