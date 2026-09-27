import { NextResponse } from "next/server";
import { transporter } from "@/lib/mailer";

// Email payload interface with additional options
interface SendMailPayload {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    attachments?: Array<{
        filename: string;
        content?: string;
        path?: string;
    }>;
}

// Validation helper
function validateEmailPayload(body: SendMailPayload): string | null {
    if (!body.to) return "Recipient email(s) required";
    if (!body.subject) return "Email subject required";
    if (!body.html) return "Email content (html) required";

    // Validate email format(s)
    const emails = Array.isArray(body.to) ? body.to : [body.to];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const email of emails) {
        if (!emailRegex.test(email)) {
            return `Invalid email format: ${email}`;
        }
    }

    return null;
}

// Main POST handler
export async function POST(req: Request) {
    const startTime = Date.now();

    try {
        // Parse request body
        const body: SendMailPayload = await req.json();

        // Validate payload
        const validationError = validateEmailPayload(body);
        if (validationError) {
            console.warn("[Email API] Validation failed:", {
                error: validationError,
                timestamp: new Date().toISOString(),
            });

            return NextResponse.json(
                { error: validationError },
                { status: 400 }
            );
        }

        // Prepare email options with strict monospace typography
        const monospaceHtml = `<!DOCTYPE html>
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
<body style="margin: 0; padding: 0; font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">
  <div style="font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;">
    ${body.html}
  </div>
</body>
</html>`;

        const mailOptions = {
            from: `"Morsel Team" <${process.env.SMTP_USER}>`,
            to: body.to,
            subject: body.subject,
            html: monospaceHtml,
            text: body.text || "This email requires HTML support",
            ...(body.cc && { cc: body.cc }),
            ...(body.bcc && { bcc: body.bcc }),
            ...(body.replyTo && { replyTo: body.replyTo }),
            ...(body.attachments && { attachments: body.attachments }),
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        const duration = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            messageId: info.messageId,
            duration: `${duration}ms`,
        });

    } catch (error) {
        const duration = Date.now() - startTime;

        // Detailed error logging
        if (error instanceof SyntaxError) {
            console.error("[Email API] Invalid JSON payload:", {
                error: error.message,
                timestamp: new Date().toISOString(),
            });

            return NextResponse.json(
                { error: "Invalid JSON payload" },
                { status: 400 }
            );
        }

        // SMTP/Network errors
        console.error("[Email API] Email sending failed:", {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
            {
                error: "Email sending failed",
                message: process.env.NODE_ENV === "development"
                    ? (error instanceof Error ? error.message : "Unknown error")
                    : "Please try again later"
            },
            { status: 500 }
        );
    }
}