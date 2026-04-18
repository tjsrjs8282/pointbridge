/** Preset increments for the point charge UI (+ buttons). Max +100,000P per product spec. */
export const POINT_CHARGE_INCREMENTS = [1000, 3000, 5000, 10000, 50000, 100000]

export function parseNonNegativeInt(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  const n = digits ? Math.round(Number(digits)) : 0
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}
