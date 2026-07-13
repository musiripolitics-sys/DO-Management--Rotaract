/* ────────────────────────────────────────────────────────────────
 * Minimal in-memory rate limiter (fixed window per key).
 *
 * Scope: one server instance. On serverless this resets per
 * instance, so it's a speed bump against brute force / spam, not a
 * hard quota — which is exactly what auth + registration need.
 * ────────────────────────────────────────────────────────────── */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** True if `key` has exceeded `limit` hits within `windowMs`. */
export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 5_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  bucket.count += 1
  return bucket.count > limit
}

/** Best-effort client IP from proxy headers (Netlify/Vercel set these). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
