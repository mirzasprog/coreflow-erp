type SupabaseError = {
  message?: string;
  details?: string;
  code?: string;
  hint?: string;
};

export function extractErrorMessage(error: unknown, fallback = "An unexpected error occurred") {
  if (!error) return fallback;

  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (typeof error === "object") {
    const supabaseError = error as SupabaseError;
    if (supabaseError.message) return supabaseError.message;
    if (supabaseError.details) return supabaseError.details;
  }

  return fallback;
}

export function isUniqueConstraintError(error: unknown, constraintName?: string) {
  if (!error || typeof error !== "object") return false;

  const { code, message, details } = error as SupabaseError;
  if (code !== "23505") return false;

  if (!constraintName) return true;
  const haystack = `${message ?? ""} ${details ?? ""}`;
  return haystack.includes(constraintName);
}
