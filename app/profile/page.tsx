"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackgroundPattern from "@/components/BackgroundPattern";
import Image from "next/image";
import SignOutButton from "@/components/SignOutButton";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import {
  Pencil,
  Map as MapIcon,
  User,
  MapPinned,
  Mail,
  Globe,
} from "lucide-react";
import {
  getAlphabeticalCountries,
  getAlphabeticalStates,
  getAlphabeticalCities,
  CountryOption,
  StateOption,
  CityOption,
} from "@/lib/locations";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [availableStates, setAvailableStates] = useState<StateOption[]>([]);
  const [availableCities, setAvailableCities] = useState<CityOption[]>([]);
  const [userData, setUserData] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    country: "",
    state: "",
    city: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [status, router]);

  useEffect(() => {
    setCountries(getAlphabeticalCountries());
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setFormData({
          name: data.name || "",
          country: data.country || "",
          state: data.state || "",
          city: data.city || "",
        });
        setUserData(data);
      }
    } catch (error) {
      console.error("Failed to fetch user data", error);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    }
  }, [session]);

  useEffect(() => {
    if (formData.country) {
      const states = getAlphabeticalStates(formData.country);
      setAvailableStates(states);
    } else {
      setAvailableStates([]);
    }
  }, [formData.country]);

  useEffect(() => {
    if (formData.country && formData.state) {
      const cities = getAlphabeticalCities(formData.country, formData.state);
      setAvailableCities(cities);
    } else {
      setAvailableCities([]);
    }
  }, [formData.country, formData.state]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <BackgroundPattern />
        <p className="text-slate-900 font-medium">Loading...</p>
      </div>
    );
  }

  if (!session?.user) return null;

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setFormData((prev) => ({
      ...prev,
      country: selected,
      state: "",
      city: "",
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          country: formData.country,
          state: formData.state,
          city: formData.city,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Update failed");
      }

      if (data.user) {
        setUserData((prev: any) => ({ ...prev, ...data.user }));
      }

      await update();
      await fetchUserData();

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: session.user.name || "",
      country: userData?.country || "",
      state: userData?.state || "",
      city: userData?.city || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <BackgroundPattern />
      <Card className="w-full max-w-4xl border-2 border-slate-900 shadow-lg rounded-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center relative border-b border-slate-900 pb-2">
          <CardTitle className="text-2xl font-bold text-slate-900">
            User Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 pt-2">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-slate-900 shadow-md shrink-0">
            {session.user.image || (session.user as any).avatar ? (
              <Image
                src={
                  session.user.image ||
                  (session.user as any).avatar ||
                  "https://robohash.org/placeholder"
                }
                alt="Avatar"
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-3xl">
                {session.user.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className="w-full space-y-5 px-2">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-slate-900 font-semibold text-sm"
                  >
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white font-medium text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-slate-900 font-semibold text-sm"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={session.user.email || ""}
                    disabled
                    className="border-2 border-slate-300 rounded-lg bg-slate-50 text-slate-500 font-medium"
                  />
                  <p className="text-xs text-slate-500 font-medium">
                    Email cannot be changed
                  </p>
                </div>

                {/* Country Selection */}
                <div className="space-y-2">
                  <Label
                    htmlFor="country"
                    className="text-slate-900 font-semibold text-sm"
                  >
                    Country
                  </Label>
                  <select
                    id="country"
                    value={formData.country}
                    onChange={handleCountryChange}
                    className="h-10 w-full border-2 border-slate-900 focus:border-sky-900 rounded-lg bg-white font-medium text-slate-900 px-3 text-sm outline-none transition-colors"
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.isoCode} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State and City beside each other */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="state"
                      className="text-slate-900 font-semibold text-sm"
                    >
                      State
                    </Label>
                    {availableStates.length > 0 ? (
                      <select
                        id="state"
                        value={formData.state}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            state: e.target.value,
                            city: "",
                          }))
                        }
                        className="h-10 w-full border-2 border-slate-900 focus:border-sky-900 rounded-lg bg-white font-medium text-slate-900 px-3 text-sm outline-none transition-colors"
                      >
                        <option value="">Select State</option>
                        {availableStates.map((s) => (
                          <option key={s.isoCode} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="state"
                        placeholder={
                          formData.country
                            ? "State / Province (optional)"
                            : "Select country first"
                        }
                        value={formData.state}
                        disabled={!formData.country}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            state: e.target.value,
                            city: "",
                          }))
                        }
                        className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white font-medium text-slate-900 disabled:bg-slate-50 disabled:border-slate-300 disabled:text-slate-400"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="city"
                      className="text-slate-900 font-semibold text-sm"
                    >
                      City
                    </Label>
                    {availableCities.length > 0 ? (
                      <select
                        id="city"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        className="h-10 w-full border-2 border-slate-900 focus:border-sky-900 rounded-lg bg-white font-medium text-slate-900 px-3 text-sm outline-none transition-colors"
                      >
                        <option value="">Select City</option>
                        {availableCities.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="city"
                        placeholder={
                          formData.state
                            ? "City / Town (optional)"
                            : "Select state first"
                        }
                        value={formData.city}
                        disabled={!formData.state}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white font-medium text-slate-900 disabled:bg-slate-50 disabled:border-slate-300 disabled:text-slate-400"
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold bg-sky-900 text-white hover:bg-sky-800 border-2 border-slate-900 hover:shadow-md active:shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold bg-slate-100 text-slate-900 hover:bg-slate-200 border-2 border-slate-900 hover:shadow-md active:shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border-2 border-slate-900 rounded-lg p-4 flex items-center gap-4 hover:bg-white transition-colors">
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border-2 border-slate-900">
                      <User className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Name
                      </p>
                      <p className="text-base font-bold text-slate-900">
                        {session.user.name}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border-2 border-slate-900 rounded-lg p-4 flex items-center gap-4 hover:bg-white transition-colors">
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border-2 border-slate-900">
                      <Mail className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Email
                      </p>
                      <p className="text-base font-bold text-slate-900 break-all">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info Grid Section for Country, State, City (No Pincode) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border-2 border-slate-900 rounded-lg p-3 flex flex-col items-center justify-center text-center gap-1 hover:bg-white transition-colors">
                    <Globe className="h-5 w-5 text-slate-500" />
                    <p
                      className={`text-xs font-bold truncate max-w-full ${
                        userData?.country
                          ? "text-slate-900"
                          : "text-slate-400 italic font-normal"
                      }`}
                    >
                      {userData?.country || "Not set"}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      Country
                    </p>
                  </div>

                  <div className="bg-slate-50 border-2 border-slate-900 rounded-lg p-3 flex flex-col items-center justify-center text-center gap-1 hover:bg-white transition-colors">
                    <MapIcon className="h-5 w-5 text-slate-500" />
                    <p
                      className={`text-xs font-bold truncate max-w-full ${
                        userData?.state
                          ? "text-slate-900"
                          : "text-slate-400 italic font-normal"
                      }`}
                    >
                      {userData?.state || "Not set"}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      State
                    </p>
                  </div>

                  <div className="bg-slate-50 border-2 border-slate-900 rounded-lg p-3 flex flex-col items-center justify-center text-center gap-1 hover:bg-white transition-colors">
                    <MapPinned className="h-5 w-5 text-slate-500" />
                    <p
                      className={`text-xs font-bold truncate max-w-full ${
                        userData?.city
                          ? "text-slate-900"
                          : "text-slate-400 italic font-normal"
                      }`}
                    >
                      {userData?.city || "Not set"}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      City
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-full px-2 pt-2 space-y-3">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold bg-sky-900 text-white hover:bg-sky-800 border-2 border-slate-900 hover:shadow-md active:shadow-sm transition-all whitespace-nowrap"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>
            )}
            {!isEditing && <SignOutButton />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
