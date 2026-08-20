import test from "node:test";
import assert from "node:assert/strict";
import { buildContactEmail, validateContactPayload } from "../netlify/functions/_lib/contact-message.mjs";
import { handler } from "../netlify/functions/contact-message.mjs";

test("accepts and trims a valid contact message", () => {
  const result = validateContactPayload({
    subject: "  Chyba v překladu  ",
    message: "  Text se ve hře nezobrazuje správně.  ",
    page: "https://nioczloc.com/"
  });

  assert.equal(result.valid, true);
  assert.equal(result.value.subject, "Chyba v překladu");
  assert.equal(result.value.message, "Text se ve hře nezobrazuje správně.");
});

test("rejects short or missing fields", () => {
  assert.equal(validateContactPayload({ subject: "x", message: "Dostatečně dlouhá zpráva" }).valid, false);
  assert.equal(validateContactPayload({ subject: "Předmět", message: "krátká" }).valid, false);
  assert.equal(validateContactPayload(null).valid, false);
});

test("builds a plain-text email with a verified user", () => {
  const email = buildContactEmail({
    subject: "Chyba\r\nv menu",
    message: "Tlačítko není přeložené.",
    page: "https://nioczloc.com/"
  }, {
    name: "Hráč",
    email: "hrac@example.com"
  }, new Date("2026-08-20T12:00:00.000Z"));

  assert.equal(email.subject, "[NioCZ web] Chyba v menu");
  assert.match(email.text, /Jméno: Hráč/);
  assert.match(email.text, /E-mail: hrac@example\.com/);
  assert.match(email.text, /Tlačítko není přeložené\./);
});

test("the Netlify function sends a valid anonymous message through Resend", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.CONTACT_FROM_EMAIL;
  let request;
  process.env.RESEND_API_KEY = "test-key";
  process.env.CONTACT_FROM_EMAIL = "NioCZ web <kontakt@nioczloc.com>";
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200 };
  };

  try {
    const response = await handler({
      httpMethod: "POST",
      headers: {},
      body: JSON.stringify({
        subject: "Chyba v menu",
        message: "Jedna položka menu není přeložená.",
        page: "https://nioczloc.com/"
      })
    });

    assert.equal(response.statusCode, 200);
    assert.equal(request.url, "https://api.resend.com/emails");
    assert.equal(request.options.method, "POST");
    const sent = JSON.parse(request.options.body);
    assert.deepEqual(sent.to, ["nioczpreklady@gmail.com"]);
    assert.equal(sent.subject, "[NioCZ web] Chyba v menu");
    assert.equal(sent.reply_to, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (originalFrom === undefined) delete process.env.CONTACT_FROM_EMAIL;
    else process.env.CONTACT_FROM_EMAIL = originalFrom;
  }
});

test("the honeypot returns success without contacting the email provider", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; };

  try {
    const response = await handler({
      httpMethod: "POST",
      headers: {},
      body: JSON.stringify({ website: "https://spam.example" })
    });
    assert.equal(response.statusCode, 200);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the Netlify function safely rejects a null payload", async () => {
  const response = await handler({ httpMethod: "POST", headers: {}, body: "null" });
  assert.equal(response.statusCode, 400);
});
