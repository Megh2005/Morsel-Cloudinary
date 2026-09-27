import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { transporter } from "@/lib/mailer";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists with this email" },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create a hash of the OTP and email with expiration
    // Format: email.otp.expiresAt
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    const data = `${email}.${otp}.${expiresAt}`;
    const secret = process.env.NEXTAUTH_SECRET || "fallback_secret_key";

    // Generate HMAC signature
    const hash = crypto.createHmac("sha256", secret).update(data).digest("hex");

    // Create token to send to client: hash.expiresAt
    const token = `${hash}.${expiresAt}`;

    // Send OTP via email
    const mailOptions = {
      from: `"Morsel Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important; }
            body, table, td, th, p, a, div, span, h1, h2, h3, h4, h5, h6, strong, b, em {
              font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;
            }
          </style>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">
          <div style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #0f172a; border-radius: 8px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 16px;">
              <h2 style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important; color: #0c4a6e; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Morsel Verification</h2>
            </div>
            <div style="background-color: #f8fafc; padding: 24px; border: 1px dashed #0284c7; border-radius: 6px; text-align: center; margin-bottom: 24px;">
              <p style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important; margin: 0; color: #334155; font-size: 14px; letter-spacing: 0.5px;">Your verification code is:</p>
              <h1 style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important; color: #0284c7; font-size: 38px; font-weight: 800; letter-spacing: 8px; margin: 14px 0;">${otp}</h1>
              <p style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important; margin: 0; color: #64748b; font-size: 13px;">This code will expire in 10 minutes.</p>
            </div>
            <p style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important; color: #64748b; font-size: 13px; text-align: center; margin: 0;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "OTP sent successfully", hash: token },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { message: error.message || "Failed to send OTP" },
      { status: 500 }
    );
  }
}
