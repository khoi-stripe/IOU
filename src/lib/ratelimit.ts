import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Upstash is configured
const isUpstashConfigured =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Create rate limiter only if Upstash is configured
const ratelimit = isUpstashConfigured
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 minutes
      analytics: true,
      prefix: "iou:ratelimit",
    })
  : null;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for authentication attempts
 * Uses phone number as the identifier to prevent brute-force attacks
 *
 * If Upstash is not configured, always allows (for development)
 */
export async function checkAuthRateLimit(
  phone: string
): Promise<RateLimitResult> {
  if (!ratelimit) {
    // Development mode - no rate limiting
    console.warn(
      "[RATELIMIT] Upstash not configured - rate limiting disabled"
    );
    return {
      success: true,
      remaining: 999,
      reset: Date.now(),
    };
  }

  const result = await ratelimit.limit(`auth:${phone}`);

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
  if (!ratelimit) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now(),
    };
  }

  // More generous limit for general API usage
  const generalLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
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

