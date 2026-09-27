"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import BackgroundPattern from "@/components/BackgroundPattern";
import OTPInput from "@/components/OTPInput";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  User as UserIcon,
  Lock,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [hash, setHash] = useState(""); // Store hash from backend

  // Handlers
  const handleVerify = async () => {
    if (!name || !email) {
      toast.error("Please enter both name and email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setHash(data.hash);
      toast.success("Verification code sent to your email");
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 14) {
      toast.error("Password must be 8-14 characters long");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, hash, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success("Password reset successfully! Can login now.");
      router.push("/auth");
    } catch (error: any) {
      toast.error(error.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <BackgroundPattern />

      <Card className="w-full max-w-[400px] border-2 border-slate-900 shadow-md rounded-xl bg-white/95 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center pt-10">
          <CardTitle className="text-2xl font-bold text-slate-900">
            {step === 1 ? "Forgot Password" : "Reset Password"}
          </CardTitle>
          <CardDescription className="text-slate-600">
            {step === 1
              ? "Enter your details to verify your identity"
              : "Enter the code sent to your email and set a new password"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label className="text-slate-900 font-medium flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> Name
                </Label>
                <Input
                  placeholder="Enter your full name"
                  className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-900 font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email
                </Label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full rounded-lg px-4 py-3 font-medium bg-sky-900 text-white hover:bg-sky-800 border-2 border-slate-900 hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify & Send Code"}
              </button>
            </>
          ) : (
            <>
              {/* Step 2: OTP & New Password */}
              <div className="text-center space-y-2">
                <div className="rounded-full bg-sky-100 w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-6 h-6 text-sky-900" />
                </div>
                <p className="text-sm text-slate-500">
                  Code sent to{" "}
                  <span className="font-bold text-slate-900">{email}</span>
                </p>
              </div>

              <div className="flex justify-center py-2">
                <OTPInput length={6} onComplete={(code) => setOtp(code)} />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-900 font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" /> New Password
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    className="border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-sky-900 rounded-lg bg-white"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleReset}
                disabled={loading}
                className="w-full rounded-lg px-4 py-3 font-medium bg-emerald-600 text-white hover:bg-emerald-700 border-2 border-slate-900 hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <div className="text-center">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-slate-500 underline hover:text-slate-900"
                >
                  Change Email/Name
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
