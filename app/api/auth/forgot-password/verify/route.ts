import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { transporter } from "@/lib/mailer";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const { name, email } = await req.json();

        if (!name || !email) {
            return NextResponse.json(
                { message: "Name and email are required" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Check if user exists with matching name and email
        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json(
                { message: "No account found with this email" },
                { status: 404 }
            );
        }

        // Case-insensitive name check
        if (user.name.toLowerCase().trim() !== name.toLowerCase().trim()) {
            return NextResponse.json(
                { message: "Name does not match our records for this email" },
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
            subject: "Reset Your Password - Verification Code",
            html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important; }
    body, table, td, th, p, a, div, span, h1, h2, h3, h4, h5, h6, strong, b, em { font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important; }
    body { background-color: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 2px solid #0f172a; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background: #0c4a6e; padding: 32px 20px; text-align: center; border-bottom: 2px solid #0f172a; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .content { padding: 36px 30px; color: #0f172a; text-align: center; }
    .greeting { font-size: 16px; color: #0f172a; margin-bottom: 20px; font-weight: 700; }
    .otp-box { background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 8px; padding: 24px; margin: 28px 0; }
    .otp-code { color: #0369a1; font-size: 38px; font-weight: 800; letter-spacing: 8px; margin: 0; }
    .instruction { color: #475569; font-size: 13px; line-height: 1.6; margin-bottom: 16px; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { color: #64748b; font-size: 12px; margin: 0; }
    .highlight { color: #0c4a6e; font-weight: 700; }
  </style>
</head>
<body style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">
  <div class="container" style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">
    <div class="header">
      <h1 style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">Morsel Security</h1>
    </div>
    <div class="content" style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">
      <p class="greeting" style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">Hello, ${name}</p>
      <p class="instruction" style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">We received a request to reset your password. Use the verification code below to proceed with your request.</p>
      
      <div class="otp-box">
        <h2 class="otp-code" style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">${otp}</h2>
      </div>
      
      <p class="instruction" style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">This code is valid for <strong style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">10 minutes</strong>. If you did not request this password reset, please ignore this email and your account will remain secure.</p>
    </div>
    <div class="footer" style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">
      <p style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">&copy; ${new Date().getFullYear()} <span class="highlight" style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">Morsel</span>. All rights reserved.</p>
    </div>
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
        console.error("Error asking for reset:", error);
        return NextResponse.json(
            { message: error.message || "Failed to process request" },
            { status: 500 }
        );
    }
}
