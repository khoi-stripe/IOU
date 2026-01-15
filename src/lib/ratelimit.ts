import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Upstash is configured
const isUpstashConfigured =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Create Redis client once
const redis = isUpstashConfigured ? Redis.fromEnv() : null;

// Rate limiter for phone checks (more generous - prevents enumeration)
const phoneCheckLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "15 m"), // 10 checks per 15 minutes
      analytics: true,
      prefix: "iou:phone-check",
    })
  : null;

// Rate limiter for PIN attempts (strict - prevents brute force)
const pinAttemptLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 PIN attempts per 15 minutes
      analytics: true,
      prefix: "iou:pin-attempt",
    })
  : null;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for phone number checks (enumeration protection)
 * More generous than PIN attempts
 */
export async function checkPhoneCheckRateLimit(
  phone: string
): Promise<RateLimitResult> {
  if (!phoneCheckLimiter) {
    console.warn("[RATELIMIT] Upstash not configured - rate limiting disabled");
    return {
      success: true,
      remaining: 999,
      reset: Date.now(),
    };
  }

  const result = await phoneCheckLimiter.limit(`phone:${phone}`);

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check rate limit for PIN/authentication attempts (brute-force protection)
 * Strict limit since PINs are only 6 digits
 */
export async function checkAuthRateLimit(
  phone: string
): Promise<RateLimitResult> {
  if (!pinAttemptLimiter) {
    console.warn("[RATELIMIT] Upstash not configured - rate limiting disabled");
    return {
      success: true,
      remaining: 999,
      reset: Date.now(),
    };
  }

  const result = await pinAttemptLimiter.limit(`auth:${phone}`);

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check rate limit for general API requests by user ID
 */
export async function checkApiRateLimit(
  userId: string
): Promise<RateLimitResult> {
  if (!redis) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now(),
    };
  }

  const generalLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
    prefix: "iou:api",
  });

  const result = await generalLimiter.limit(`api:${userId}`);

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
