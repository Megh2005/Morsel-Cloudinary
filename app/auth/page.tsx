"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Camera,
  User,
} from "lucide-react";
import { toast } from "react-toastify";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import BackgroundPattern from "@/components/BackgroundPattern";
import OTPInput from "@/components/OTPInput";
import {
  getAlphabeticalCountries,
  getAlphabeticalStates,
  getAlphabeticalCities,
  CountryOption,
  StateOption,
  CityOption,
} from "@/lib/locations";

export default function AuthPage() {
  const { data: session, status } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [availableStates, setAvailableStates] = useState<StateOption[]>([]);
  const [availableCities, setAvailableCities] = useState<CityOption[]>([]);
  const router = useRouter();

  useEffect(() => {
    setCountries(getAlphabeticalCountries());
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push("/dashboard");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, router]);
  const [formData, setFormData] = useState({
    signinEmail: "",
    signinPassword: "",
    signupName: "",
    signupEmail: "",
    signupPassword: "",
    signupCountry: "",
    signupState: "",
    signupCity: "",
  });

  const [signupStep, setSignupStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [otpHash, setOtpHash] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (formData.signupCountry) {
      setAvailableStates(getAlphabeticalStates(formData.signupCountry));
    } else {
      setAvailableStates([]);
    }
  }, [formData.signupCountry]);

  useEffect(() => {
    if (formData.signupCountry && formData.signupState) {
      setAvailableCities(
        getAlphabeticalCities(formData.signupCountry, formData.signupState)
      );
    } else {
      setAvailableCities([]);
    }
  }, [formData.signupCountry, formData.signupState]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG and PNG images are allowed");
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be under 2MB");
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
      return;
    }

    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Please enter a valid email address");
    }
  };

  const validateEmail = (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return false;
    }
    if (password.length > 14) {
      toast.error("Password must be at most 14 characters long.");
      return false;
    }
    return true;
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setFormData((prev) => ({
      ...prev,
      signupCountry: selected,
      signupState: "",
      signupCity: "",
    }));
  };

  const handleAuth = async (action: "signin" | "signup") => {
    if (loading) return;

    if (action === "signin") {
      if (!validateEmail(formData.signinEmail)) return;
      if (!validatePassword(formData.signinPassword)) return;
    } else {
      if (!formData.signupName) {
        toast.error("Name is required");
        return;
      }
      if (!validateEmail(formData.signupEmail)) return;
      if (!validatePassword(formData.signupPassword)) return;
      if (!formData.signupCountry) {
        toast.error("Please select your country");
        return;
      }
      if (availableStates.length > 0 && !formData.signupState) {
        toast.error("Please select your state");
        return;
      }
      if (!formData.signupCity.trim()) {
        toast.error("Please enter your city");
        return;
      }
    }

    setLoading(true);

    try {
      if (action === "signup") {
        if (signupStep === 1) {
          // Step 1: Send OTP
          const promise = fetch("/api/auth/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: formData.signupEmail }),
          }).then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to send OTP");
            setOtpHash(data.hash); // Store the hash
            return data;
          });

          await toast.promise(promise, {
            pending: "Sending verification code...",
            success: "Verification code sent!",
            error: {
              render({ data }: any) {
                return data?.message || "Something went wrong";
              },
            },
          });

          setSignupStep(2);
        } else {
          // Step 2: Verify and Signup
          if (otp.length !== 6) {
            toast.error("Please enter the complete 6-digit code");
            setLoading(false);
            return;
          }

          const signupProcess = (async () => {
            // 1. Final form submission: Verify OTP and create authentication in database
            const signupRes = await fetch("/api/auth/signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: formData.signupName,
                email: formData.signupEmail,
                password: formData.signupPassword,
                country: formData.signupCountry,
                state: formData.signupState,
                city: formData.signupCity,
                otp,
                hash: otpHash, // Send the hash for verification
              }),
            });

            const signupData = await signupRes.json();
            if (!signupRes.ok) {
              throw new Error(signupData.message || "Signup failed");
            }

            // 2. Only after authentication creation: upload avatar to Cloudinary using /api/upload-image
            if (avatarFile) {
              try {
                const uploadFormData = new FormData();
                uploadFormData.append("file", avatarFile);
                uploadFormData.append("folder", "avatars");

                const uploadRes = await fetch("/api/upload-image", {
                  method: "POST",
                  body: uploadFormData,
                });

                const uploadData = await uploadRes.json();
                if (uploadRes.ok && uploadData.secure_url) {
                  // Update user record with Cloudinary avatar URL
                  await fetch("/api/auth/update-avatar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      userId: signupData.user?._id,
                      email: formData.signupEmail,
                      avatar: uploadData.secure_url,
                    }),
                  });
                }
              } catch (uploadErr) {
                console.error("Cloudinary avatar upload error:", uploadErr);
              }
            }

            return signupData;
          })();

          await toast.promise(signupProcess, {
            pending: "Creating account...",
            success: "Account created successfully!",
            error: {
              render({ data }: any) {
                return data?.message || "Something went wrong";
              },
            },
          });

          window.location.reload();
        }
      } else {
        // Sign In
        const promise = signIn("credentials", {
          redirect: false,
          email: formData.signinEmail,
          password: formData.signinPassword,
        }).then((res) => {
          if (res?.error) throw new Error(res.error);
          return res;
        });

        await toast.promise(promise, {
          pending: "Signing in...",
          success: "Signed in successfully!",
          error: "Invalid credentials",
        });

        router.push("/dashboard");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "authenticated") {
    return (
      <div className="min-h-[calc(100dvh-5rem)] flex items-center justify-center px-4 pt-12 pb-28 sm:py-16">
        <BackgroundPattern />
        <Card className="w-full max-w-md border border-slate-200 shadow-2xl rounded-2xl bg-white overflow-hidden relative">
          {/* Professional Success Header */}
          <div className="h-16 bg-emerald-600 flex items-center justify-center px-6 border-b border-emerald-500">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold  text-lg">
                Access Authorized
              </span>
            </div>
          </div>

          <CardContent className="pt-12 pb-10 px-8 flex flex-col items-center text-center">
            <div className="mb-6 rounded-full bg-emerald-50 p-5 border border-emerald-100 shadow-inner">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>

            <p className="text-slate-500 font-medium mb-8 text-lg px-4">
              You are currently authenticated as{" "}
              <span className="text-sky-900 font-bold">
                {session?.user?.name || "User"}
              </span>
              .
            </p>

            <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-5 mb-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Automatic Redirection
              </p>
              <div className="flex items-baseline justify-center gap-1.5 mb-4">
                <span className="text-4xl font-bold text-sky-900">
                  {countdown}
                </span>
              </div>
              <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-900 transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 20) * 100}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="group w-full rounded-lg px-6 py-3 font-bold bg-sky-900 text-white hover:bg-sky-800 border border-slate-900 shadow-lg hover:shadow-md transition-all flex items-center justify-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-5rem)] flex items-center justify-center px-4 pt-12 pb-28 sm:py-16">
      <BackgroundPattern />
      <Tabs defaultValue="signin" className="w-full max-w-md mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-4 bg-transparent gap-3 sm:gap-4">
          <TabsTrigger
            value="signin"
            className="rounded-lg border-2 border-slate-900 bg-white data-[state=active]:bg-sky-900 data-[state=active]:text-white hover:bg-slate-50 transition-all shadow-sm"
          >
            Sign In
          </TabsTrigger>
          <TabsTrigger
            value="signup"
            className="rounded-lg border-2 border-slate-900 bg-white data-[state=active]:bg-sky-900 data-[state=active]:text-white hover:bg-slate-50 transition-all shadow-sm"
          >
            Sign Up
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <Card className="border-2 border-slate-900 shadow-md rounded-xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-900">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-slate-600">
                Enter your credentials to access your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="signinEmail"
                  className="text-slate-900 font-medium"
                >
                  Email
                </Label>
                <Input
                  id="signinEmail"
                  type="email"
                  placeholder="name@example.com"
                  className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white"
                  value={formData.signinEmail}
                  onChange={handleInputChange}
                  onBlur={handleEmailBlur}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="signinPassword"
                  className="text-slate-900 font-medium"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="signinPassword"
                    type={showPassword ? "text" : "password"}
                    className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white"
                    value={formData.signinPassword}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/auth/forgot-password")}
                  className="text-sm font-medium text-sky-900 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <button
                onClick={() => handleAuth("signin")}
                disabled={loading}
                className="w-full rounded-lg px-4 py-3 font-medium bg-sky-900 text-white hover:bg-sky-800 border-2 border-slate-900 hover:shadow-md transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Sign In
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signup">
          <Card className="border-2 border-slate-900 shadow-md rounded-xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-black text-black">
                Create Account
              </CardTitle>
              <CardDescription className="text-slate-800 capitalize font-semibold">
                Join us to start the journey of saving every morsel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {signupStep === 1 ? (
                <>
                  {/* Avatar Upload (under 2MB, preview in circular frame) */}
                  <div className="flex flex-col items-center justify-center pb-2">
                    <div
                      onClick={() => avatarInputRef.current?.click()}
                      className="group relative w-24 h-24 rounded-full border-2 border-slate-900 overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer shadow-sm hover:shadow-md transition-all"
                    >
                      {avatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-sky-900 transition-colors">
                          <User className="w-10 h-10" />
                        </div>
                      )}

                      {/* Hover overlay with camera icon */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                        <Camera className="w-6 h-6 mb-0.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {avatarPreview ? "Change" : "Upload"}
                        </span>
                      </div>
                    </div>

                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />

                    <div className="mt-2 text-center">
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline mx-auto block mb-0.5"
                        >
                          Remove Avatar
                        </button>
                      )}
                      <p className="text-[11px] text-slate-500 font-medium">
                        Max 2MB (JPG, PNG)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="signupName"
                      className="text-slate-900 font-medium"
                    >
                      Full Name
                    </Label>
                    <Input
                      id="signupName"
                      placeholder="John Doe"
                      className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white"
                      value={formData.signupName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="signupEmail"
                      className="text-slate-900 font-medium"
                    >
                      Email
                    </Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="name@example.com"
                      className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white"
                      value={formData.signupEmail}
                      onChange={handleInputChange}
                      onBlur={handleEmailBlur}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="signupPassword"
                      className="text-slate-900 font-medium"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="signupPassword"
                        type={showPassword ? "text" : "password"}
                        className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white"
                        value={formData.signupPassword}
                        onChange={handleInputChange}
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="signupCountry"
                      className="text-slate-900 font-medium"
                    >
                      Country
                    </Label>
                    <select
                      id="signupCountry"
                      value={formData.signupCountry}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="signupState"
                        className="text-slate-900 font-medium"
                      >
                        State
                      </Label>
                      {availableStates.length > 0 ? (
                        <select
                          id="signupState"
                          value={formData.signupState}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              signupState: e.target.value,
                              signupCity: "",
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
                          id="signupState"
                          placeholder={
                            formData.signupCountry
                              ? "State / Province (optional)"
                              : "Select country first"
                          }
                          value={formData.signupState}
                          disabled={!formData.signupCountry}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              signupState: e.target.value,
                              signupCity: "",
                            }))
                          }
                          className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white font-medium text-slate-900 disabled:bg-slate-50 disabled:border-slate-300 disabled:text-slate-400"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="signupCity"
                        className="text-slate-900 font-medium"
                      >
                        City
                      </Label>
                      {availableCities.length > 0 ? (
                        <select
                          id="signupCity"
                          value={formData.signupCity}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              signupCity: e.target.value,
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
                          id="signupCity"
                          placeholder={
                            formData.signupState
                              ? "Enter City"
                              : "Select state first"
                          }
                          value={formData.signupCity}
                          disabled={!formData.signupState}
                          onChange={handleInputChange}
                          className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white font-medium text-slate-900 disabled:bg-slate-50 disabled:border-slate-300 disabled:text-slate-400"
                        />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-6 flex flex-col items-center justify-center text-center w-full">
                  <div className="flex flex-col items-center justify-center text-center space-y-2 w-full">
                    <div className="rounded-full bg-sky-100 w-12 h-12 flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-6 h-6 text-sky-900" />
                    </div>
                    <div className="space-y-1 w-full flex flex-col items-center justify-center text-center">
                      <h3 className="text-slate-900 font-semibold text-lg text-center w-full">
                        Verify Email
                      </h3>
                      <p className="text-sm text-slate-500 text-center w-full">
                        Enter the 6-digit code sent to{" "}
                        <span className="font-bold text-slate-900">
                          {formData.signupEmail}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="py-2 w-full flex justify-center items-center">
                    <OTPInput length={6} onComplete={(code) => setOtp(code)} />
                  </div>

                  <div className="flex justify-center items-center w-full text-center">
                    <button
                      onClick={() => setSignupStep(1)}
                      className="text-sm text-slate-500 hover:text-sky-900 font-medium underline text-center"
                    >
                      Change Email
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => handleAuth("signup")}
                disabled={loading}
                className="w-full rounded-lg px-4 py-3 font-medium bg-sky-900 text-white hover:bg-sky-800 border-2 border-slate-900 hover:shadow-md transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {signupStep === 1
                  ? "Get Verification Code"
                  : "Verify & Create Account"}
              </button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
