import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import crypto from "crypto";
import { hashPassword } from "@/lib/services";

export async function POST(req: Request) {
    try {
        const { email, otp, hash, newPassword } = await req.json();

        if (!email || !otp || !hash || !newPassword) {
            return NextResponse.json(
                { message: "All fields are required" },
                { status: 400 }
            );
        }

        // Validate password length (same as frontend/signup)
        if (newPassword.length < 8 || newPassword.length > 14) {
            return NextResponse.json(
                { message: "Password must be between 8 and 14 characters" },
                { status: 400 }
            );
        }

        // Verify OTP hash
        const [hashValue, expiresAt] = hash.split(".");
        const now = Date.now();

        if (now > parseInt(expiresAt)) {
            return NextResponse.json(
                { message: "OTP has expired. Please request a new one." },
                { status: 400 }
            );
        }

        const data = `${email}.${otp}.${expiresAt}`;
        const secret = process.env.NEXTAUTH_SECRET || "fallback_secret_key";
        const calculatedHash = crypto.createHmac("sha256", secret).update(data).digest("hex");

        if (calculatedHash !== hashValue) {
            return NextResponse.json(
                { message: "Invalid OTP" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update user password
        await User.findOneAndUpdate(
            { email },
            { password: hashedPassword },
            { new: true }
        );

        return NextResponse.json(
            { message: "Password reset successfully" },
            { status: 200 }
        );

    } catch (error: any) {
        console.error("Error resetting password:", error);
        return NextResponse.json(
            { message: error.message || "Failed to reset password" },
            { status: 500 }
        );
    }
}
