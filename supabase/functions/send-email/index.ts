// Generic SMTP email sender (uses GoDaddy / any SMTP provider via secrets)
// Sends transactional emails to customers, vendors, and website visitors.
import { SMTPClient } from "npm:emailjs@4.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapBranded(subject: string, bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="background:#011d33;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:600;">PlaNext4U</td></tr>
        <tr><td style="padding:28px;font-size:14px;line-height:1.6;color:#1a1a1a;">${bodyHtml}</td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #eaecef;font-size:12px;color:#6b7280;">
          This is an automated message from PlaNext4U. Please do not reply directly to this email.<br/>
          For support, visit <a href="https://planext4u.com" style="color:#0d9488;">planext4u.com</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const host = Deno.env.get("SMTP_HOST");
    const portStr = Deno.env.get("SMTP_PORT");
    const user = Deno.env.get("SMTP_USERNAME");
    const password = Deno.env.get("SMTP_PASSWORD");
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || user;

    if (!host || !portStr || !user || !password || !fromEmail) {
      console.error("Missing SMTP configuration");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: EmailRequest = await req.json();
    if (!body.to || !body.subject || (!body.html && !body.text)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html|text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const port = parseInt(portStr, 10);
    const ssl = port === 465; // SSL/TLS for 465; STARTTLS for 587

    const client = new SMTPClient({
      user,
      password,
      host,
      port,
      ssl,
      tls: !ssl,
      timeout: 20000,
    });

    const html = body.html || `<p>${escapeHtml(body.text || "")}</p>`;
    const branded = wrapBranded(body.subject, html);
    const plainText = body.text || (body.html ? body.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");

    const message: any = {
      from: `PlaNext4U <${fromEmail}>`,
      to: body.to,
      subject: body.subject,
      text: plainText,
      attachment: [{ data: branded, alternative: true }],
    };
    if (body.replyTo) message["reply-to"] = body.replyTo;
    if (body.cc) message.cc = body.cc;
    if (body.bcc) message.bcc = body.bcc;

    const sent = await client.sendAsync(message);
    console.log("Email sent", { to: body.to, subject: body.subject, messageId: (sent as any)?.header?.["message-id"] });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("send-email failed", err?.message || err);
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
