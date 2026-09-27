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
  Sparkles,
  ChefHat,
  MessageSquare,
  Send,
  User,
  Phone,
  Timer,
  Info,
  ChevronDown,
  ChevronUp,
  Flame,
  Home,
  Store,
  PartyPopper,
  DollarSign,
  Refrigerator,
} from "lucide-react";
import { toast } from "react-toastify";

// Dynamically import Interactive Location Picker (Client-Side Only, Zero Tech Jargon)
const LocationPicker = dynamic(
  () => import("@/components/OpenStreetMapLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 rounded-2xl bg-white dark:bg-slate-800 flex flex-col items-center justify-center border-2 border-dashed border-slate-900 animate-pulse text-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-sky-900 dark:text-sky-400 mb-2" />
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
          Loading pick-up location map...
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

interface IRepurposedRecipe {
  title: string;
  description: string;
  effortLevel: string;
  prepTimeMinutes: number;
  ingredientsNeeded: string[];
  instructions: string[];
}

interface IStorageAdvice {
  safeStorageDays: number;
  storageMethod: string;
  expiryHours: number;
}

interface IClaimRequest {
  claimId: string;
  ngoName: string;
  contactPerson: string;
  contactPhone: string;
  pickupEta: string;
  beneficiaryCount?: number;
  message?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface IDispatchComment {
  commentId: string;
  authorId: string;
  authorName: string;
  authorRole: "donor" | "ngo" | "volunteer";
  text: string;
  createdAt: string;
}

interface IDispatch {
  _id: string;
  donorId: string;
  donorName: string;
  donorType: "household" | "restaurant" | "caterer" | "bakery" | "supermarket" | "other";
  title: string;
  foodCategory: string;
  description?: string;
  urgency: "urgent_2h" | "today" | "flexible";
  status: "available" | "claim_pending" | "claimed" | "delivered" | "cancelled";
  surplusMediaUrl: string;
  estimatedServings: number;
  co2DivertedKg: number;
  freshnessScore: number;
  aiSafetyNotes?: string;
  storageAdvice?: IStorageAdvice;
  repurposedRecipes?: IRepurposedRecipe[];
  location: LocationData;
  claims?: IClaimRequest[];
  approvedClaimId?: string;
  claimedByNgoName?: string;
  claimedAt?: string;
  comments?: IDispatchComment[];
  handoffMediaUrl?: string;
  deliveredAt?: string;
  deliveryNotes?: string;
  createdAt: string;
}

export default function RescueBridgePage() {
  // Navigation view: 'board' | 'create'
  const [activeView, setActiveView] = useState<"board" | "create">("board");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [donorFilter, setDonorFilter] = useState<string>("all");

  // Dynamic MongoDB Dispatches
  const [dispatches, setDispatches] = useState<IDispatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State: Enlist Food
  const [title, setTitle] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorType, setDonorType] = useState<string>("household");
  const [foodCategory, setFoodCategory] = useState("Home-cooked Leftovers");
  const [urgency, setUrgency] = useState<"urgent_2h" | "today" | "flexible">("today");
  const [description, setDescription] = useState("");
  const [foodPhoto, setFoodPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");

  // Instant AI Analysis on Upload preview
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [instantAnalysis, setInstantAnalysis] = useState<any | null>(null);

  // Expanded cards state
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [expandedClaims, setExpandedClaims] = useState<Record<string, boolean>>({});

  // Comment input state per dispatch
  const [commentInputs, setCommentInputs] = useState<
    Record<string, { text: string; role: "ngo" | "donor" | "volunteer"; name: string }>
  >({});

  // Claim Request Modal State
  const [selectedDispatchForClaim, setSelectedDispatchForClaim] = useState<IDispatch | null>(null);
  const [ngoNameInput, setNgoNameInput] = useState("");
  const [contactPersonInput, setContactPersonInput] = useState("");
  const [contactPhoneInput, setContactPhoneInput] = useState("");
  const [pickupEtaInput, setPickupEtaInput] = useState("Within 1 Hour");
  const [beneficiariesInput, setBeneficiariesInput] = useState("10");
  const [claimMessageInput, setClaimMessageInput] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Handoff Verification Modal State
  const [verifyDispatch, setVerifyDispatch] = useState<IDispatch | null>(null);
  const [handoffPhoto, setHandoffPhoto] = useState<File | null>(null);
  const [handoffPreview, setHandoffPreview] = useState<string | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Digital Impact Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<IDispatch | null>(null);

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
      console.error("Error loading dispatches:", err);
      toast.error("Could not load rescue dispatches. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  // Summary Metrics calculated from dynamic state
  const totalMealsSaved = dispatches.reduce((acc, curr) => acc + (curr.estimatedServings || 0), 0);
  const totalCo2Saved = dispatches.reduce((acc, curr) => acc + (curr.co2DivertedKg || 0), 0);
  const verifiedCount = dispatches.filter((d) => d.status === "delivered").length;
  const activeCount = dispatches.filter((d) => d.status === "available" || d.status === "claim_pending").length;

  // Handle Photo selection with immediate AI insight
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFoodPhoto(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    setInstantAnalysis(null);

    try {
      setAnalyzingPhoto(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("foodCategory", foodCategory);
      fd.append("title", title || "Leftover Food");

      const res = await fetch("/api/rescue/analyze-food", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setInstantAnalysis(data.analysis);
        toast.info("Food analyzed! Check safe storage days & recipe ideas below.");
      }
    } catch (err) {
      console.warn("Instant photo analysis note:", err);
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  // Submit New Food Rescue Post
  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodPhoto) {
      toast.error("Please add a photo of the food.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please provide a title for the food.");
      return;
    }
    if (!pickupLocation) {
      toast.error("Please select a pick-up location on the map.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitStep("Uploading photo & analyzing safe storage duration...");

      const formData = new FormData();
      formData.append("file", foodPhoto);
      formData.append("title", title.trim());
      formData.append("donorName", donorName.trim() || "Community Member");
      formData.append("donorType", donorType);
      formData.append("foodCategory", foodCategory);
      formData.append("urgency", urgency);
      formData.append("description", description.trim());

      formData.append("lat", pickupLocation.lat.toString());
      formData.append("lng", pickupLocation.lng.toString());
      if (pickupLocation.display_name) formData.append("display_name", pickupLocation.display_name);
      if (pickupLocation.city) formData.append("city", pickupLocation.city);
      if (pickupLocation.state) formData.append("state", pickupLocation.state);
      if (pickupLocation.country) formData.append("country", pickupLocation.country);
      if (pickupLocation.pincode) formData.append("pincode", pickupLocation.pincode);
      if (pickupLocation.establishment) formData.append("establishment", pickupLocation.establishment);

      setSubmitStep("Generating upcycled recipes & publishing rescue post...");

      const res = await fetch("/api/rescue/dispatch", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to list food rescue post");
      }

      toast.success("Food rescue listing posted! NGOs and community members can now see it.");

      // Reset form
      setTitle("");
      setDonorName("");
      setDescription("");
      setFoodPhoto(null);
      setPhotoPreview(null);
      setInstantAnalysis(null);
      setPickupLocation(null);
      setActiveView("board");

      fetchDispatches();
    } catch (err: any) {
      console.error("Listing error:", err);
      toast.error(err.message || "Failed to publish listing.");
    } finally {
      setIsSubmitting(false);
      setSubmitStep("");
    }
  };

  // Submit Claim Request by NGO
  const handleSubmitClaimRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispatchForClaim) return;
    if (!ngoNameInput.trim() || !contactPhoneInput.trim()) {
      toast.error("Please enter your organization name and phone number.");
      return;
    }

    try {
      setIsSubmittingClaim(true);
      const res = await fetch("/api/rescue/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchId: selectedDispatchForClaim._id,
          action: "request",
          ngoName: ngoNameInput.trim(),
          contactPerson: contactPersonInput.trim() || ngoNameInput.trim(),
          contactPhone: contactPhoneInput.trim(),
          pickupEta: pickupEtaInput,
          beneficiaryCount: Number(beneficiariesInput) || 0,
          message: claimMessageInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request pickup");

      toast.success("Pickup claim sent! The food donor will review and approve your request.");
      setSelectedDispatchForClaim(null);
      setNgoNameInput("");
      setContactPersonInput("");
      setContactPhoneInput("");
      setClaimMessageInput("");
      fetchDispatches();
    } catch (err: any) {
      toast.error(err.message || "Could not submit claim request");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Approve a Claim Request (Donor action)
  const handleApproveClaim = async (dispatchId: string, claimId: string) => {
    try {
      const res = await fetch("/api/rescue/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchId,
          action: "approve",
          claimId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve claim");

      toast.success(data.message || "Claim approved! Pickup confirmed.");
      fetchDispatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve claim");
    }
  };

  // Reject a Claim Request (Donor action)
  const handleRejectClaim = async (dispatchId: string, claimId: string) => {
    try {
      const res = await fetch("/api/rescue/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchId,
          action: "reject",
          claimId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to decline claim");

      toast.info("Claim request declined.");
      fetchDispatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to decline claim");
    }
  };

  // Submit Interactive Comment / Coordination Message
  const handleSendComment = async (dispatchId: string) => {
    const draft = commentInputs[dispatchId];
    if (!draft || !draft.text.trim()) return;

    try {
      const res = await fetch("/api/rescue/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchId,
          authorName:
            draft.name.trim() ||
            (draft.role === "donor"
              ? "Food Donor"
              : draft.role === "ngo"
              ? "NGO Representative"
              : "Community Volunteer"),
          authorRole: draft.role || "volunteer",
          text: draft.text.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");

      setCommentInputs((prev) => ({
        ...prev,
        [dispatchId]: { ...draft, text: "" },
      }));

      setDispatches((prev) =>
        prev.map((d) => (d._id === dispatchId ? data.dispatch : d))
      );
      toast.success("Message posted to discussion thread.");
    } catch (err: any) {
      toast.error(err.message || "Failed to post message");
    }
  };

  // Submit Handoff Verification
  const handleVerifyHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyDispatch || !handoffPhoto) {
      toast.error("Please take or upload a photo of the completed pickup / distribution.");
      return;
    }

    try {
      setIsVerifying(true);
      const formData = new FormData();
      formData.append("file", handoffPhoto);
      formData.append("dispatchId", verifyDispatch._id);
      formData.append("deliveryNotes", deliveryNotes.trim());

      const res = await fetch("/api/rescue/verify-handoff", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Handoff verification failed");

      toast.success("Delivery verified! Impact certificate generated.");
      setVerifyDispatch(null);
      setHandoffPhoto(null);
      setHandoffPreview(null);
      setDeliveryNotes("");

      setActiveReceipt(data.dispatch);
      fetchDispatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify delivery");
    } finally {
      setIsVerifying(false);
    }
  };

  // Filtered dispatches
  const filteredDispatches = dispatches.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (donorFilter !== "all" && item.donorType !== donorFilter) return false;
    return true;
  });

  return (
    <div className="w-[80%] max-w-[80vw] mx-auto py-8 space-y-6 flex flex-col items-center pb-32">
      {/* 1. Header Section matching Morsel Hero Styling */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-slate-900 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-xs font-black shadow-xs">
          <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
          <span>Morsel RescueBridge</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Food <span className="text-sky-900 dark:text-sky-400">Rescue</span> Network
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
          Connect your kitchen surplus with local shelters. Instant AI shelf-life, upcycled recipes, and verified community food rescue.
        </p>
      </div>

      {/* 2. Top Stats Bar matching Morsel Dashboard Design */}
      <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 border border-slate-900 flex items-center justify-center text-sky-900 dark:text-sky-300 shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {activeCount}
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Active Rescues
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 border border-slate-900 flex items-center justify-center text-emerald-800 dark:text-emerald-300 shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600">
                {totalMealsSaved}
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Meals Saved
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 border border-slate-900 flex items-center justify-center text-teal-800 dark:text-teal-300 shrink-0">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-teal-600">
                {totalCo2Saved.toFixed(1)} <span className="text-xs font-bold">kg</span>
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                CO2 Avoided
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 border border-slate-900 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-600">
                {verifiedCount}
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Handoffs Done
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Morsel Signature Single-Screen Tab Switcher */}
      <div className="flex items-center justify-center w-full my-1">
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 shadow-md">
          <button
            type="button"
            onClick={() => setActiveView("board")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeView === "board"
                ? "bg-sky-900 text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Community Feed ({dispatches.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView("create")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeView === "create"
                ? "bg-sky-900 text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Enlist Leftovers</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Community Feed View */}
      {activeView === "board" && (
        <div className="w-full space-y-6">
          {/* Quick Enlist Banner */}
          <div className="w-full rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border-2 border-slate-900 bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-300 flex items-center justify-center shrink-0">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Have leftover food from lunch or dinner?
                </h3>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                  Share it in under 60 seconds. Our AI calculates safe fridge days and creates upcycled recipes!
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveView("create")}
              className="px-5 py-2.5 rounded-xl border-2 border-slate-900 bg-sky-900 hover:bg-sky-800 text-white font-bold text-xs shadow-md transition-transform hover:scale-105 shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Post Leftover Food
            </button>
          </div>

          {/* Filter Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Status:
              </span>
              {[
                { id: "all", label: "All Posts" },
                { id: "available", label: "Available" },
                { id: "claim_pending", label: "Pending" },
                { id: "claimed", label: "In Progress" },
                { id: "delivered", label: "Delivered" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                    statusFilter === tab.id
                      ? "border-slate-900 bg-sky-900 text-white shadow-xs"
                      : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Source:
              </span>
              <select
                value={donorFilter}
                onChange={(e) => setDonorFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 border-2 border-slate-900 focus:outline-none"
              >
                <option value="all">Everyone</option>
                <option value="household">Home Cooks / Households</option>
                <option value="restaurant">Restaurants & Cafes</option>
                <option value="caterer">Catering & Banquets</option>
                <option value="bakery">Bakeries</option>
              </select>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-sky-900 dark:text-sky-400 mb-3" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Fetching food rescue network posts...
              </p>
            </div>
          )}

          {/* Clean Dynamic Empty State */}
          {!loading && filteredDispatches.length === 0 && (
            <div className="py-16 px-6 text-center rounded-3xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 max-w-lg mx-auto shadow-md">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-300 flex items-center justify-center border-2 border-slate-900 shadow-sm">
                <Utensils className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                No active food dispatches found
              </h3>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Be the first to list surplus home-cooked meals or kitchen surplus to help local shelters and families!
              </p>
              <button
                onClick={() => setActiveView("create")}
                className="mt-5 px-6 py-2.5 rounded-xl border-2 border-slate-900 bg-sky-900 hover:bg-sky-800 text-white font-bold text-xs shadow-md transition-transform hover:scale-105 inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Post the First Food Rescue
              </button>
            </div>
          )}

          {/* Feed Grid of Cards matching Morsel Aesthetic */}
          {!loading && filteredDispatches.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              {filteredDispatches.map((dispatch) => {
                const isClaimPending = dispatch.status === "claim_pending";
                const isClaimed = dispatch.status === "claimed";
                const isDelivered = dispatch.status === "delivered";
                const isAvailable = dispatch.status === "available";

                const isRecipesOpen = expandedRecipes[dispatch._id];
                const isCommentsOpen = expandedComments[dispatch._id];
                const isClaimsOpen = expandedClaims[dispatch._id];

                const pendingClaimsCount = (dispatch.claims || []).filter((c) => c.status === "pending").length;
                const approvedClaim = (dispatch.claims || []).find((c) => c.status === "approved");

                return (
                  <div
                    key={dispatch._id}
                    className="w-full rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
                  >
                    {/* Header Bar */}
                    <div className="p-4 border-b-2 border-slate-900 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-sky-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                          {dispatch.donorName ? dispatch.donorName.slice(0, 2).toUpperCase() : "CO"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                              {dispatch.donorName || "Community Member"}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-900 font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 capitalize flex items-center gap-1">
                              {dispatch.donorType === "household" ? (
                                <Home className="w-3 h-3 text-emerald-600" />
                              ) : dispatch.donorType === "restaurant" ? (
                                <Utensils className="w-3 h-3 text-sky-600" />
                              ) : (
                                <Store className="w-3 h-3 text-indigo-600" />
                              )}
                              {dispatch.donorType || "Household"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">
                              {dispatch.location?.establishment || dispatch.location?.city || "Local Area"}
                            </span>
                            <span>•</span>
                            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>
                              {new Date(dispatch.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="shrink-0">
                        {isAvailable && (
                          <span className="px-3 py-1 rounded-full border-2 border-slate-900 text-xs font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                            Available
                          </span>
                        )}
                        {isClaimPending && (
                          <span className="px-3 py-1 rounded-full border-2 border-slate-900 text-xs font-black bg-amber-200 text-amber-950 dark:bg-amber-950 dark:text-amber-200 animate-pulse">
                            Claim Requested ({pendingClaimsCount})
                          </span>
                        )}
                        {isClaimed && (
                          <span className="px-3 py-1 rounded-full border-2 border-slate-900 text-xs font-black bg-sky-200 text-sky-950 dark:bg-sky-950 dark:text-sky-200">
                            Pickup in Progress
                          </span>
                        )}
                        {isDelivered && (
                          <span className="px-3 py-1 rounded-full border-2 border-slate-900 text-xs font-black bg-indigo-200 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-200">
                            Delivered & Verified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="p-4 pb-2">
                      <h4 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-snug">
                        {dispatch.title}
                      </h4>
                      {dispatch.description && (
                        <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                          {dispatch.description}
                        </p>
                      )}
                    </div>

                    {/* Food Photo with Overlay Badges */}
                    <div className="relative mx-4 rounded-xl overflow-hidden border-2 border-slate-900 bg-slate-100 dark:bg-slate-800 aspect-video max-h-60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={dispatch.surplusMediaUrl}
                        alt={dispatch.title}
                        className="w-full h-full object-cover"
                      />

                      <div className="absolute top-2.5 left-2.5 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold border border-white/20 flex items-center gap-1.5 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{dispatch.freshnessScore || 95}% Freshness Score</span>
                      </div>

                      {dispatch.storageAdvice && (
                        <div className="absolute bottom-2.5 left-2.5 bg-emerald-900 text-white px-3 py-1 rounded-lg text-xs font-bold border border-emerald-400/40 flex items-center gap-1.5 shadow-sm">
                          <Timer className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Safe to store: {dispatch.storageAdvice.safeStorageDays} days in fridge</span>
                        </div>
                      )}

                      <div className="absolute top-2.5 right-2.5">
                        {dispatch.urgency === "urgent_2h" ? (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-rose-600 text-white border border-rose-950 flex items-center gap-1 shadow-sm">
                            <Flame className="w-3 h-3" /> Pickup within 2h
                          </span>
                        ) : dispatch.urgency === "today" ? (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-600 text-white border border-amber-950 flex items-center gap-1 shadow-sm">
                            <Clock className="w-3 h-3" /> Pickup today
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-900 text-white border border-white/20 shadow-sm">
                            Flexible timing
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Impact Stats Deck */}
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl border-2 border-slate-900 bg-sky-50 dark:bg-sky-950/30 flex items-center gap-2">
                          <Utensils className="w-4 h-4 text-sky-900 dark:text-sky-400 shrink-0" />
                          <div>
                            <span className="text-slate-500 font-bold text-[10px] block">Servings</span>
                            <span className="font-black text-slate-900 dark:text-white">
                              ~{dispatch.estimatedServings} Meals
                            </span>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl border-2 border-slate-900 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-2">
                          <Leaf className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-slate-500 font-bold text-[10px] block">CO₂ Prevented</span>
                            <span className="font-black text-slate-900 dark:text-white">
                              {dispatch.co2DivertedKg} kg CO₂e
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Storage Advice */}
                      {dispatch.storageAdvice?.storageMethod && (
                        <div className="p-3 rounded-xl border-2 border-slate-900 bg-sky-50 dark:bg-sky-950/40 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2">
                          <Info className="w-4 h-4 text-sky-900 dark:text-sky-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black block">Storage Guidance:</span>
                            <p className="mt-0.5 font-medium leading-snug">
                              {dispatch.storageAdvice.storageMethod}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Creative Repurposed Recipes */}
                      {dispatch.repurposedRecipes && dispatch.repurposedRecipes.length > 0 && (
                        <div className="rounded-xl border-2 border-slate-900 overflow-hidden bg-amber-50/50 dark:bg-amber-950/20">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRecipes((prev) => ({
                                ...prev,
                                [dispatch._id]: !prev[dispatch._id],
                              }))
                            }
                            className="w-full p-3 flex items-center justify-between text-left text-xs font-black text-slate-900 dark:text-white hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition"
                          >
                            <div className="flex items-center gap-2">
                              <ChefHat className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                              <span>
                                Creative Recipe Ideas ({dispatch.repurposedRecipes.length} Upcycled Dishes)
                              </span>
                            </div>
                            {isRecipesOpen ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {isRecipesOpen && (
                            <div className="p-3 pt-0 space-y-2.5">
                              <p className="text-[11px] font-bold text-amber-950 dark:text-amber-300">
                                NGOs and volunteer kitchens can turn this leftover into fresh hearty meals:
                              </p>
                              {dispatch.repurposedRecipes.map((recipe, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-lg border-2 border-slate-900 bg-white dark:bg-slate-800 space-y-1 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-black text-slate-900 dark:text-white">
                                      {recipe.title}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full border border-slate-900 text-[10px] font-bold bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-300">
                                      {recipe.effortLevel}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                                    {recipe.description}
                                  </p>
                                  {recipe.ingredientsNeeded && recipe.ingredientsNeeded.length > 0 && (
                                    <div className="text-[11px] text-slate-500 font-medium">
                                      <strong className="text-slate-900 dark:text-white">Pantry items: </strong>
                                      {recipe.ingredientsNeeded.join(", ")}
                                    </div>
                                  )}
                                  {recipe.instructions && recipe.instructions.length > 0 && (
                                    <ol className="list-decimal list-inside text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5 pt-1 font-medium">
                                      {recipe.instructions.map((step, sIdx) => (
                                        <li key={sIdx}>{step}</li>
                                      ))}
                                    </ol>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Approved Claim Status Banner */}
                      {isClaimed && approvedClaim && (
                        <div className="p-3 rounded-xl border-2 border-slate-900 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-950 dark:text-emerald-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                            <div>
                              <p className="font-black">Claim Approved for {approvedClaim.ngoName}</p>
                              <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                                Pickup ETA: {approvedClaim.pickupEta} • Phone: {approvedClaim.contactPhone}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Incoming Claim Requests Drawer */}
                      {dispatch.claims && dispatch.claims.length > 0 && (
                        <div className="rounded-xl border-2 border-slate-900 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedClaims((prev) => ({
                                ...prev,
                                [dispatch._id]: !prev[dispatch._id],
                              }))
                            }
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs font-black text-slate-900 dark:text-white hover:bg-slate-100 transition"
                          >
                            <span>Pickup Claim Requests ({dispatch.claims.length})</span>
                            {isClaimsOpen ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {isClaimsOpen && (
                            <div className="p-3 space-y-2 bg-slate-50 dark:bg-slate-900/60">
                              {dispatch.claims.map((claim) => (
                                <div
                                  key={claim.claimId}
                                  className="p-3 rounded-lg border-2 border-slate-900 bg-white dark:bg-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-slate-900 dark:text-white">
                                        {claim.ngoName}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full border border-slate-900 text-[10px] font-black ${
                                          claim.status === "approved"
                                            ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-300"
                                            : claim.status === "rejected"
                                            ? "bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-300"
                                            : "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-300"
                                        }`}
                                      >
                                        {claim.status.toUpperCase()}
                                      </span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 text-[11px] font-medium mt-0.5">
                                      Contact: {claim.contactPerson} ({claim.contactPhone}) • ETA: {claim.pickupEta}
                                    </p>
                                    {claim.message && (
                                      <p className="text-slate-700 dark:text-slate-300 text-[11px] italic mt-1 font-medium">
                                        "{claim.message}"
                                      </p>
                                    )}
                                  </div>

                                  {claim.status === "pending" && (
                                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                      <button
                                        onClick={() => handleApproveClaim(dispatch._id, claim.claimId)}
                                        className="px-3 py-1 rounded-lg border-2 border-slate-900 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-transform hover:scale-105 flex items-center gap-1"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleRejectClaim(dispatch._id, claim.claimId)}
                                        className="px-2.5 py-1 rounded-lg border-2 border-slate-900 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Interactive Discussion Thread */}
                      <div className="rounded-xl border-2 border-slate-900 overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComments((prev) => ({
                              ...prev,
                              [dispatch._id]: !prev[dispatch._id],
                            }))
                          }
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs font-black text-slate-900 dark:text-white hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-sky-900 dark:text-sky-400" />
                            <span>
                              Coordinate & Discuss ({(dispatch.comments || []).length} messages)
                            </span>
                          </div>
                          {isCommentsOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        {isCommentsOpen && (
                          <div className="p-3 space-y-3 bg-white dark:bg-slate-900 text-xs">
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                              {(!dispatch.comments || dispatch.comments.length === 0) && (
                                <p className="text-[11px] font-medium text-slate-400 italic text-center py-2">
                                  No questions or messages yet. Ask the donor about packaging, containers, etc.
                                </p>
                              )}
                              {dispatch.comments?.map((msg) => (
                                <div
                                  key={msg.commentId}
                                  className="p-2.5 rounded-lg border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 space-y-1"
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-black text-slate-900 dark:text-white">
                                      {msg.authorName}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-full border border-slate-900 text-[9px] font-bold uppercase bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                      {msg.authorRole}
                                    </span>
                                  </div>
                                  <p className="text-slate-700 dark:text-slate-300 text-xs font-medium leading-relaxed">
                                    {msg.text}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* Comment Form */}
                            <div className="space-y-2 pt-2 border-t-2 border-slate-200 dark:border-slate-800">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Your name or organization"
                                  value={commentInputs[dispatch._id]?.name || ""}
                                  onChange={(e) =>
                                    setCommentInputs((prev) => ({
                                      ...prev,
                                      [dispatch._id]: {
                                        role: prev[dispatch._id]?.role || "ngo",
                                        text: prev[dispatch._id]?.text || "",
                                        name: e.target.value,
                                      },
                                    }))
                                  }
                                  className="w-1/2 p-2 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                                />
                                <select
                                  value={commentInputs[dispatch._id]?.role || "ngo"}
                                  onChange={(e: any) =>
                                    setCommentInputs((prev) => ({
                                      ...prev,
                                      [dispatch._id]: {
                                        name: prev[dispatch._id]?.name || "",
                                        text: prev[dispatch._id]?.text || "",
                                        role: e.target.value,
                                      },
                                    }))
                                  }
                                  className="w-1/2 p-2 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                                >
                                  <option value="ngo">NGO Representative</option>
                                  <option value="volunteer">Volunteer</option>
                                  <option value="donor">Food Donor</option>
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Ask about containers, pickup time, etc..."
                                  value={commentInputs[dispatch._id]?.text || ""}
                                  onChange={(e) =>
                                    setCommentInputs((prev) => ({
                                      ...prev,
                                      [dispatch._id]: {
                                        name: prev[dispatch._id]?.name || "",
                                        role: prev[dispatch._id]?.role || "ngo",
                                        text: e.target.value,
                                      },
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSendComment(dispatch._id);
                                  }}
                                  className="flex-1 p-2 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSendComment(dispatch._id)}
                                  className="p-2.5 rounded-xl border-2 border-slate-900 bg-sky-900 hover:bg-sky-800 text-white font-bold transition shadow-xs"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Primary Action Button */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {isAvailable && (
                          <button
                            type="button"
                            onClick={() => setSelectedDispatchForClaim(dispatch)}
                            className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-900 bg-sky-900 hover:bg-sky-800 text-white text-xs sm:text-sm font-black transition-transform hover:scale-[1.01] flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Truck className="w-4 h-4" />
                            Request Pickup / Claim Food
                          </button>
                        )}

                        {isClaimPending && (
                          <button
                            type="button"
                            onClick={() => setSelectedDispatchForClaim(dispatch)}
                            className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-900 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-black transition-transform hover:scale-[1.01] flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Truck className="w-4 h-4" />
                            Submit Another Claim Request
                          </button>
                        )}

                        {isClaimed && (
                          <button
                            type="button"
                            onClick={() => setVerifyDispatch(dispatch)}
                            className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-900 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black transition-transform hover:scale-[1.01] flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <PackageCheck className="w-4 h-4" />
                            Verify Completed Delivery Proof
                          </button>
                        )}

                        {isDelivered && (
                          <button
                            type="button"
                            onClick={() => setActiveReceipt(dispatch)}
                            className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-900 bg-indigo-700 hover:bg-indigo-800 text-white text-xs sm:text-sm font-black transition-transform hover:scale-[1.01] flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <FileCheck className="w-4 h-4" />
                            View Digital Impact Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Enlist Leftovers Form */}
      {activeView === "create" && (
        <div className="w-full max-w-3xl mx-auto">
          <div className="rounded-3xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="border-b-2 border-slate-900 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ChefHat className="w-6 h-6 text-sky-900 dark:text-sky-400" />
                Enlist Surplus Food for Rescue
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">
                Post leftover dinner portions, extra event meals, or bakery surplus. Our AI will instantly calculate safe fridge days and upcycled recipes!
              </p>
            </div>

            <form onSubmit={handleCreateDispatch} className="space-y-6">
              {/* Photo Upload Zone */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100">
                  Food Photo (Required for AI Verification & NGO Assessment) *
                </label>
                <div className="relative border-2 border-dashed border-slate-900 rounded-2xl p-6 text-center hover:bg-sky-50/50 transition cursor-pointer bg-slate-50 dark:bg-slate-950/40">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />

                  {photoPreview ? (
                    <div className="space-y-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Food preview"
                        className="mx-auto max-h-56 rounded-xl border-2 border-slate-900 object-cover shadow-sm"
                      />
                      <p className="text-xs font-bold text-slate-600">Click or tap to change photo</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900 text-sky-900 dark:text-sky-300 border-2 border-slate-900 flex items-center justify-center mb-3 shadow-xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        Upload or snap a photo of the food
                      </p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">
                        High-quality photo unlocks instant AI storage advice and builds trust with local NGOs
                      </p>
                    </div>
                  )}
                </div>

                {/* Instant AI Feedback Banner right on the form! */}
                {analyzingPhoto && (
                  <div className="p-3.5 rounded-xl border-2 border-slate-900 bg-sky-50 dark:bg-sky-950/40 flex items-center gap-2 text-xs font-bold text-sky-900 dark:text-sky-300">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                    <span>Analyzing food photo... Calculating safe storage days and recipe ideas...</span>
                  </div>
                )}

                {instantAnalysis && (
                  <div className="p-4 rounded-xl border-2 border-slate-900 bg-emerald-50 dark:bg-emerald-950/40 space-y-2 text-xs text-emerald-950 dark:text-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="font-black flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-700" />
                        AI Instant Storage Clearance:
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full border border-slate-900 font-black bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                        Safe for {instantAnalysis.storageAdvice?.safeStorageDays || 2} Days in Fridge
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 dark:text-slate-200 leading-snug">
                      {instantAnalysis.storageAdvice?.storageMethod}
                    </p>
                    {instantAnalysis.repurposedRecipes && instantAnalysis.repurposedRecipes[0] && (
                      <div className="pt-1 text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
                        💡 <strong>Recipe Idea:</strong> {instantAnalysis.repurposedRecipes[0].title} (Effort: {instantAnalysis.repurposedRecipes[0].effortLevel})
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Title & Donor Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100">
                    Food Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4 Portions of Biryani & Raita"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100">
                    Source / Contributor Type
                  </label>
                  <select
                    value={donorType}
                    onChange={(e) => setDonorType(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                  >
                    <option value="household">Home Cook / Household</option>
                    <option value="restaurant">Restaurant / Cafe</option>
                    <option value="caterer">Catering / Banquet Hall</option>
                    <option value="bakery">Bakery / Confectionery</option>
                    <option value="supermarket">Grocery / Supermarket</option>
                    <option value="other">Community Volunteer / Other</option>
                  </select>
                </div>
              </div>

              {/* Your Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100">
                    Your Name or Organization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Sharma or Green Leaf Bistro"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100">
                    Food Category
                  </label>
                  <select
                    value={foodCategory}
                    onChange={(e) => setFoodCategory(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                  >
                    <option value="Home-cooked Leftovers">Home-cooked Leftovers</option>
                    <option value="Restaurant Surplus Meals">Restaurant Surplus Meals</option>
                    <option value="Bakery & Bread Surplus">Bakery & Bread Surplus</option>
                    <option value="Fresh Fruits & Vegetables">Fresh Fruits & Vegetables</option>
                    <option value="Packaged / Canned Food">Packaged / Canned Food</option>
                  </select>
                </div>
              </div>

              {/* Urgency Window */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100">
                  Pick-up Window & Urgency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "urgent_2h", label: "Urgent (Within 2h)", desc: "Cooked warm meal" },
                    { id: "today", label: "Today (Tonight)", desc: "Fresh & refrigerated" },
                    { id: "flexible", label: "Flexible (24-48h)", desc: "Airtight / sealed" },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setUrgency(item.id as any)}
                      className={`p-3 rounded-xl text-left border-2 border-slate-900 transition-all ${
                        urgency === item.id
                          ? "bg-sky-900 text-white shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="font-black text-xs block">{item.label}</span>
                      <span className="text-[10px] font-semibold opacity-85">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100">
                  Description & Handling Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Pure vegetarian meal, portioned in clean containers. Please bring your own container or bags for pickup."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                />
              </div>

              {/* Map Location Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100">
                  Select Pick-up Spot on Map *
                </label>
                <p className="text-xs font-semibold text-slate-500">
                  Search your neighborhood or tap anywhere on the map to drop the pickup pin.
                </p>
                <div className="rounded-2xl overflow-hidden border-2 border-slate-900 shadow-xs">
                  <LocationPicker
                    height="320px"
                    onLocationSelect={(loc) => {
                      setPickupLocation({
                        lat: loc.lat,
                        lng: loc.lng,
                        display_name: loc.address?.display_name,
                        city: loc.address?.city,
                        state: loc.address?.state,
                        country: loc.address?.country,
                        pincode: loc.address?.pincode,
                        establishment: loc.address?.establishment,
                      });
                    }}
                  />
                </div>
                {pickupLocation && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pick-up spot set: {pickupLocation.establishment || pickupLocation.city || `${pickupLocation.lat.toFixed(4)}, ${pickupLocation.lng.toFixed(4)}`}
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t-2 border-slate-900 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setActiveView("board")}
                  className="px-5 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-7 py-3 rounded-xl border-2 border-slate-900 bg-sky-900 hover:bg-sky-800 text-white font-black text-xs sm:text-sm shadow-md transition-transform hover:scale-[1.02] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{submitStep || "Publishing..."}</span>
                    </>
                  ) : (
                    <>
                      <HeartHandshake className="w-4 h-4" />
                      <span>Publish Food Rescue Post</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim / Pickup Request Modal */}
      {selectedDispatchForClaim && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rounded-3xl border-2 border-slate-900 bg-white dark:bg-slate-900 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-900 dark:text-sky-400" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Request Food Pickup
                </h3>
              </div>
              <button
                onClick={() => setSelectedDispatchForClaim(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <p className="font-black text-slate-900 dark:text-white">
                {selectedDispatchForClaim.title}
              </p>
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                Listed by: {selectedDispatchForClaim.donorName} • ~{selectedDispatchForClaim.estimatedServings} Meals
              </p>
              {selectedDispatchForClaim.storageAdvice && (
                <p className="text-emerald-700 dark:text-emerald-400 font-bold">
                  Safe storage: {selectedDispatchForClaim.storageAdvice.safeStorageDays} days in fridge
                </p>
              )}
            </div>

            <form onSubmit={handleSubmitClaimRequest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1">
                  Organization / Relief Group Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robin Hood Army / Annakshetra Foundation"
                  value={ngoNameInput}
                  onChange={(e) => setNgoNameInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1">
                    Representative Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Verma"
                    value={contactPersonInput}
                    onChange={(e) => setContactPersonInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={contactPhoneInput}
                    onChange={(e) => setContactPhoneInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1">
                    Estimated Pickup Time
                  </label>
                  <select
                    value={pickupEtaInput}
                    onChange={(e) => setPickupEtaInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                  >
                    <option value="Within 30 Minutes">Within 30 Minutes</option>
                    <option value="Within 1 Hour">Within 1 Hour</option>
                    <option value="Within 2 Hours">Within 2 Hours</option>
                    <option value="Tonight (8-10 PM)">Tonight (8-10 PM)</option>
                    <option value="Tomorrow Morning">Tomorrow Morning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1">
                    Beneficiaries to Feed
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 15"
                    value={beneficiariesInput}
                    onChange={(e) => setBeneficiariesInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1">
                  Message for Donor (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. We have clean insulated containers and can pick it up immediately."
                  value={claimMessageInput}
                  onChange={(e) => setClaimMessageInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDispatchForClaim(null)}
                  className="px-4 py-2 rounded-xl border-2 border-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="px-5 py-2.5 rounded-xl border-2 border-slate-900 bg-sky-900 hover:bg-sky-800 text-white font-black text-xs transition-transform hover:scale-105 flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {isSubmittingClaim ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Send Claim Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof-of-Delivery Handoff Modal */}
      {verifyDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rounded-3xl border-2 border-slate-900 bg-white dark:bg-slate-900 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Verify Food Delivery Proof
                </h3>
              </div>
              <button
                onClick={() => setVerifyDispatch(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Upload a photo of the handed-off food or distribution to beneficiaries to generate an immutable Digital Impact Receipt.
            </p>

            <form onSubmit={handleVerifyHandoff} className="space-y-4">
              <div className="relative border-2 border-dashed border-slate-900 rounded-2xl p-4 text-center cursor-pointer bg-slate-50 dark:bg-slate-950/40 hover:bg-emerald-50/40 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setHandoffPhoto(file);
                      setHandoffPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {handoffPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={handoffPreview}
                    alt="Delivery proof"
                    className="mx-auto max-h-48 rounded-xl border-2 border-slate-900 object-cover shadow-xs"
                  />
                ) : (
                  <div className="py-4">
                    <Upload className="w-6 h-6 mx-auto text-slate-500 mb-1" />
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      Take or upload delivery proof photo
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1">
                  Distribution Notes / Shelter Details
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Delivered 4 meals to community shelter on 8th Cross road."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVerifyDispatch(null)}
                  className="px-4 py-2 rounded-xl border-2 border-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-5 py-2.5 rounded-xl border-2 border-slate-900 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-transform hover:scale-105 flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Verify & Issue Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Impact Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rounded-3xl border-2 border-slate-900 bg-white dark:bg-slate-900 max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
              <div className="flex items-center gap-2">
                <PartyPopper className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Digital Impact Receipt
                </h3>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center py-2 space-y-1">
              <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">
                Rescue Mission Verified
              </span>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                {activeReceipt.title}
              </h4>
              <p className="text-xs font-bold text-slate-500">
                Rescued by {activeReceipt.claimedByNgoName || "Verified Partner NGO"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl border-2 border-slate-900 bg-emerald-50 dark:bg-emerald-950/40">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-black block uppercase">
                  Meals Served
                </span>
                <span className="text-2xl font-black text-emerald-950 dark:text-emerald-100">
                  {activeReceipt.estimatedServings}
                </span>
              </div>
              <div className="p-3 rounded-xl border-2 border-slate-900 bg-sky-50 dark:bg-sky-950/40">
                <span className="text-[10px] text-sky-800 dark:text-sky-300 font-black block uppercase">
                  CO₂ Diverted
                </span>
                <span className="text-2xl font-black text-sky-950 dark:text-sky-100">
                  {activeReceipt.co2DivertedKg} kg
                </span>
              </div>
            </div>

            {activeReceipt.handoffMediaUrl && (
              <div className="rounded-xl overflow-hidden border-2 border-slate-900 max-h-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeReceipt.handoffMediaUrl}
                  alt="Delivery proof"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 space-y-1 rounded-xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-950/40 p-3">
              <p>
                <strong className="text-slate-900 dark:text-white">Origin:</strong> {activeReceipt.donorName} ({activeReceipt.donorType})
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Timestamp:</strong>{" "}
                {activeReceipt.deliveredAt
                  ? new Date(activeReceipt.deliveredAt).toLocaleString()
                  : new Date().toLocaleString()}
              </p>
              {activeReceipt.deliveryNotes && (
                <p>
                  <strong className="text-slate-900 dark:text-white">Notes:</strong> {activeReceipt.deliveryNotes}
                </p>
              )}
            </div>

            <button
              onClick={() => setActiveReceipt(null)}
              className="w-full py-2.5 rounded-xl border-2 border-slate-900 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-transform hover:scale-[1.02] shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
