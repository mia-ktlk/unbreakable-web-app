/** Case-insensitive match against any provided field; missing values are treated as empty. */
export function matchesSearchQuery(
  query: string,
  ...fields: (string | null | undefined)[]
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return fields.some((field) =>
    (field ?? "").toLowerCase().includes(normalized)
  );
}
