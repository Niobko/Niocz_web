import { randomUUID } from "node:crypto";
import { buildContactEmail, validateContactPayload } from "./_lib/contact-message.mjs";

const CONTACT_TO_EMAIL = "nioczpreklady@gmail.com";
const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

const jsonResponse = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: { ...jsonHeaders, ...extraHeaders },
  body: JSON.stringify(body)
});

const getVerifiedUser = async headers => {
  const authorization = headers?.authorization || headers?.Authorization;
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: supabaseAnonKey },
      signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) return null;
    const user = await response.json();
    return {
      email: user.email,
      name: user.user_metadata?.display_name || user.user_metadata?.name || null
    };
  } catch (error) {
    console.warn("Unable to verify the optional Supabase user", error);
    return null;
  }
};

export const handler = async event => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Tato metoda není povolena." }, { allow: "POST" });
  }

  const contentLength = event.headers?.["content-length"] || event.headers?.["Content-Length"];
  if (Number(contentLength || 0) > 20000) {
    return jsonResponse(413, { error: "Zpráva je příliš dlouhá." });
  }

  let payload;
  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "";
    if (Buffer.byteLength(rawBody, "utf8") > 20000) {
      return jsonResponse(413, { error: "Zpráva je příliš dlouhá." });
    }
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "Neplatný obsah zprávy." });
  }

  // Bots commonly fill this field; returning success prevents useful feedback to them.
  if (typeof payload?.website === "string" && payload.website.trim()) {
    return jsonResponse(200, { ok: true });
  }

  const validation = validateContactPayload(payload);
  if (!validation.valid) return jsonResponse(400, { error: validation.error });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL || CONTACT_TO_EMAIL;
  if (!apiKey || !from) {
    console.error("Contact email is not configured: RESEND_API_KEY or CONTACT_FROM_EMAIL is missing");
    return jsonResponse(503, { error: "Odesílání zpráv zatím není nastavené. Zkuste to prosím později." });
  }

  const user = await getVerifiedUser(event.headers);
  const email = buildContactEmail(validation.value, user);
  const providerPayload = {
    from,
    to: [to],
    subject: email.subject,
    text: email.text
  };
  if (user?.email) providerPayload.reply_to = user.email;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID()
      },
      body: JSON.stringify(providerPayload),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.error("Resend rejected the contact email", response.status, await response.text());
      return jsonResponse(502, { error: "Zprávu se nepodařilo odeslat. Zkuste to prosím později." });
    }

    return jsonResponse(200, { ok: true });
  } catch (error) {
    console.error("Unable to send contact email", error);
    return jsonResponse(502, { error: "Zprávu se nepodařilo odeslat. Zkuste to prosím později." });
  }
};
