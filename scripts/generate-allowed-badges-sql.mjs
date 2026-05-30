import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const members = JSON.parse(
  readFileSync(join(root, "client/public/data/members.json"), "utf8")
);
const speakers = JSON.parse(
  readFileSync(join(root, "client/public/data/speakers.json"), "utf8")
);

const ids = [
  ...new Set([
    ...members.map((member: { id: string }) => member.id),
    ...speakers.map((speaker: { id: string }) => speaker.id),
  ]),
].sort();

const values = ids
  .map((id) => `  ('${id.replace(/'/g, "''")}')`)
  .join(",\n");

const sql = [
  "-- Auto-generated allowed badge IDs",
  "insert into public.allowed_badges (badge_id) values",
  values,
  "on conflict (badge_id) do nothing;",
  "",
].join("\n");

writeFileSync(join(root, "supabase/seed/allowed_badges.sql"), sql);
console.log(`Wrote ${ids.length} badge IDs to supabase/seed/allowed_badges.sql`);
