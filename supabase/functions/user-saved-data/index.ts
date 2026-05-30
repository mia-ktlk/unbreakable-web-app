import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FAVORITES = 200;
const MAX_SCANS = 500;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function sanitizeIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, MAX_FAVORITES);
}

function sanitizeScans(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_SCANS);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const body = await req.json();
    const badgeId = String(body.badge_id ?? "").trim();
    const action = String(body.action ?? "get");

    if (!badgeId) {
      return jsonResponse({ error: "badge_id is required" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: allowedBadge, error: allowedError } = await supabase
      .from("allowed_badges")
      .select("badge_id")
      .eq("badge_id", badgeId)
      .maybeSingle();

    if (allowedError) {
      console.error("allowed_badges lookup failed:", allowedError);
      return jsonResponse({ error: "Failed to validate badge" }, 500);
    }

    if (!allowedBadge) {
      return jsonResponse({ error: "Badge not recognized" }, 403);
    }

    if (action === "get") {
      const { data, error } = await supabase
        .from("user_saved_data")
        .select(
          "badge_id, favorite_speakers, favorite_sessions, favorite_sponsors, favorite_exhibitors, scans, updated_at"
        )
        .eq("badge_id", badgeId)
        .maybeSingle();

      if (error) {
        console.error("user_saved_data fetch failed:", error);
        return jsonResponse({ error: "Failed to load saved data" }, 500);
      }

      return jsonResponse({
        data: data ?? {
          badge_id: badgeId,
          favorite_speakers: [],
          favorite_sessions: [],
          favorite_sponsors: [],
          favorite_exhibitors: [],
          scans: [],
        },
      });
    }

    if (action === "save") {
      const payload = {
        badge_id: badgeId,
        favorite_speakers: sanitizeIdList(body.favorite_speakers),
        favorite_sessions: sanitizeIdList(body.favorite_sessions),
        favorite_sponsors: sanitizeIdList(body.favorite_sponsors),
        favorite_exhibitors: sanitizeIdList(body.favorite_exhibitors),
        scans: sanitizeScans(body.scans),
      };

      const { data, error } = await supabase
        .from("user_saved_data")
        .upsert(payload, { onConflict: "badge_id" })
        .select(
          "badge_id, favorite_speakers, favorite_sessions, favorite_sponsors, favorite_exhibitors, scans, updated_at"
        )
        .single();

      if (error) {
        console.error("user_saved_data upsert failed:", error);
        return jsonResponse({ error: "Failed to save data" }, 500);
      }

      return jsonResponse({ data });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("user-saved-data error:", error);
    return jsonResponse({ error: "Invalid request" }, 400);
  }
});
