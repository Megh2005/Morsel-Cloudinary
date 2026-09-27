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
} from "lucide-react";
import { toast } from "react-toastify";

// Dynamically import Interactive Location Picker (Client-Side Only, Zero Tech Jargon)
const LocationPicker = dynamic(
  () => import("@/components/OpenStreetMapLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 animate-pulse text-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-sky-900 dark:text-sky-400 mb-2" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
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
  const [commentInputs, setCommentInputs] = useState<Record<string, { text: string; role: "ngo" | "donor" | "volunteer"; name: string }>>({});

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

  // Handle Photo selection with immediate AI insight
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFoodPhoto(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    setInstantAnalysis(null);

    // Call instant food analysis
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
          authorName: draft.name.trim() || (draft.role === "donor" ? "Food Donor" : draft.role === "ngo" ? "NGO Representative" : "Community Volunteer"),
          authorRole: draft.role || "volunteer",
          text: draft.text.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");

      // Clear input
      setCommentInputs((prev) => ({
        ...prev,
        [dispatchId]: { ...draft, text: "" },
      }));

      // Update locally
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

      // Open impact receipt immediately
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
    <div className="w-[90%] max-w-7xl mx-auto py-8 px-2 sm:px-4 text-slate-900 dark:text-slate-100 min-h-screen">
      {/* Top Header & Mission Statement */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2 border border-emerald-500/20">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Community Food Recovery Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Morsel RescueBridge
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Where households, restaurants, and relief organizations connect. List home leftovers or surplus food, receive instant AI shelf-life & repurposed recipe ideas, and coordinate pickups with local NGOs seamlessly.
          </p>
        </div>

        {/* View Switcher Navigation */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 self-start md:self-auto shadow-sm">
          <button
            onClick={() => setActiveView("board")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "board"
                ? "bg-white dark:bg-slate-800 text-sky-900 dark:text-sky-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Community Feed
          </button>
          <button
            onClick={() => setActiveView("create")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "create"
                ? "bg-sky-900 dark:bg-sky-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Enlist Food
          </button>
        </div>
      </div>

      {/* VIEW 1: Community Feed (LinkedIn-style for Food Rescue) */}
      {activeView === "board" && (
        <div className="mt-8 space-y-6">
          {/* Quick Enlist Prompt Banner */}
          <div className="bg-linear-to-r from-sky-50 via-indigo-50 to-emerald-50 dark:from-sky-950/40 dark:via-slate-900/60 dark:to-emerald-950/30 rounded-2xl p-5 border border-sky-100 dark:border-sky-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-900 dark:bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Have leftover food from lunch, dinner, or an event?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Share it in under 60 seconds. Our AI will calculate how many days it stays safe and suggest creative upcycled recipes!
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveView("create")}
              className="px-5 py-2.5 bg-sky-900 hover:bg-sky-950 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-md shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Post Leftover Food
            </button>
          </div>

          {/* Feed Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
              {[
                { id: "all", label: "All Posts" },
                { id: "available", label: "Available Now" },
                { id: "claim_pending", label: "Pending Claims" },
                { id: "claimed", label: "Pickup in Progress" },
                { id: "delivered", label: "Completed Deliveries" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    statusFilter === tab.id
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Source:</span>
              <select
                value={donorFilter}
                onChange={(e) => setDonorFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 focus:outline-none"
              >
                <option value="all">Everyone</option>
                <option value="household">Home Cooks / Households</option>
                <option value="restaurant">Restaurants & Cafes</option>
                <option value="caterer">Catering & Events</option>
                <option value="bakery">Bakeries</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-sky-900 dark:text-sky-400 mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Fetching food rescue network posts...
              </p>
            </div>
          )}

          {/* Clean Dynamic Empty State */}
          {!loading && filteredDispatches.length === 0 && (
            <div className="py-16 px-6 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 max-w-xl mx-auto">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-400 flex items-center justify-center">
                <Utensils className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                No active food dispatches found
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Be the first to list surplus home-cooked meals, extra groceries, or kitchen surplus to help local shelters and families in need!
              </p>
              <button
                onClick={() => setActiveView("create")}
                className="mt-5 px-5 py-2.5 bg-sky-900 hover:bg-sky-950 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-md inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Post the First Food Rescue
              </button>
            </div>
          )}

          {/* Feed Grid of Social Impact Posts */}
          {!loading && filteredDispatches.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col overflow-hidden"
                  >
                    {/* 1. LinkedIn-style Author Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-sky-700 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                          {dispatch.donorName ? dispatch.donorName.slice(0, 2).toUpperCase() : "CO"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {dispatch.donorName || "Community Member"}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize flex items-center gap-1">
                              {dispatch.donorType === "household" ? (
                                <Home className="w-3 h-3 text-emerald-500" />
                              ) : dispatch.donorType === "restaurant" ? (
                                <Utensils className="w-3 h-3 text-sky-500" />
                              ) : (
                                <Store className="w-3 h-3 text-indigo-500" />
                              )}
                              {dispatch.donorType || "Household"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {dispatch.location?.establishment || dispatch.location?.city || "Local Neighborhood"}
                            </span>
                            <span>•</span>
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
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

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {isAvailable && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/20">
                            Available
                          </span>
                        )}
                        {isClaimPending && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-500/20 animate-pulse">
                            Claim Requested ({pendingClaimsCount})
                          </span>
                        )}
                        {isClaimed && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-500/20">
                            Pickup in Progress
                          </span>
                        )}
                        {isDelivered && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-500/20">
                            Delivered & Verified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. Post Title & Description */}
                    <div className="p-4 pb-2">
                      <h4 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-snug">
                        {dispatch.title}
                      </h4>
                      {dispatch.description && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                          {dispatch.description}
                        </p>
                      )}
                    </div>

                    {/* 3. Verified Image & Visual Indicators */}
                    <div className="relative mx-4 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-video max-h-64 border border-slate-200 dark:border-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={dispatch.surplusMediaUrl}
                        alt={dispatch.title}
                        className="w-full h-full object-cover"
                      />

                      {/* Freshness Rating Badge */}
                      <div className="absolute top-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold border border-white/10 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{dispatch.freshnessScore || 95}% Freshness Score</span>
                      </div>

                      {/* Safe Storage Days Pill (Key Requirement) */}
                      {dispatch.storageAdvice && (
                        <div className="absolute bottom-2.5 left-2.5 bg-emerald-950/85 backdrop-blur-md text-emerald-200 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Safe to store: {dispatch.storageAdvice.safeStorageDays} days in fridge</span>
                        </div>
                      )}

                      {/* Urgency Pill */}
                      <div className="absolute top-2.5 right-2.5">
                        {dispatch.urgency === "urgent_2h" ? (
                          <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-rose-600 text-white shadow-md flex items-center gap-1">
                            <Flame className="w-3 h-3" /> Pickup within 2h
                          </span>
                        ) : dispatch.urgency === "today" ? (
                          <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-amber-600 text-white shadow-md flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pickup today
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-slate-800 text-white shadow-md">
                            Flexible timing
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4. Impact Summary & Storage Clearance (Clear for NGOs) */}
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                          <Utensils className="w-4 h-4 text-sky-500 shrink-0" />
                          <div>
                            <span className="text-slate-500 text-[10px] block">Servings</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              ~{dispatch.estimatedServings} Meals
                            </span>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                          <Leaf className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <span className="text-slate-500 text-[10px] block">CO₂ Prevented</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {dispatch.co2DivertedKg} kg CO₂e
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Storage Method Box */}
                      {dispatch.storageAdvice?.storageMethod && (
                        <div className="p-3 bg-sky-50/70 dark:bg-sky-950/30 rounded-xl border border-sky-100 dark:border-sky-900/40 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2">
                          <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Storage Advice:</span>
                            <p className="mt-0.5 leading-snug">{dispatch.storageAdvice.storageMethod}</p>
                          </div>
                        </div>
                      )}

                      {/* 5. Repurposed Upcycled Recipes Section (Crucial for NGOs) */}
                      {dispatch.repurposedRecipes && dispatch.repurposedRecipes.length > 0 && (
                        <div className="border border-amber-200/80 dark:border-amber-900/40 rounded-xl overflow-hidden bg-amber-50/40 dark:bg-amber-950/20">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRecipes((prev) => ({
                                ...prev,
                                [dispatch._id]: !prev[dispatch._id],
                              }))
                            }
                            className="w-full p-3 flex items-center justify-between text-left text-xs font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition"
                          >
                            <div className="flex items-center gap-2">
                              <ChefHat className="w-4 h-4 text-amber-600" />
                              <span>
                                Creative Recipe Ideas ({dispatch.repurposedRecipes.length} Upcycled Meals)
                              </span>
                            </div>
                            {isRecipesOpen ? (
                              <ChevronUp className="w-4 h-4 text-amber-700" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-amber-700" />
                            )}
                          </button>

                          {isRecipesOpen && (
                            <div className="p-3 pt-0 space-y-3">
                              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                                NGOs and volunteers can turn this leftover into fresh hearty meals with minimal effort:
                              </p>
                              {dispatch.repurposedRecipes.map((recipe, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-1.5 shadow-sm text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-extrabold text-slate-900 dark:text-white">
                                      {recipe.title}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                      Effort: {recipe.effortLevel}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                                    {recipe.description}
                                  </p>
                                  {recipe.ingredientsNeeded && recipe.ingredientsNeeded.length > 0 && (
                                    <div className="text-[11px] text-slate-500">
                                      <strong className="text-slate-700 dark:text-slate-300">Pantry items: </strong>
                                      {recipe.ingredientsNeeded.join(", ")}
                                    </div>
                                  )}
                                  {recipe.instructions && recipe.instructions.length > 0 && (
                                    <ol className="list-decimal list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 pt-1">
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

                      {/* 6. Claim Status & Approvals Details */}
                      {isClaimed && approvedClaim && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <p className="font-bold">Claim Approved for {approvedClaim.ngoName}</p>
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                Pickup ETA: {approvedClaim.pickupEta} • Phone: {approvedClaim.contactPhone}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 7. Pending Claim Requests Drawer (Creator / NGO interaction) */}
                      {dispatch.claims && dispatch.claims.length > 0 && (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedClaims((prev) => ({
                                ...prev,
                                [dispatch._id]: !prev[dispatch._id],
                              }))
                            }
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                          >
                            <span>Pickup Claim Requests ({dispatch.claims.length})</span>
                            {isClaimsOpen ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {isClaimsOpen && (
                            <div className="p-3 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
                              {dispatch.claims.map((claim) => (
                                <div
                                  key={claim.claimId}
                                  className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {claim.ngoName}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          claim.status === "approved"
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                            : claim.status === "rejected"
                                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                        }`}
                                      >
                                        {claim.status.toUpperCase()}
                                      </span>
                                    </div>
                                    <p className="text-slate-500 text-[11px] mt-0.5">
                                      Contact: {claim.contactPerson} ({claim.contactPhone}) • ETA: {claim.pickupEta}
                                    </p>
                                    {claim.message && (
                                      <p className="text-slate-600 dark:text-slate-400 text-[11px] italic mt-1">
                                        "{claim.message}"
                                      </p>
                                    )}
                                  </div>

                                  {/* Approve / Decline Buttons for Food Lister */}
                                  {claim.status === "pending" && (
                                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                      <button
                                        onClick={() => handleApproveClaim(dispatch._id, claim.claimId)}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleRejectClaim(dispatch._id, claim.claimId)}
                                        className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-300 transition"
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

                      {/* 8. Interactive Coordination / Discussion Chat */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComments((prev) => ({
                              ...prev,
                              [dispatch._id]: !prev[dispatch._id],
                            }))
                          }
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
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
                            {/* Comments history */}
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                              {(!dispatch.comments || dispatch.comments.length === 0) && (
                                <p className="text-[11px] text-slate-400 italic text-center py-2">
                                  No questions or messages yet. Ask the donor about packaging, pickup times, etc.
                                </p>
                              )}
                              {dispatch.comments?.map((msg) => (
                                <div
                                  key={msg.commentId}
                                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 space-y-1"
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      {msg.authorName}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                      {msg.authorRole}
                                    </span>
                                  </div>
                                  <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                                    {msg.text}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* Message input */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                                  className="w-1/2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
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
                                  className="w-1/2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
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
                                  className="flex-1 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSendComment(dispatch._id)}
                                  className="p-2 bg-sky-900 hover:bg-sky-950 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-lg transition"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 9. Primary Action Buttons */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {isAvailable && (
                          <button
                            type="button"
                            onClick={() => setSelectedDispatchForClaim(dispatch)}
                            className="flex-1 py-2.5 px-4 bg-sky-900 hover:bg-sky-950 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Truck className="w-4 h-4" />
                            Request Pickup / Claim Food
                          </button>
                        )}

                        {isClaimPending && (
                          <button
                            type="button"
                            onClick={() => setSelectedDispatchForClaim(dispatch)}
                            className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Truck className="w-4 h-4" />
                            Submit Another Claim Request
                          </button>
                        )}

                        {isClaimed && (
                          <button
                            type="button"
                            onClick={() => setVerifyDispatch(dispatch)}
                            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <PackageCheck className="w-4 h-4" />
                            Verify Completed Delivery Proof
                          </button>
                        )}

                        {isDelivered && (
                          <button
                            type="button"
                            onClick={() => setActiveReceipt(dispatch)}
                            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
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

      {/* VIEW 2: Enlist Leftover or Surplus Food */}
      {activeView === "create" && (
        <div className="mt-8 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ChefHat className="w-6 h-6 text-sky-900 dark:text-sky-400" />
                Enlist Food for Rescue
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Whether you have leftover portions from home dinner or surplus from an event, post it here. Our AI will instantly assess safe storage days and upcycled recipes!
              </p>
            </div>

            <form onSubmit={handleCreateDispatch} className="space-y-6">
              {/* Photo Upload with Instant Feedback */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Food Photo (Required for AI Analysis & NGO Verification) *
                </label>
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-sky-500 transition cursor-pointer bg-slate-50/50 dark:bg-slate-950/40">
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
                        className="mx-auto max-h-56 rounded-xl object-cover shadow-md"
                      />
                      <p className="text-xs text-slate-500">Click or tap to change photo</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-400 flex items-center justify-center mb-3">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Upload or snap a photo of the food
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        High-quality photo allows instant AI storage analysis and builds trust with NGOs
                      </p>
                    </div>
                  )}
                </div>

                {/* Instant AI Feedback Banner right on the form! */}
                {analyzingPhoto && (
                  <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 flex items-center gap-2 text-xs text-sky-900 dark:text-sky-300">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                    <span>Analyzing food photo... Calculating safe storage days and recipe ideas...</span>
                  </div>
                )}

                {instantAnalysis && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs text-emerald-950 dark:text-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        AI Instant Storage Clearance:
                      </span>
                      <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                        Safe for {instantAnalysis.storageAdvice?.safeStorageDays || 2} Days in Fridge
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-snug">
                      {instantAnalysis.storageAdvice?.storageMethod}
                    </p>
                    {instantAnalysis.repurposedRecipes && instantAnalysis.repurposedRecipes[0] && (
                      <div className="pt-1 text-[11px] text-emerald-800 dark:text-emerald-300">
                        💡 <strong>Recipe Idea:</strong> {instantAnalysis.repurposedRecipes[0].title} (Effort: {instantAnalysis.repurposedRecipes[0].effortLevel})
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Title & Donor Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Food Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4 Portions of Biryani & Raita"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Source / Contributor Type
                  </label>
                  <select
                    value={donorType}
                    onChange={(e) => setDonorType(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="household">Home Cook / Household</option>
                    <option value="restaurant">Restaurant / Cafe</option>
                    <option value="caterer">Catering / Marriage Hall</option>
                    <option value="bakery">Bakery / Confectionery</option>
                    <option value="supermarket">Grocery / Supermarket</option>
                    <option value="other">Community Volunteer / Other</option>
                  </select>
                </div>
              </div>

              {/* Your Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Your Name or Organization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Sharma or Green Leaf Bistro"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Food Category
                  </label>
                  <select
                    value={foodCategory}
                    onChange={(e) => setFoodCategory(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pick-up Window & Urgency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "urgent_2h", label: "Urgent (Within 2 Hours)", desc: "Cooked warm meal" },
                    { id: "today", label: "Today (Pick-up Tonight)", desc: "Fresh & refrigerated" },
                    { id: "flexible", label: "Flexible (Next 24-48 Hours)", desc: "Airtight / packaged" },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setUrgency(item.id as any)}
                      className={`p-3 rounded-xl text-left border transition ${
                        urgency === item.id
                          ? "bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-950 dark:text-sky-200"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span className="font-bold text-xs block">{item.label}</span>
                      <span className="text-[10px] opacity-75">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Description & Handling Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Pure vegetarian meal, portioned in clean stainless steel containers. Please bring your own container or bags for pickup."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Pick-up Location Map (Zero Tech Jargon) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Pick-up Spot on Map *
                </label>
                <p className="text-xs text-slate-500">
                  Search your neighborhood or tap anywhere on the map to drop the pickup pin.
                </p>
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
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
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pick-up location set: {pickupLocation.establishment || pickupLocation.city || `${pickupLocation.lat.toFixed(4)}, ${pickupLocation.lng.toFixed(4)}`}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setActiveView("board")}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-sky-900 hover:bg-sky-950 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50 flex items-center gap-2"
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
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
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

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {selectedDispatchForClaim.title}
              </p>
              <p className="text-slate-500">
                Listed by: {selectedDispatchForClaim.donorName} • ~{selectedDispatchForClaim.estimatedServings} Meals
              </p>
              {selectedDispatchForClaim.storageAdvice && (
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Safe storage: {selectedDispatchForClaim.storageAdvice.safeStorageDays} days in fridge
                </p>
              )}
            </div>

            <form onSubmit={handleSubmitClaimRequest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Organization / Relief Group Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robin Hood Army / Annakshetra Foundation"
                  value={ngoNameInput}
                  onChange={(e) => setNgoNameInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Representative Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Verma"
                    value={contactPersonInput}
                    onChange={(e) => setContactPersonInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={contactPhoneInput}
                    onChange={(e) => setContactPhoneInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Pickup Time
                  </label>
                  <select
                    value={pickupEtaInput}
                    onChange={(e) => setPickupEtaInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="Within 30 Minutes">Within 30 Minutes</option>
                    <option value="Within 1 Hour">Within 1 Hour</option>
                    <option value="Within 2 Hours">Within 2 Hours</option>
                    <option value="Tonight (8-10 PM)">Tonight (8-10 PM)</option>
                    <option value="Tomorrow Morning">Tomorrow Morning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Beneficiaries to Feed
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 15"
                    value={beneficiariesInput}
                    onChange={(e) => setBeneficiariesInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Message for Donor (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. We have clean insulated containers and can pick it up immediately."
                  value={claimMessageInput}
                  onChange={(e) => setClaimMessageInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDispatchForClaim(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="px-5 py-2.5 bg-sky-900 hover:bg-sky-950 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingClaim ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Send Claim Request for Approval</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof-of-Delivery Handoff Modal */}
      {verifyDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
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

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Upload a photo of the handed-off food or distribution to beneficiaries to generate an immutable Digital Impact Receipt.
            </p>

            <form onSubmit={handleVerifyHandoff} className="space-y-4">
              <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center cursor-pointer bg-slate-50 dark:bg-slate-950/40">
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
                    className="mx-auto max-h-48 rounded-lg object-cover"
                  />
                ) : (
                  <div className="py-4">
                    <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Take or upload delivery proof photo
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Distribution Notes / Shelter Details
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Delivered 4 meals to community shelter on 8th Cross road."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVerifyDispatch(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Verify & Issue Impact Certificate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Impact Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-emerald-500/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PartyPopper className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
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
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                Rescue Mission Verified
              </span>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                {activeReceipt.title}
              </h4>
              <p className="text-xs text-slate-500">
                Rescued by {activeReceipt.claimedByNgoName || "Verified Partner NGO"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block uppercase">
                  Meals Served
                </span>
                <span className="text-xl font-black text-emerald-900 dark:text-emerald-100">
                  {activeReceipt.estimatedServings}
                </span>
              </div>
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800">
                <span className="text-[10px] text-sky-700 dark:text-sky-300 font-bold block uppercase">
                  CO₂ Diverted
                </span>
                <span className="text-xl font-black text-sky-900 dark:text-sky-100">
                  {activeReceipt.co2DivertedKg} kg
                </span>
              </div>
            </div>

            {activeReceipt.handoffMediaUrl && (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeReceipt.handoffMediaUrl}
                  alt="Delivery proof"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl">
              <p>
                <strong>Origin:</strong> {activeReceipt.donorName} ({activeReceipt.donorType})
              </p>
              <p>
                <strong>Timestamp:</strong>{" "}
                {activeReceipt.deliveredAt
                  ? new Date(activeReceipt.deliveredAt).toLocaleString()
                  : new Date().toLocaleString()}
              </p>
              {activeReceipt.deliveryNotes && (
                <p>
                  <strong>Notes:</strong> {activeReceipt.deliveryNotes}
                </p>
              )}
            </div>

            <button
              onClick={() => setActiveReceipt(null)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
