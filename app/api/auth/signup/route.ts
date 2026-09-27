import { NextResponse } from "next/server";
import { validateEmail, validatePassword } from "@/lib/validations";
import { createUser, getUserByEmail, hashPassword } from "@/lib/services";
import { connectToDatabase } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const { name, email, password, otp, hash, avatar, country, state, city } = await req.json();

        if (!name || !email || !password || !otp || !hash) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        if (otp.length !== 6) {
            return NextResponse.json(
                { message: "Invalid OTP. 6-digit code required" },
                { status: 400 }
            );
        }

        const emailError = validateEmail(email);
        if (emailError) {
            return NextResponse.json({ message: emailError }, { status: 400 });
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            return NextResponse.json({ message: passwordError }, { status: 400 });
        }

        // Ensure DB connection (service handles it, but robust practice)
        await connectToDatabase();

        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return NextResponse.json(
                { message: "User already exists" },
                { status: 400 }
            );
        }

        // Verify OTP Hash
        // Expected hash format: signature.expiresAt
        const [signature, expiresAt] = hash.split(".");

        // Check expiration
        if (Date.now() > parseInt(expiresAt)) {
            return NextResponse.json(
                { message: "OTP has expired" },
                { status: 400 }
            );
        }

        // Verify signature
        const secret = process.env.NEXTAUTH_SECRET || "fallback_secret_key";
        const data = `${email}.${otp}.${expiresAt}`;
        const computedSignature = crypto.createHmac("sha256", secret).update(data).digest("hex");

        if (computedSignature !== signature) {
            return NextResponse.json(
                { message: "Invalid OTP" },
                { status: 400 }
            );
        }

        const hashedPassword = await hashPassword(password);

        const newUser = await createUser({
            name,
            email,
            password: hashedPassword,
            avatar: avatar || `https://robohash.org/${email}`,
            country: country || undefined,
            state: state || undefined,
            city: city || undefined,
        });

        return NextResponse.json(
            { message: "User created successfully", user: newUser },
            { status: 201 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
