const SUBJECT_MIN_LENGTH = 3;
const SUBJECT_MAX_LENGTH = 120;
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 5000;

const cleanText = value => typeof value === "string" ? value.trim() : "";

export const validateContactPayload = payload => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, error: "Neplatný obsah zprávy." };
  }

  const subject = cleanText(payload.subject);
  const message = cleanText(payload.message);
  const page = cleanText(payload.page).slice(0, 500);

  if (subject.length < SUBJECT_MIN_LENGTH || subject.length > SUBJECT_MAX_LENGTH) {
    return { valid: false, error: `Předmět musí mít ${SUBJECT_MIN_LENGTH} až ${SUBJECT_MAX_LENGTH} znaků.` };
  }

  if (message.length < MESSAGE_MIN_LENGTH || message.length > MESSAGE_MAX_LENGTH) {
    return { valid: false, error: `Zpráva musí mít ${MESSAGE_MIN_LENGTH} až ${MESSAGE_MAX_LENGTH} znaků.` };
  }

  return { valid: true, value: { subject, message, page } };
};

export const buildContactEmail = ({ subject, message, page }, user = null, sentAt = new Date()) => {
  const safeSubject = subject.replace(/[\r\n]+/g, " ");
  const userName = cleanText(user?.name) || "Neuvedeno";
  const userEmail = cleanText(user?.email) || "Neuvedeno";
  const lines = [
    "Nová zpráva z kontaktního formuláře NioCZ",
    "",
    `Předmět: ${safeSubject}`,
    `Stránka: ${page || "Neuvedena"}`,
    `Odesláno: ${sentAt.toISOString()}`,
    "",
    "Přihlášený uživatel:",
    `Jméno: ${userName}`,
    `E-mail: ${userEmail}`,
    "",
    "Zpráva:",
    message
  ];

  return {
    subject: `[NioCZ web] ${safeSubject}`,
    text: lines.join("\n")
  };
};
