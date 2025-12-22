export function formatResponseTime(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return "New seller";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours}h avg`;
}

export function formatJoined(createdAt?: string | null): string {
  if (!createdAt) return "Joined recently";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Joined recently";
  return `Joined ${date.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
}
