// src/lib/names.ts
/** Heuristic: turn ids/slugs/emails into something friendly for display */
export function displayName(raw: string) {
  if (!raw) return "User";

  // e.g. user_abc123 → "User abc123"
  if (/^user_[a-z0-9]+$/i.test(raw)) {
    return raw.replace(/^user_/i, "User ");
  }

  // e.g. john-doe → "John Doe"
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(raw)) {
    return raw
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  }

  // e.g. email → take part before @
  if (raw.includes("@")) {
    const base = raw.split("@")[0];
    return displayName(base);
  }

  return raw;
}
