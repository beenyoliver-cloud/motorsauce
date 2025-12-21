"use client";

type TelemetryPayload = Record<string, unknown> | undefined;

export async function logTelemetry(eventType: string, payload?: TelemetryPayload) {
  try {
    if (typeof window === "undefined") return;
    const body = JSON.stringify({
      eventType,
      payload,
      at: Date.now(),
    });
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/telemetry", blob);
      return;
    }
    await fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // swallow telemetry failures
  }
}
