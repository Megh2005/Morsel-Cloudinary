"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Camera,
  Refrigerator,
  Leaf,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChefHat,
  Trash2,
  DollarSign,
  Lightbulb,
  X,
  Zap,
  RefreshCw,
  Palette,
  Search,
  Upload,
  RotateCcw,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { toast } from "react-toastify";
import { translateBatch } from "@/lib/translateHelper";

const CATEGORIES = [
  "All",
  "Produce",
  "Leftovers",
  "Dairy",
  "Bakery",
  "Protein",
  "Pantry",
  "Beverage",
  "Other",
];

export default function DashboardFeaturePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  // Active Tab: "scanner" | "inventory"
  const [activeTab, setActiveTab] = useState<"scanner" | "inventory">("scanner");

  // Global live metrics
  const [metrics, setMetrics] = useState({
    totalCo2Saved: 0,
    totalMoneySaved: 0,
    consumedCount: 0,
    wastedCount: 0,
    inFridgeCount: 0,
    rescueRate: 100,
    topWasted: [] as any[],
  });

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("in_fridge");
  const [activeRecipeModalItem, setActiveRecipeModalItem] = useState<
    any | null
  >(null);

  // Scanner state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [scanResult, setScanResult] = useState<any>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  // Real-time Camera Capture state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<
    "environment" | "user"
  >("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Multilingual translations
  const [currentLang, setCurrentLang] = useState("en");
  const [translatedMap, setTranslatedMap] = useState<Record<string, any>>({});
  const [translatedScanResult, setTranslatedScanResult] = useState<any>(null);

  // Strictly require authentication to interact with the dashboard
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth");
    }
  }, [status, router]);

  // Initialize and listen to tab searchParam or dock navigation
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam === "inventory" || tabParam === "scanner") {
      setActiveTab(tabParam as any);
    }

    const handleCustomTab = (e: any) => {
      if (e.detail?.tab) {
        if (e.detail.tab === "home") {
          setActiveTab("scanner");
        } else {
          setActiveTab(e.detail.tab);
        }
      }
    };
    window.addEventListener("morsel_switch_tab", handleCustomTab);
    return () =>
      window.removeEventListener("morsel_switch_tab", handleCustomTab);
  }, [searchParams]);

  // Load Inventory & Metrics from Full Database for authenticated user
  const refreshData = async () => {
    if (status !== "authenticated") return;
    try {
      setLoadingInventory(true);
      const invRes = await fetch(
        `/api/food/inventory?status=${selectedStatus}&category=${selectedCategory}`,
      );
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventoryItems(invData.items || []);
        if (currentLang !== "en" && invData.items?.length > 0) {
          translateInventoryItems(invData.items, currentLang);
        }
      }

      const impactRes = await fetch("/api/food/impact");
      if (impactRes.ok) {
        const impactData = await impactRes.json();
        if (impactData.metrics) {
          setMetrics(impactData.metrics);
        }
      }
    } catch (err) {
      console.warn("Error refreshing workspace data:", err);
    } finally {
      setLoadingInventory(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      refreshData();
    }
  }, [selectedCategory, selectedStatus, status]);

  // Listen to Language Changes
  useEffect(() => {
    const saved = localStorage.getItem("morsel_lang") || "en";
    setCurrentLang(saved);

    const handleLang = async (e: any) => {
      const newLang = e.detail?.lang || "en";
      setCurrentLang(newLang);
      if (inventoryItems.length > 0) {
        translateInventoryItems(inventoryItems, newLang);
      }
      if (scanResult) {
        translateScanResult(scanResult, newLang);
      }
    };
    window.addEventListener("morsel_language_change", handleLang);
    return () =>
      window.removeEventListener("morsel_language_change", handleLang);
  }, [inventoryItems, scanResult]);

  const translateInventoryItems = async (items: any[], lang: string) => {
    if (lang === "en") {
      setTranslatedMap({});
      return;
    }
    try {
      const texts: string[] = [];
      items.forEach((it) => {
        texts.push(it.name || "");
        texts.push(it.storageTips || "");
      });
      const translated = await translateBatch(texts, lang);
      const newMap: Record<string, any> = {};
      let idx = 0;
      items.forEach((it) => {
        newMap[it._id] = {
          name: translated[idx++],
          storageTips: translated[idx++],
        };
      });
      setTranslatedMap(newMap);
    } catch (e) {
      console.warn("Translation notice:", e);
    }
  };

  const translateScanResult = async (resData: any, lang: string) => {
    const items =
      resData?.detectedItems && resData.detectedItems.length > 0
        ? resData.detectedItems
        : resData?.analysis
          ? [resData.analysis]
          : [];

    if (lang === "en" || items.length === 0) {
      setTranslatedScanResult(null);
      return;
    }
    try {
      const texts: string[] = [];
      items.forEach((an: any) => {
        texts.push(an.itemName || "");
        texts.push(an.portionSize || "");
        texts.push(an.spoilageNotes || "");
        texts.push(an.storageTips || "");
        texts.push(an.healthHazardWarning || "");
        texts.push(an.disposalAdvice || "");
        (an.recipes || []).forEach((r: any) => {
          texts.push(r.title || "");
          texts.push(r.instructions || "");
        });
      });

      const trans = await translateBatch(texts, lang);
      let idx = 0;
      const translatedItems = items.map((an: any) => ({
        itemName: trans[idx++],
        portionSize: trans[idx++],
        spoilageNotes: trans[idx++],
        storageTips: trans[idx++],
        healthHazardWarning: trans[idx++],
        disposalAdvice: trans[idx++],
        recipes: (an.recipes || []).map((r: any) => ({
          ...r,
          title: trans[idx++],
          instructions: trans[idx++],
        })),
      }));

      setTranslatedScanResult({
        translatedItems,
        ...(translatedItems[0] || {}),
      });
    } catch (e) {
      console.warn("Scan translation notice:", e);
    }
  };

  // Scanner actions
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP)");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setScanResult(null);
    setSelectedItemIndex(0);
    setTranslatedScanResult(null);
  };

  // Real-Time Camera Controls
  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsLiveCameraActive(false);
    setCameraError(null);
  };

  const startLiveCamera = async (
    facing: "environment" | "user" = cameraFacingMode,
  ) => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        const msg = "Real-time camera access is not supported on this browser or device.";
        setCameraError(msg);
        toast.error(msg);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsLiveCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current
            .play()
            .catch((e) => console.warn("Video playback notice:", e));
        }
      }, 80);
    } catch (err: any) {
      console.error("Camera access error:", err);
      const isPermissionDenied =
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError";
      const errMsg = isPermissionDenied
        ? "Camera permission denied. Please allow camera permissions in your browser bar."
        : "Unable to start camera feed. Please check your camera permissions or upload a photo.";
      setCameraError(errMsg);
      toast.error(errMsg);
      setIsLiveCameraActive(false);
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing =
      cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextFacing);
    startLiveCamera(nextFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.warn("Camera initializing, please try again in a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Failed to capture image frame.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Failed to capture image frame.");
          return;
        }
        const file = new File(
          [blob],
          `realtime_food_${Date.now()}.jpg`,
          { type: "image/jpeg" },
        );
        handleFileSelect(file);
        stopLiveCamera();
        toast.success("Food photo captured in real time!");
      },
      "image/jpeg",
      0.95,
    );
  };

  // Cleanup camera stream when unmounting or switching tabs
  useEffect(() => {
    if (activeTab !== "scanner" && isLiveCameraActive) {
      stopLiveCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeTab, isLiveCameraActive]);

  const startAnalysis = async () => {
    if (status !== "authenticated") {
      toast.error("Please sign in to analyze food and track inventory.");
      router.push("/auth");
      return;
    }

    if (!selectedFile) {
      toast.warn("Please take or select a photo first");
      return;
    }

    setAnalyzing(true);
    setScanResult(null);
    setSelectedItemIndex(0);
    setAnalysisStep(1);

    const step2Timer = setTimeout(() => setAnalysisStep(2), 1200);
    const step3Timer = setTimeout(() => setAnalysisStep(3), 2600);
    const step4Timer = setTimeout(() => setAnalysisStep(4), 4200);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("saveToInventory", "true");

      const response = await fetch("/api/food/analyze", {
        method: "POST",
        body: formData,
      });

      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
      clearTimeout(step4Timer);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze food");
      }

      const data = await response.json();
      setSelectedItemIndex(0);
      setScanResult(data);
      const itemsCount = data.detectedItems?.length || 1;
      toast.success(
        itemsCount > 1
          ? `Recognized all ${itemsCount} food items! Saved to your smart fridge.`
          : "Food scanned and saved to your fridge inventory!",
      );

      refreshData();

      if (currentLang !== "en") {
        translateScanResult(data, currentLang);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze food");
    } finally {
      setAnalyzing(false);
      setAnalysisStep(0);
    }
  };

  // Inventory actions
  const handleUpdateStatus = async (
    id: string,
    status: "consumed" | "wasted",
  ) => {
    try {
      const res = await fetch(`/api/food/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");

      toast.success(
        status === "consumed"
          ? "Great job saving food! Logged to your Impact metrics."
          : "Item marked as wasted.",
      );
      refreshData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to remove this item?")) return;
    try {
      const res = await fetch(`/api/food/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      toast.success("Item removed from fridge");
      refreshData();
      if (activeRecipeModalItem?._id === id) setActiveRecipeModalItem(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete item");
    }
  };

  // Filtered inventory
  const filteredItems = inventoryItems;

  const getUrgencyConfig = (
    risk: string,
    daysLeft: number,
    isConsumable?: boolean,
    isStorable?: boolean,
  ) => {
    if (risk === "spoiled" || isConsumable === false || isStorable === false) {
      return {
        badge: "DO NOT CONSUME / SPOILED",
        shortBadge: "SPOILED",
        color: "bg-rose-700 text-white border-rose-950 font-black tracking-wide",
        meter: "bg-rose-600",
        isSpoiled: true,
      };
    }
    if (risk === "high" || daysLeft <= 1) {
      return {
        badge: "EAT FIRST",
        shortBadge: "EAT FIRST",
        color: "bg-red-600 text-white border-red-700 font-bold",
        meter: "bg-red-500",
        isSpoiled: false,
      };
    }
    if (risk === "medium" || daysLeft <= 3) {
      return {
        badge: `USE IN ${daysLeft}D`,
        shortBadge: `${daysLeft}D LEFT`,
        color: "bg-amber-600 text-white border-amber-700 font-bold",
        meter: "bg-amber-500",
        isSpoiled: false,
      };
    }
    return {
      badge: "FRESH",
      shortBadge: "FRESH",
      color: "bg-emerald-600 text-white border-emerald-800 font-bold",
      meter: "bg-emerald-500",
      isSpoiled: false,
    };
  };

  // Authentication Loading State
  if (status === "loading") {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-full border-3 border-sky-900 border-t-transparent animate-spin" />
        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
          Verifying authentication...
        </p>
      </div>
    );
  }

  // Authentication Required Gate
  if (status === "unauthenticated") {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center space-y-4 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 flex items-center justify-center border-2 border-slate-900 shadow-md">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Authentication Required</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
          Please sign in to access your smart fridge inventory, AI food scanner, and sustainability impact analytics.
        </p>
        <button
          onClick={() => router.push("/auth")}
          className="px-6 py-2.5 rounded-full border-2 border-slate-900 bg-sky-900 text-white font-bold text-xs hover:bg-sky-800 shadow-md transition-transform hover:scale-105"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex flex-col items-center w-full">
      {/* Top Real-Time Stats Bar */}
      <div className="w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 border border-slate-900 flex items-center justify-center text-sky-900 dark:text-sky-300 shrink-0">
              <Refrigerator className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {metrics.inFridgeCount ||
                  inventoryItems.filter((i) => i.status === "in_fridge").length}
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                In Fridge
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 border border-slate-900 flex items-center justify-center text-emerald-800 dark:text-emerald-300 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600">
                {metrics.consumedCount || 0}
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Meals Rescued
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 border border-slate-900 flex items-center justify-center text-emerald-800 dark:text-emerald-300 shrink-0">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600">
                {metrics.totalCo2Saved || 0} <span className="text-xs">kg</span>
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                CO2 Emissions Avoided
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 border border-slate-900 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-600">
                ₹{metrics.totalMoneySaved || 0}
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Grocery Value Saved
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Single-Screen Tab Switcher - Centered Horizontally */}
      <div className="flex items-center justify-center w-full my-1">
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl border-2 border-slate-900 bg-white/95 dark:bg-slate-900/90 shadow-md">
          <button
            type="button"
            onClick={() => {
              setActiveTab("scanner");
              router.replace("/dashboard?tab=scanner", { scroll: false });
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === "scanner"
                ? "bg-sky-900 text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Food Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("inventory");
              router.replace("/dashboard?tab=inventory", { scroll: false });
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === "inventory"
                ? "bg-sky-900 text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
            }`}
          >
            <Refrigerator className="w-4 h-4" />
            <span>Fridge Inventory ({inventoryItems.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FOOD SCANNER */}
      {activeTab === "scanner" && (
        <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeIn">
          {!scanResult ? (
            <div className="max-w-3xl mx-auto">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0])
                    handleFileSelect(e.dataTransfer.files[0]);
                }}
                className={`relative rounded-3xl border-3 border-dashed transition-all p-8 text-center bg-white/95 dark:bg-slate-900/90 shadow-xl ${
                  isDragging
                    ? "border-sky-700 bg-sky-50 dark:bg-sky-950/30 scale-[1.01]"
                    : "border-slate-900 dark:border-slate-700"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0])
                      handleFileSelect(e.target.files[0]);
                  }}
                />

                {isLiveCameraActive ? (
                  <div className="space-y-4">
                    <div className="relative mx-auto w-full max-w-lg h-72 sm:h-84 rounded-2xl overflow-hidden border-2 border-slate-900 shadow-xl bg-black">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Viewfinder crosshairs guide */}
                      <div className="absolute inset-5 sm:inset-7 border-2 border-dashed border-white/70 rounded-2xl pointer-events-none flex items-center justify-center">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white bg-black/60 px-3 py-1 rounded-md backdrop-blur-xs">
                          Align Food in Center
                        </span>
                      </div>

                      {/* Live camera badge */}
                      <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        LIVE CAMERA
                      </div>

                      {/* Close button */}
                      <button
                        type="button"
                        onClick={stopLiveCamera}
                        className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black text-white text-xs backdrop-blur-xs transition-colors shadow-md"
                        title="Close Camera"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Camera Controls */}
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-6 py-2.5 rounded-full border-2 border-slate-900 bg-sky-900 hover:bg-sky-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-transform active:scale-95"
                      >
                        <Camera className="w-4 h-4" />
                        Capture Food Photo
                      </button>

                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="px-4 py-2.5 rounded-full border-2 border-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                        title="Switch Front / Back Camera"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Flip Camera
                      </button>

                      <button
                        type="button"
                        onClick={stopLiveCamera}
                        className="px-4 py-2.5 rounded-full border-2 border-slate-400 hover:border-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : previewUrl ? (
                  <div className="space-y-6">
                    <div className="relative mx-auto w-full max-w-md h-64 sm:h-72 rounded-2xl overflow-hidden border-2 border-slate-900 shadow-md">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black text-white text-xs backdrop-blur-xs transition-colors"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {analyzing ? (
                      <div className="p-6 rounded-2xl border-2 border-slate-900 bg-sky-50 dark:bg-slate-800 text-left space-y-3">
                        <div className="flex items-center gap-3">
                          <RefreshCw className="w-5 h-5 text-sky-900 dark:text-sky-300 animate-spin" />
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                            Multi-Item Culinary Analysis & Regional Freshness Assessment...
                          </h3>
                        </div>

                        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            {analysisStep >= 1 ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-400" />
                            )}
                            <span>
                              1. High-resolution visual preprocessing and lighting optimization
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {analysisStep >= 2 ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-400" />
                            )}
                            <span>
                              2. Multi-item recognition, framing, and color palette extraction
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {analysisStep >= 3 ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-400" />
                            )}
                            <span>
                              3. Deep freshness diagnosis, spoilage prediction & regional climate adjustment
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {analysisStep >= 4 ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-400" />
                            )}
                            <span>
                              4. Generating individual rescue recipes with local pantry staples
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewUrl(null);
                            startLiveCamera();
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-white hover:bg-slate-100 transition-all text-xs flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Camera className="w-4 h-4" />
                          Retake Live
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-white hover:bg-slate-100 transition-all text-xs flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Another
                        </button>
                        <button
                          type="button"
                          onClick={startAnalysis}
                          className="w-full sm:w-auto px-7 py-2.5 rounded-xl border-2 border-slate-900 bg-sky-900 hover:bg-sky-800 text-white font-bold transition-all text-xs flex items-center justify-center gap-2 shadow-md hover:scale-[1.02]"
                        >
                          <Zap className="w-4 h-4 text-amber-300" />
                          Analyze with Morsel AI
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/40 border-2 border-slate-900 flex items-center justify-center text-sky-900 dark:text-sky-300 mb-3 shadow-xs">
                      <Camera className="w-7 h-7" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Scan Your Food in Real Time
                    </h3>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1.5 max-w-sm mx-auto">
                      Capture live through your webcam or device camera, or upload a photo of leftovers, produce, or groceries.
                    </p>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => startLiveCamera()}
                        className="px-6 py-2.5 rounded-full border-2 border-slate-900 bg-sky-900 hover:bg-sky-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                      >
                        <Camera className="w-4 h-4" />
                        Turn On Camera (Live)
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-2.5 rounded-full border-2 border-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-900 dark:text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Photo
                      </button>
                    </div>

                    {cameraError && (
                      <div className="mt-4 p-3 rounded-xl border border-red-300 bg-red-50 text-red-800 text-xs font-semibold max-w-md mx-auto flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{cameraError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            (() => {
              const detectedItems: any[] =
                scanResult.detectedItems && scanResult.detectedItems.length > 0
                  ? scanResult.detectedItems
                  : scanResult.analysis
                    ? [scanResult.analysis]
                    : [];
              const currentItem =
                detectedItems[selectedItemIndex] ||
                detectedItems[0] ||
                scanResult.analysis ||
                {};
              const currentTranslated = translatedScanResult?.translatedItems
                ? translatedScanResult.translatedItems[selectedItemIndex]
                : translatedScanResult;
              const isItemSpoiled =
                currentItem?.spoilageRisk === "spoiled" ||
                currentItem?.isConsumable === false ||
                currentItem?.isStorable === false;
              const currentUrgency = getUrgencyConfig(
                currentItem?.spoilageRisk,
                currentItem?.estimatedDaysLeft,
                currentItem?.isConsumable,
                currentItem?.isStorable,
              );

              return (
                <div className="space-y-6">
                  {/* Top Notification Bar */}
                  <div
                    className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl border-2 ${
                      isItemSpoiled
                        ? "border-rose-700 bg-rose-50 dark:bg-rose-950/70 text-rose-950 dark:text-rose-100"
                        : "border-slate-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isItemSpoiled ? (
                        <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 animate-pulse" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      <span className="font-bold text-xs sm:text-sm">
                        {isItemSpoiled
                          ? `CRITICAL ALERT: ${currentTranslated?.itemName || currentItem?.itemName} is Spoiled / Rotten — Unsafe to Consume!`
                          : detectedItems.length > 1
                            ? `All ${detectedItems.length} Food Items Recognized & Saved to Your Smart Fridge!`
                            : "Item Saved to Your Smart Fridge Inventory!"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("inventory");
                          router.replace("/dashboard?tab=inventory", {
                            scroll: false,
                          });
                        }}
                        className="px-3.5 py-1.5 rounded-xl border-2 border-slate-900 bg-white dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white hover:bg-slate-100 transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <Refrigerator className="w-3.5 h-3.5" />
                        View in Fridge
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          setScanResult(null);
                          setSelectedItemIndex(0);
                        }}
                        className="px-3.5 py-1.5 rounded-xl border-2 border-slate-900 bg-sky-900 font-bold text-xs text-white hover:bg-sky-800 transition-all shadow-xs"
                      >
                        Scan Another
                      </button>
                    </div>
                  </div>

                  {/* Multi-Item Recognition Navigation Bar */}
                  {detectedItems.length > 1 && (
                    <div className="p-4 rounded-3xl border-2 border-slate-900 bg-white dark:bg-slate-900 shadow-md space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-sky-900 dark:text-sky-300">
                            {detectedItems.length} Food Items Identified
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            (Select an item to view its individual freshness diagnosis & safety advice)
                          </span>
                        </div>
                        {scanResult.locationContext && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            <MapPin className="w-3 h-3 text-sky-700 dark:text-sky-400" />
                            <span>Location: {scanResult.locationContext}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 scrollbar-none">
                        {detectedItems.map((item: any, idx: number) => {
                          const isSelected = idx === selectedItemIndex;
                          const isSpoiled =
                            item.spoilageRisk === "spoiled" ||
                            item.isConsumable === false ||
                            item.isStorable === false;
                          const urg = getUrgencyConfig(
                            item.spoilageRisk,
                            item.estimatedDaysLeft,
                            item.isConsumable,
                            item.isStorable,
                          );
                          const displayName =
                            translatedScanResult?.translatedItems?.[idx]?.itemName ||
                            item.itemName;

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedItemIndex(idx)}
                              className={`px-3.5 py-2 rounded-2xl border-2 font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                                isSelected
                                  ? isSpoiled
                                    ? "border-rose-900 bg-rose-700 text-white shadow-md scale-[1.02]"
                                    : "border-slate-900 bg-sky-900 text-white shadow-md scale-[1.02]"
                                  : isSpoiled
                                    ? "border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 hover:bg-rose-100"
                                    : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                              }`}
                            >
                              <span>{displayName}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase border ${urg.color}`}
                              >
                                {urg.badge}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PROMINENT SPOILAGE & HEALTH HAZARD ALERT BANNER */}
                  {isItemSpoiled && (
                    <div className="p-5 sm:p-6 rounded-3xl border-3 border-rose-600 bg-rose-50 dark:bg-rose-950/80 shadow-2xl space-y-4 text-left">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-rose-600 text-white shrink-0 shadow-md">
                          <ShieldAlert className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                            CRITICAL FOOD SAFETY & HEALTH ALERT
                          </span>
                          <h3 className="text-base sm:text-xl font-black text-rose-950 dark:text-rose-100">
                            DO NOT CONSUME: {currentTranslated?.itemName || currentItem?.itemName} is Spoiled & Unstorable
                          </h3>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-800 space-y-2.5">
                        <div className="text-xs sm:text-sm font-bold text-rose-950 dark:text-rose-200 leading-relaxed">
                          <strong className="font-black text-rose-600 dark:text-rose-400">Health Hazard: </strong>
                          {currentTranslated?.healthHazardWarning ||
                            currentItem?.healthHazardWarning ||
                            "Severe active decay, bacterial decomposition, or fungal mold detected. Ingestion presents a direct risk of mycotoxin poisoning and acute foodborne illness. DO NOT CONSUME."}
                        </div>

                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 pt-2 border-t border-rose-100 dark:border-rose-900 leading-relaxed">
                          <strong className="font-black text-amber-700 dark:text-amber-400">Cross-Contamination Warning: </strong>
                          DO NOT store this item inside your refrigerator or pantry. Decaying food releases airborne mold spores and ethylene gas that will rapidly spoil surrounding healthy food.
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-rose-100/80 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-700 text-xs font-semibold text-rose-950 dark:text-rose-100 flex items-start gap-2.5">
                        <Trash2 className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-black">Recommended Safe Disposal: </strong>
                          {currentTranslated?.disposalAdvice ||
                            currentItem?.disposalAdvice ||
                            "Seal immediately in a designated compostable bag or disposal bin. Discard away from living and food-preparation zones."}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Result Details Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Image card and visual diagnosis */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="p-4 rounded-3xl border-2 border-slate-900 bg-white dark:bg-slate-900 shadow-xl space-y-3">
                        <div className="relative rounded-2xl overflow-hidden border-2 border-slate-900 aspect-square bg-slate-100">
                          <img
                            src={
                              scanResult.cloudinary?.originalUrl ||
                              scanResult.item?.cloudinaryUrl ||
                              scanResult.cloudinary?.badgedUrl ||
                              previewUrl ||
                              ""
                            }
                            alt={currentItem?.itemName || "Scanned food"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              if (
                                previewUrl &&
                                e.currentTarget.src !== previewUrl
                              ) {
                                e.currentTarget.src = previewUrl;
                              }
                            }}
                          />
                          {/* Crisp DOM Badge overlay tuned to active item */}
                          <div
                            className={`absolute top-3 left-3 px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase border-2 shadow-lg ${currentUrgency.color}`}
                          >
                            {currentUrgency.badge}
                          </div>
                        </div>

                        {/* Freshness Assessment Notes */}
                        {currentItem?.spoilageNotes && (
                          <div
                            className={`p-3.5 rounded-xl border leading-relaxed text-xs font-semibold ${
                              isItemSpoiled
                                ? "border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/50 text-rose-950 dark:text-rose-100"
                                : "border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            <strong
                              className={`font-bold ${
                                isItemSpoiled
                                  ? "text-rose-700 dark:text-rose-300"
                                  : "text-amber-950 dark:text-amber-200"
                              }`}
                            >
                              Visual Freshness Assessment:{" "}
                            </strong>
                            {currentTranslated?.spoilageNotes ||
                              currentItem.spoilageNotes}
                          </div>
                        )}

                        {/* Extracted Color Palette */}
                        {scanResult.cloudinary?.dominantColors?.length > 0 && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                              <Palette className="w-3.5 h-3.5" />
                              <span>Extracted Visual Color Palette</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {scanResult.cloudinary.dominantColors.map(
                                (color: string, i: number) => (
                                  <div
                                    key={i}
                                    className="w-6 h-6 rounded-md border-2 border-slate-900"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Intelligence details, location tuning & recipes */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="p-5 rounded-3xl border-2 border-slate-900 bg-white dark:bg-slate-900 shadow-xl space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-800">
                              {currentItem?.category || "Produce"}
                            </span>
                            <span className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                              {currentTranslated?.portionSize ||
                                currentItem?.portionSize}
                            </span>
                          </div>

                          {scanResult.locationContext && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-sky-900 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                              <MapPin className="w-3 h-3 text-sky-700 dark:text-sky-400 shrink-0" />
                              <span>Tuned for {scanResult.locationContext}</span>
                            </div>
                          )}
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                          {currentTranslated?.itemName || currentItem?.itemName}
                        </h2>

                        {isItemSpoiled ? (
                          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                            <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/70 border-2 border-rose-600 text-rose-950 dark:text-rose-100 font-black">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                              <span>UNFIT FOR CONSUMPTION</span>
                            </div>
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                              <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              <span>0 days left (Rotten / Expired)</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                              <Leaf className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                              <span>
                                +{currentItem?.co2SavedKg || 1.1} kg CO2 Saved
                              </span>
                            </div>
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                              <DollarSign className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                              <span>
                                ₹{currentItem?.financialSavings || 90} Saved
                              </span>
                            </div>
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                              <Clock className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                              <span>
                                ~{currentItem?.estimatedDaysLeft || 3} days left
                              </span>
                            </div>
                          </div>
                        )}

                        <div
                          className={`pt-2 text-xs font-semibold p-3.5 rounded-xl border-2 leading-relaxed ${
                            isItemSpoiled
                              ? "bg-rose-100/90 dark:bg-rose-950/70 border-rose-400 dark:border-rose-700 text-rose-950 dark:text-rose-100"
                              : "bg-slate-100/90 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          <strong
                            className={`font-bold ${
                              isItemSpoiled
                                ? "text-rose-700 dark:text-rose-300"
                                : "text-slate-950 dark:text-white"
                            }`}
                          >
                            {isItemSpoiled
                              ? "Storage Directive: "
                              : "Climate-Tuned Storage Tip: "}
                          </strong>
                          {isItemSpoiled
                            ? "DO NOT STORE — Item is spoiled and will cross-contaminate surrounding food in the fridge or pantry."
                            : currentTranslated?.storageTips ||
                              currentItem?.storageTips}
                        </div>
                      </div>

                      {/* Rescue Recipes OR Safe Disposal Protocol */}
                      {isItemSpoiled ? (
                        <div className="p-5 rounded-3xl border-2 border-rose-600 bg-white dark:bg-slate-900 shadow-xl space-y-3.5">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-rose-600" />
                            <h3 className="font-bold text-sm text-rose-950 dark:text-rose-200">
                              Safe Disposal & Waste Protocol (No Cooking Advised)
                            </h3>
                          </div>

                          <div className="space-y-3">
                            <div className="p-3.5 rounded-2xl border-2 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 space-y-1">
                              <h4 className="font-bold text-xs sm:text-sm text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                                Why Boiling or Cooking Does Not Make It Safe
                              </h4>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                                Bacterial and fungal toxins (such as mycotoxins, aflatoxins, and staphylococcal enterotoxins) are heat-stable and cannot be eliminated by cooking, boiling, or baking. Ingesting cooked spoiled food can still cause toxic food poisoning.
                              </p>
                            </div>

                            <div className="p-3.5 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-1">
                              <h4 className="font-bold text-xs sm:text-sm text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                                Safe Eco-Friendly Composting
                              </h4>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                                {currentItem.category === "Dairy" || currentItem.category === "Protein"
                                  ? "Seal in an airtight container or municipal organic waste bin. Avoid open home compost piles to prevent attracting rodents."
                                  : "Plant-based scraps and spoiled fruits/vegetables can be safely composted in outdoor bins to enrich garden soil."}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 rounded-3xl border-2 border-slate-900 bg-white dark:bg-slate-900 shadow-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ChefHat className="w-4 h-4 text-sky-900 dark:text-sky-300" />
                              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                Individual Rescue Recipes for {currentTranslated?.itemName || currentItem?.itemName}
                              </h3>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {(currentTranslated?.recipes || currentItem?.recipes || []).length} suggestions
                            </span>
                          </div>

                          <div className="space-y-3">
                            {(
                              currentTranslated?.recipes ||
                              currentItem?.recipes ||
                              []
                            ).map((recipe: any, i: number) => (
                              <div
                                key={i}
                                className="p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                    {recipe.title}
                                  </h4>
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-sky-800 dark:text-sky-300" />
                                    {recipe.time}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                                  {recipe.instructions}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* TAB 2: FRIDGE INVENTORY (LIVE DATABASE ITEMS) */}
      {activeTab === "inventory" && (
        <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn">
          {/* Status Filters - Centered Horizontally */}
          <div className="flex items-center justify-center w-full">
            <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-full border-2 border-slate-900 bg-white dark:bg-slate-900 shadow-xs">
              <button
                type="button"
                onClick={() => setSelectedStatus("in_fridge")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedStatus === "in_fridge"
                    ? "bg-sky-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                In Fridge
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus("consumed")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedStatus === "consumed"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Rescued / Consumed
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus("wasted")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedStatus === "wasted"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Discarded
              </button>
            </div>
          </div>

          {/* Category Pills - Centered Horizontally */}
          <div className="flex flex-wrap items-center justify-center gap-2 py-1 w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border border-slate-900 transition-all ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-950"
                    : "bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          {loadingInventory ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-sky-900 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Loading your food database...
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-14 text-center border-2 border-dashed border-slate-900 dark:border-slate-700 rounded-3xl bg-white/70 dark:bg-slate-900/60 p-6 max-w-md mx-auto">
              <Refrigerator className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No food items found in database
              </h3>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 mb-4">
                Scan your first item to automatically populate your smart
                inventory.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("scanner");
                  router.replace("/dashboard?tab=scanner", { scroll: false });
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full border-2 border-slate-900 bg-sky-900 text-white font-bold text-xs hover:bg-sky-800 shadow-sm"
              >
                <Camera className="w-4 h-4" />
                Scan Food Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredItems.map((item) => {
                const urgency = getUrgencyConfig(
                  item.spoilageRisk,
                  item.estimatedDaysLeft,
                  item.isConsumable,
                  item.isStorable,
                );
                const itemName = translatedMap[item._id]?.name || item.name;
                const itemTips =
                  translatedMap[item._id]?.storageTips || item.storageTips;
                const itemImgSrc = item.cloudinaryUrl || item.badgedUrl || "";
                const isItemSpoiled =
                  urgency.isSpoiled ||
                  item.spoilageRisk === "spoiled" ||
                  item.isConsumable === false;

                return (
                  <div
                    key={item._id}
                    className={`flex flex-col rounded-3xl border-2 overflow-hidden shadow-md hover:shadow-xl transition-all group ${
                      isItemSpoiled
                        ? "border-rose-600 bg-rose-50/20 dark:bg-rose-950/20"
                        : "border-slate-900 bg-white dark:bg-slate-900"
                    }`}
                  >
                    {/* Thumbnail with fail-safe error handling and crisp DOM badge overlay */}
                    <div className="relative aspect-4/3 overflow-hidden border-b-2 border-slate-900 bg-slate-100">
                      <img
                        src={itemImgSrc}
                        alt={itemName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          if (
                            item.cloudinaryUrl &&
                            e.currentTarget.src !== item.cloudinaryUrl
                          ) {
                            e.currentTarget.src = item.cloudinaryUrl;
                          }
                        }}
                      />

                      {/* Urgency Badge (DO NOT CONSUME / EAT FIRST / USE IN 2D / FRESH) */}
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-sm ${urgency.color}`}
                        >
                          {urgency.badge}
                        </span>
                      </div>

                      {/* Rescued / Discarded Status Badges */}
                      {item.status === "consumed" && (
                        <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border-2 border-emerald-800 shadow-md flex items-center gap-1.5 z-10">
                          <CheckCircle2 className="w-3.5 h-3.5" /> RESCUED
                        </div>
                      )}
                      {item.status === "wasted" && (
                        <div className="absolute top-2.5 right-2.5 bg-red-600 text-white text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border-2 border-red-800 shadow-md flex items-center gap-1.5 z-10">
                          DISCARDED
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 font-bold text-slate-800 dark:text-slate-200">
                            {item.category}
                          </span>
                          <span
                            className={`flex items-center gap-1 font-bold ${
                              isItemSpoiled
                                ? "text-rose-600 dark:text-rose-400 font-black"
                                : "text-sky-900 dark:text-sky-300"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {isItemSpoiled ? "SPOILED" : `${item.estimatedDaysLeft}d left`}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                          {itemName}
                        </h3>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1 mt-0.5">
                          {item.portionSize || "Standard portion"}
                        </p>

                        {isItemSpoiled && (
                          <div className="mt-2 p-2 rounded-xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-[11px] font-bold text-rose-900 dark:text-rose-200 flex items-start gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <span>
                              {item.healthHazardWarning ||
                                "Unfit for consumption — Discard immediately."}
                            </span>
                          </div>
                        )}

                        {!isItemSpoiled && itemTips && (
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2 line-clamp-2 bg-slate-100/90 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 flex items-start gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{itemTips}</span>
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                        {item.status === "in_fridge" && (
                          isItemSpoiled ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStatus(item._id, "wasted")
                              }
                              className="w-full py-2 px-3 rounded-xl border-2 border-rose-800 bg-rose-700 hover:bg-rose-800 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Discard Spoiled Food Now
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus(item._id, "consumed")
                                }
                                className="flex-1 py-1.5 px-2.5 rounded-xl border-2 border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                I Rescued This
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus(item._id, "wasted")
                                }
                                className="py-1.5 px-3 rounded-xl border-2 border-slate-400 hover:border-red-600 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-bold transition-colors"
                              >
                                Discard
                              </button>
                            </div>
                          )
                        )}

                        {item.status === "consumed" && (
                          <div className="py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Rescued & Safely Consumed
                          </div>
                        )}

                        {item.status === "wasted" && (
                          <div className="py-1.5 px-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-bold flex items-center justify-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            Discarded
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          {item.recipes?.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setActiveRecipeModalItem(item)}
                              className="text-xs font-bold text-sky-900 dark:text-sky-300 hover:underline flex items-center gap-1"
                            >
                              <ChefHat className="w-3.5 h-3.5" />
                              Recipes ({item.recipes.length})
                            </button>
                          ) : (
                            <span />
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item._id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recipe Modal */}
      {activeRecipeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border-2 border-slate-900 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-sky-900" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Recipes for {activeRecipeModalItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveRecipeModalItem(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {activeRecipeModalItem.recipes?.map(
                (recipe: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {recipe.title}
                      </h4>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-900 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-800" />
                        {recipe.time}
                      </span>
                    </div>

                    {recipe.ingredients?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {recipe.ingredients.map((ing: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 border border-slate-400 text-slate-900 dark:text-slate-100"
                          >
                            {ing}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                      {recipe.instructions}
                    </p>
                  </div>
                ),
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveRecipeModalItem(null)}
                className="w-full py-2.5 rounded-xl border-2 border-slate-900 bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
