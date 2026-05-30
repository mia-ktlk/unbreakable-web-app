function getSupabaseKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
}

export function isPublishableSupabaseKey(key = getSupabaseKey()): boolean {
  return key.startsWith("sb_publishable_");
}

export function getSupabaseFunctionHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  const key = getSupabaseKey();
  const headers: Record<string, string> = {
    apikey: key,
    ...extra,
  };

  // Legacy anon keys are JWTs and must be sent on Authorization for verify_jwt.
  if (key && !isPublishableSupabaseKey(key)) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

export function getSupabaseFunctionUrl(path: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;
}

export function getSupabaseFunctionErrorMessage(
  result: Record<string, unknown>,
  fallback: string
): string {
  if (typeof result.error === "string" && result.error) {
    return result.error;
  }

  if (typeof result.message === "string" && result.message) {
    if (result.code === "UNAUTHORIZED_INVALID_JWT_FORMAT") {
      return "Profile service auth failed. Redeploy edge functions with verify_jwt disabled.";
    }
    return result.message;
  }

  return fallback;
}
