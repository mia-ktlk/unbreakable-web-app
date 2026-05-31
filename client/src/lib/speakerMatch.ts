import type { Speaker } from "../types";

/** Schedule display names that differ from speakers.json canonical names. */
const SCHEDULE_NAME_ALIASES: Record<string, string> = {
  "pete shaw": "peter shaw",
  "erin richer": "erin richter",
  "abrie jane": "abrie sellers",
};

const NAME_PREFIX_RE = /^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\s+/i;
const SUFFIX_AFTER_COMMA_RE = /,\s*.+$/;

/** Normalize a speaker or schedule name for reliable equality matching. */
export function normalizeSpeakerName(name: string): string {
  let normalized = name.trim().toLowerCase();
  normalized = normalized.replace(NAME_PREFIX_RE, "");
  normalized = normalized.replace(SUFFIX_AFTER_COMMA_RE, "");
  normalized = normalized.replace(/[.,]/g, " ");
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

function scheduleLookupKey(scheduleName: string): string {
  const normalized = normalizeSpeakerName(scheduleName);
  return SCHEDULE_NAME_ALIASES[normalized] ?? normalized;
}

/** Match a schedule speaker label to a speakers.json record. */
export function findSpeakerByScheduleName(
  speakers: Speaker[],
  scheduleName: string
): Speaker | undefined {
  const exact = speakers.find(
    (s) => s.name.toLowerCase() === scheduleName.trim().toLowerCase()
  );
  if (exact) return exact;

  const key = scheduleLookupKey(scheduleName);
  return speakers.find((s) => normalizeSpeakerName(s.name) === key);
}

export function speakerHasPhoto(speaker: Pick<Speaker, "image">): boolean {
  return typeof speaker.image === "string" && speaker.image.trim().length > 0;
}
