"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Utensils,
  Leaf,
  MapPin,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Loader2,
  Upload,
  HeartHandshake,
  ShieldCheck,
  Building2,
  FileCheck,
  X,
  Share2,
  Check,
  AlertCircle,
  Truck,
  PackageCheck,
} from "lucide-react";
import { toast } from "react-toastify";

// Dynamically import OpenStreetMap Location Picker (Client-Side Only)
const OpenStreetMapLocationPicker = dynamic(
  () => import("@/components/OpenStreetMapLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 animate-pulse text-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-sky-900 dark:text-sky-400 mb-2" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Loading OpenStreetMap Explorer...
        </p>
      </div>
    ),
  }
);

interface LocationData {
  lat: number;
  lng: number;
  display_name?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  establishment?: string;
}

export default function RescueBridgePage() {
  // Navigation view: 'board' | 'create' | 'map'
  const [activeView, setActiveView] = useState<"board" | "create" | "map">("board");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dynamic MongoDB Dispatches (No hardcoded dummy data)
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State: Create Dispatch
  const [title, setTitle] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorType, setDonorType] = useState("restaurant");
  const [foodCategory, setFoodCategory] = useState("Prepared Meals");
  const [urgency, setUrgency] = useState<"urgent_2h" | "today" | "flexible">("today");
  const [description, setDescription] = useState("");
  const [foodPhoto, setFoodPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");

  // Claim Modal State
  const [claimDispatch, setClaimDispatch] = useState<any | null>(null);
  const [ngoNameInput, setNgoNameInput] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);

  // Handoff Verification Modal State
  const [verifyDispatch, setVerifyDispatch] = useState<any | null>(null);
  const [handoffPhoto, setHandoffPhoto] = useState<File | null>(null);
  const [handoffPreview, setHandoffPreview] = useState<string | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Digital Impact Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  // Fetch real dispatches from MongoDB
  const fetchDispatches = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rescue/dispatch");
      const data = await res.json();
      if (data.success && Array.isArray(data.dispatches)) {
        setDispatches(data.dispatches);
      }
    } catch (err) {
      console.error("Failed to load dispatches:", err);
      toast.error("Could not load rescue dispatches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  // Handle Photo Upload Preview
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFoodPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleHandoffPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setHandoffPhoto(file);
      setHandoffPreview(URL.createObjectURL(file));
    }
  };

  // Submit New Surplus Food Dispatch
  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodPhoto) {
      toast.error("Please take or upload a photo of the surplus food");
      return;
    }
    if (!pickupLocation) {
      toast.error("Please pin the pickup location on the map");
      return;
    }

    setIsSubmitting(true);
    setSubmitStep("Uploading media to Cloudinary...");

    try {
      const formData = new FormData();
      formData.append("file", foodPhoto);
      formData.append("title", title);
      formData.append("donorName", donorName || "Anonymous Community Donor");
      formData.append("donorType", donorType);
      formData.append("foodCategory", foodCategory);
      formData.append("urgency", urgency);
      formData.append("description", description);
      formData.append("lat", pickupLocation.lat.toString());
      formData.append("lng", pickupLocation.lng.toString());
      formData.append("display_name", pickupLocation.display_name || "");
      formData.append("city", pickupLocation.city || "");
      formData.append("state", pickupLocation.state || "");
      formData.append("country", pickupLocation.country || "India");
      formData.append("establishment", pickupLocation.establishment || "");

      setSubmitStep("Evaluating freshness & meal servings with Gemini AI...");

      const res = await fetch("/api/rescue/dispatch", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create rescue dispatch");
      }

      toast.success("Food rescue dispatch published! Local NGOs notified.");

      // Reset form
      setTitle("");
      setDonorName("");
      setDescription("");
      setFoodPhoto(null);
      setPhotoPreview(null);
      setPickupLocation(null);

      // Refresh dispatches and switch to board
      await fetchDispatches();
      setActiveView("board");
    } catch (err: any) {
      console.error("Create dispatch error:", err);
      toast.error(err.message || "Failed to publish surplus food");
    } finally {
      setIsSubmitting(false);
      setSubmitStep("");
    }
  };

  // Claim Dispatch for NGO / Volunteer
  const handleClaimSubmit = async () => {
    if (!claimDispatch || !ngoNameInput.trim()) {
      toast.error("Please enter the claiming NGO or shelter name");
      return;
    }

    setIsClaiming(true);
    try {
      const res = await fetch("/api/rescue/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchId: claimDispatch._id,
          ngoName: ngoNameInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to claim food rescue");
      }

      toast.success(`Claimed by ${ngoNameInput}! Coordinated pickup scheduled.`);
      setClaimDispatch(null);
      setNgoNameInput("");
      await fetchDispatches();
    } catch (err: any) {
      toast.error(err.message || "Could not claim rescue");
    } finally {
      setIsClaiming(false);
    }
  };

  // Submit Visual Handoff & Verify Delivery
  const handleVerifyHandoff = async () => {
    if (!verifyDispatch || !handoffPhoto) {
      toast.error("Please upload photo proof of the delivered meals");
      return;
    }

    setIsVerifying(true);
    try {
      const formData = new FormData();
      formData.append("dispatchId", verifyDispatch._id);
      formData.append("file", handoffPhoto);
      formData.append("deliveryNotes", deliveryNotes);

      const res = await fetch("/api/rescue/verify-handoff", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to verify delivery proof");
      }

      toast.success("Delivery verified! Digital impact receipt generated.");
      setVerifyDispatch(null);
      setHandoffPhoto(null);
      setHandoffPreview(null);
      setDeliveryNotes("");

      if (data.receipt) {
        setActiveReceipt(data.receipt);
      }
      await fetchDispatches();
    } catch (err: any) {
      toast.error(err.message || "Could not verify handoff");
    } finally {
      setIsVerifying(false);
    }
  };

  // Filtered dispatches
  const filteredDispatches = dispatches.filter((d) => {
    if (statusFilter === "all") return true;
    return d.status === statusFilter;
  });

  // Calculate live stats
  const totalMealsRescued = dispatches
    .filter((d) => d.status === "delivered")
    .reduce((sum, d) => sum + (d.estimatedServings || 0), 0);
  const totalCo2Prevented = dispatches
    .filter((d) => d.status === "delivered")
    .reduce((sum, d) => sum + (d.co2DivertedKg || 0), 0);
  const activeDispatchesCount = dispatches.filter((d) => d.status === "available").length;

  return (
    <div className="w-[90%] max-w-6xl mx-auto py-8 space-y-8 font-sans pb-28">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-slate-900/10 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold mb-2">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Morsel RescueBridge &bull; Food Rescue & NGO Relief</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Surplus Food Dispatch & Relief Engine
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mt-1 leading-relaxed">
            Connect food surplus from restaurants and citizens directly with local NGOs and
            shelters. AI verifies food safety, OpenStreetMap powers pickup coordination, and
            visual handoff proof generates certified impact receipts.
          </p>
        </div>

        {/* Action Button: Post Food */}
        <button
          type="button"
          onClick={() => setActiveView("create")}
          className="self-start md:self-auto px-5 py-3 rounded-2xl bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Post Surplus Food</span>
        </button>
      </div>

      {/* 2. Live Dynamic Metrics (Computed from user's live data) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {totalMealsRescued.toLocaleString()}
            </p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Meals Delivered
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {totalCo2Prevented.toLocaleString()} kg
            </p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              CO2 Diverted
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {activeDispatchesCount}
            </p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Pickups Available
            </p>
          </div>
        </div>
      </div>

      {/* 3. Primary Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveView("board")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === "board"
                ? "bg-sky-900 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
            }`}
          >
            Dispatch Board
          </button>
          <button
            type="button"
            onClick={() => setActiveView("create")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === "create"
                ? "bg-sky-900 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
            }`}
          >
            Post Surplus
          </button>
          <button
            type="button"
            onClick={() => setActiveView("map")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === "map"
                ? "bg-sky-900 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
            }`}
          >
            OpenStreetMap View
          </button>
        </div>

        {/* Filter Pills in Board view */}
        {activeView === "board" && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                statusFilter === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              All ({dispatches.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("available")}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                statusFilter === "available"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Available
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("claimed")}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                statusFilter === "claimed"
                  ? "bg-sky-700 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              In Transit
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("delivered")}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                statusFilter === "delivered"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Delivered
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: Dispatch Board */}
      {activeView === "board" && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-sky-900 dark:text-sky-400 mx-auto" />
              <p className="text-xs font-bold text-slate-500">
                Loading live food rescue dispatches...
              </p>
            </div>
          ) : filteredDispatches.length === 0 ? (
            /* Clean, Inspiring Empty State */
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-400 flex items-center justify-center mx-auto">
                <Utensils className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  No Active Food Rescue Dispatches
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Have leftover food from a banquet, restaurant, or grocery store? Publish a
                  dispatch to notify nearby shelters and volunteers for quick pickup.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveView("create")}
                className="px-6 py-2.5 rounded-2xl bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Post Your First Food Dispatch</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDispatches.map((dispatch) => (
                <div
                  key={dispatch._id}
                  className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-md overflow-hidden flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Food Photo Container */}
                    <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <img
                        src={dispatch.surplusMediaUrl}
                        alt={dispatch.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Urgency Badge */}
                      <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/20">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>
                          {dispatch.urgency === "urgent_2h"
                            ? "Pickup < 2 Hours"
                            : dispatch.urgency === "today"
                            ? "Pickup Today"
                            : "Flexible Pickup"}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        {dispatch.status === "available" && (
                          <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                            Available
                          </span>
                        )}
                        {dispatch.status === "claimed" && (
                          <span className="bg-sky-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                            In Transit
                          </span>
                        )}
                        {dispatch.status === "delivered" && (
                          <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-900 dark:text-sky-300 mb-1">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{dispatch.donorName}</span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="text-slate-500 capitalize">{dispatch.donorType}</span>
                        </div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                          {dispatch.title}
                        </h3>
                      </div>

                      {/* AI Verified Signals */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {dispatch.estimatedServings} Meals
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">
                            AI-Verified Volume
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {dispatch.co2DivertedKg} kg CO2
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">
                            Emissions Saved
                          </p>
                        </div>
                      </div>

                      {/* Location breakdown */}
                      <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400 pt-1">
                        <MapPin className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">
                          {dispatch.location?.display_name ||
                            dispatch.location?.city ||
                            "Pinned OpenStreetMap Location"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-5 pt-0">
                    {dispatch.status === "available" && (
                      <button
                        type="button"
                        onClick={() => {
                          setClaimDispatch(dispatch);
                          setNgoNameInput("");
                        }}
                        className="w-full py-2.5 rounded-xl bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
                      >
                        <HeartHandshake className="w-4 h-4" />
                        <span>Claim for NGO / Shelter</span>
                      </button>
                    )}

                    {dispatch.status === "claimed" && (
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyDispatch(dispatch);
                          setHandoffPhoto(null);
                          setHandoffPreview(null);
                        }}
                        className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Handoff Proof</span>
                      </button>
                    )}

                    {dispatch.status === "delivered" && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReceipt({
                            receiptId: `REC-${dispatch._id.slice(-6).toUpperCase()}`,
                            donorName: dispatch.donorName,
                            recipientNgo: dispatch.claimedByNgoName || "Verified Community Shelter",
                            foodCategory: dispatch.foodCategory,
                            servingsDelivered: dispatch.estimatedServings,
                            co2PreventedKg: dispatch.co2DivertedKg,
                            deliveredAt: dispatch.deliveredAt || dispatch.updatedAt,
                            location: dispatch.location,
                            surplusPhoto: dispatch.surplusMediaUrl,
                            handoffPhoto: dispatch.handoffMediaUrl || dispatch.surplusMediaUrl,
                          });
                        }}
                        className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5"
                      >
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <span>View Verified Impact Receipt</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Create Surplus Dispatch */}
      {activeView === "create" && (
        <form
          onSubmit={handleCreateDispatch}
          className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-xl space-y-8"
        >
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Dispatch Surplus Food for Rescue
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Prevent food waste by notifying local NGOs and volunteers. AI evaluates the food
              photo to estimate servings and CO2 diverted.
            </p>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Surplus Food Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 40 Prepared Buffet Meals, Bakery Surplus, Fresh Veggies"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Donor Name / Organization
                </label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="e.g. Royal Grand Hotel, Baker's Pride, or Home Chef"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Donor Type
                </label>
                <select
                  value={donorType}
                  onChange={(e) => setDonorType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="restaurant">Restaurant / Cafe</option>
                  <option value="caterer">Event Caterer / Banquet</option>
                  <option value="bakery">Bakery / Patisserie</option>
                  <option value="supermarket">Grocery / Supermarket</option>
                  <option value="household">Household / Citizen</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Food Category
                </label>
                <select
                  value={foodCategory}
                  onChange={(e) => setFoodCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Prepared Meals">Prepared / Cooked Meals</option>
                  <option value="Bakery & Grains">Bakery & Bread</option>
                  <option value="Fresh Produce">Fresh Fruits & Produce</option>
                  <option value="Dairy & Chilled">Dairy & Chilled</option>
                  <option value="Pantry Staples">Packaged & Pantry Goods</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pickup Urgency
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="urgent_2h">Urgent (Within 2 Hours)</option>
                  <option value="today">Today (Before Nightfall)</option>
                  <option value="flexible">Flexible (Storable)</option>
                </select>
              </div>
            </div>

            {/* Food Photo Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Surplus Food Photo *
              </label>
              <div className="relative border-2 border-dashed border-slate-900 dark:border-slate-700 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 transition-colors">
                {photoPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={photoPreview}
                      alt="Surplus Food Preview"
                      className="h-44 w-auto rounded-xl object-cover border-2 border-slate-900 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFoodPhoto(null);
                        setPhotoPreview(null);
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Upload photo of surplus food
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Gemini Multimodal AI will visually estimate meal portions and CO2 emissions
                      saved
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* OpenStreetMap Pickup Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Pickup Location on OpenStreetMap *
              </label>
              <p className="text-[11px] text-slate-500">
                Pin your pickup address or search for your venue or landmark.
              </p>
              <div className="w-full rounded-2xl overflow-hidden border-2 border-slate-900 dark:border-slate-700 shadow-md">
                <OpenStreetMapLocationPicker
                  onLocationSelect={(loc) => setPickupLocation(loc)}
                  height="360px"
                />
              </div>
            </div>
          </div>

          {/* Submission Feedback */}
          {isSubmitting && (
            <div className="p-4 rounded-2xl bg-sky-900 text-white text-center space-y-2 animate-pulse">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-bold">{submitStep}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveView("board")}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>Publish Rescue Dispatch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* VIEW 3: OpenStreetMap Live Explorer */}
      {activeView === "map" && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-xl space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              OpenStreetMap Rescue & Relief Network
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Browse food rescue hotspots, nearby community food banks, and shelters on
              OpenStreetMap.
            </p>
          </div>

          <div className="w-full rounded-2xl overflow-hidden border-2 border-slate-900 dark:border-slate-700 shadow-md">
            <OpenStreetMapLocationPicker
              onLocationSelect={() => {}}
              height="480px"
            />
          </div>
        </div>
      )}

      {/* Claim Modal for NGO / Shelter */}
      {claimDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Claim Food Rescue
              </h3>
              <button
                onClick={() => setClaimDispatch(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{claimDispatch.title}</p>
              <p className="text-slate-500">
                {claimDispatch.estimatedServings} Meals &bull; {claimDispatch.location?.city || "Local"}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                NGO / Shelter Organization Name *
              </label>
              <input
                type="text"
                required
                value={ngoNameInput}
                onChange={(e) => setNgoNameInput(e.target.value)}
                placeholder="e.g. Robin Hood Army, Local Langar Seva, or Youth Kitchen"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClaimDispatch(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClaimSubmit}
                disabled={isClaiming || !ngoNameInput.trim()}
                className="px-5 py-2 rounded-xl bg-sky-900 text-white text-xs font-bold disabled:opacity-50"
              >
                {isClaiming ? "Claiming..." : "Confirm Food Pickup"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Handoff Proof Modal */}
      {verifyDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Verify Delivery Proof
              </h3>
              <button
                onClick={() => setVerifyDispatch(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Upload photo evidence of the meals delivered to the shelter or community kitchen.
              This visual proof unlocks the verified digital impact receipt.
            </p>

            <div className="relative border-2 border-dashed border-slate-900 dark:border-slate-700 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-950/50">
              {handoffPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={handoffPreview}
                    alt="Handoff Proof"
                    className="h-40 rounded-xl object-cover border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setHandoffPhoto(null);
                      setHandoffPreview(null);
                    }}
                    className="text-xs text-rose-600 font-bold hover:underline"
                  >
                    Change Proof Photo
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Snap or upload delivery photo
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleHandoffPhotoSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Delivery Notes (Optional)
              </label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Distributed 45 hot meal plates at South Shelter kitchen"
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyDispatch(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyHandoff}
                disabled={isVerifying || !handoffPhoto}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
              >
                {isVerifying ? "Verifying..." : "Confirm & Generate Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Impact Receipt Modal (Certified Proof) */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Verified Food Rescue Receipt
                </span>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Before vs After Visual Proof Grid */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border-2 border-slate-900 dark:border-slate-700">
              <div className="relative h-28 bg-slate-100">
                <img
                  src={activeReceipt.surplusPhoto}
                  alt="Before Rescue"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 bg-black/70 text-[9px] font-bold text-white px-1.5 py-0.5 rounded">
                  Before: Surplus
                </span>
              </div>
              <div className="relative h-28 bg-slate-100">
                <img
                  src={activeReceipt.handoffPhoto}
                  alt="After Delivery"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 bg-emerald-950/80 text-[9px] font-bold text-emerald-200 px-1.5 py-0.5 rounded">
                  After: Delivered
                </span>
              </div>
            </div>

            {/* Verified Metrics */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Receipt ID:</span>
                <span className="font-mono font-bold text-sky-900 dark:text-sky-300">
                  {activeReceipt.receiptId}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Food Rescuer / Donor:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {activeReceipt.donorName}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Recipient Shelter:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {activeReceipt.recipientNgo}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Meals Rescued:</span>
                <span className="font-black text-emerald-600">
                  {activeReceipt.servingsDelivered} Meals
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Landfill Methane Averted:</span>
                <span className="font-bold text-sky-600">
                  {activeReceipt.co2PreventedKg} kg CO2e
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  toast.success("Impact Receipt link copied to clipboard!");
                  navigator.clipboard.writeText(window.location.href);
                }}
                className="w-full py-2.5 rounded-xl bg-sky-900 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Verified Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
