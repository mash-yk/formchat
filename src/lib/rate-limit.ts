/**
 * In-memory sliding window rate limiter for submissions.
 * Prevents spam bots and rapid-fire automated submissions from overloading the API.
 */

type ClientRecord = {
  timestamps: number[];
};

const store = new Map<string, ClientRecord>();

// Clean up stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((t) => t > cutoff);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (typeof cleanupTimer === "object" && typeof cleanupTimer?.unref === "function") {
    cleanupTimer.unref();
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
};

/**
 * Checks whether an IP or client identifier has exceeded rate limits.
 * Default: 15 requests per 60-second window.
 */
export function checkRateLimit(
  identifier: string,
  limit = 15,
  windowMs = 60 * 1000,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = store.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    store.set(identifier, record);
  }

  // Filter out timestamps outside the active sliding window
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= limit) {
    const oldestInWindow = record.timestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    resetSeconds: Math.ceil(windowMs / 1000),
  };
}

/**
 * Checks if a submission shows signs of automated spam bot activity.
 * Returns true if it is a bot (honeypot filled or filled in < 1.2 seconds).
 */
export function isSpamSubmission(honeypot?: string, startedAt?: number): boolean {
  // Honeypot field filled
  if (honeypot && honeypot.trim().length > 0) {
    return true;
  }

  // Submitted impossibly fast (under 1200ms)
  if (startedAt && typeof startedAt === "number") {
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs > 0 && elapsedMs < 1200) {
      return true;
    }
  }

  return false;
}
