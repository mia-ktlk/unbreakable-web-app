import { Member, ScanRecord } from "../types";

/** Escape special characters per RFC 2426 (vCard 3.0). */
export function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Split a display name into family/given for the structured N: field. */
export function parseStructuredName(fullName: string): { family: string; given: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { family: "Attendee", given: "" };

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { family: parts[0], given: "" };

  return {
    family: parts[parts.length - 1],
    given: parts.slice(0, -1).join(" "),
  };
}

export function buildVCard(person: Partial<Member> | Partial<ScanRecord>): string {
  const cleanName = person.name?.trim() || "Attendee";
  const { family, given } = parseStructuredName(cleanName);

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCardValue(family)};${escapeVCardValue(given)};;;`,
    `FN:${escapeVCardValue(cleanName)}`,
    person.company?.trim() ? `ORG:${escapeVCardValue(person.company.trim())}` : "",
    person.role?.trim() ? `TITLE:${escapeVCardValue(person.role.trim())}` : "",
    person.email ? `EMAIL:${escapeVCardValue(person.email)}` : "",
    person.phone ? `TEL:${escapeVCardValue(person.phone)}` : "",
    person.website ? `URL:${escapeVCardValue(person.website)}` : "",
    person.instagram ? `URL;TYPE=Instagram:${escapeVCardValue(person.instagram)}` : "",
    person.facebook ? `URL;TYPE=Facebook:${escapeVCardValue(person.facebook)}` : "",
    person.linkedin ? `URL;TYPE=LinkedIn:${escapeVCardValue(person.linkedin)}` : "",
    "END:VCARD",
  ].filter(Boolean);

  // CRLF line endings — iOS Contacts expects this
  return lines.join("\r\n");
}
