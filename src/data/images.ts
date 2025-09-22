// src/data/images.ts
export const imagePools = {
  // You said you will add these now:
  brake: Array.from({ length: 10 }, (_, i) => `/images/brake${i + 1}.jpg`),
  filter: Array.from({ length: 10 }, (_, i) => `/images/filter${i + 1}.jpg`),

  // Add these files when you can; code already prepared to use them:
  disc: Array.from({ length: 10 }, (_, i) => `/images/disc${i + 1}.jpg`),
  caliper: Array.from({ length: 10 }, (_, i) => `/images/caliper${i + 1}.jpg`),
  spring: Array.from({ length: 10 }, (_, i) => `/images/spring${i + 1}.jpg`),
  shock: Array.from({ length: 10 }, (_, i) => `/images/shock${i + 1}.jpg`),
  wheel: Array.from({ length: 10 }, (_, i) => `/images/wheel${i + 1}.jpg`),
  radiator: Array.from({ length: 10 }, (_, i) => `/images/radiator${i + 1}.jpg`),
  intercooler: Array.from({ length: 10 }, (_, i) => `/images/intercooler${i + 1}.jpg`),
  turbo: Array.from({ length: 10 }, (_, i) => `/images/turbo${i + 1}.jpg`),
  exhaust: Array.from({ length: 10 }, (_, i) => `/images/exhaust${i + 1}.jpg`),
  headlight: Array.from({ length: 10 }, (_, i) => `/images/headlight${i + 1}.jpg`),
} as const;

export type ImageKind = keyof typeof imagePools;

// Deterministic pick: cycles the pool, never random.
export function pick(kind: ImageKind, index: number): string {
  const pool = imagePools[kind];
  if (!pool || pool.length === 0) {
    // Fallback safely to brake pool if the requested one isn’t present yet
    return imagePools.brake[index % imagePools.brake.length];
  }
  return pool[index % pool.length];
}
