/**
 * Rate Limiting Service
 * Prevents abuse and DoS attacks using Cloudflare KV for distributed rate limiting
 */

/**
 * Extract client IP address from request headers
 * Cloudflare provides the real client IP via CF-Connecting-IP header
 * @param {Request} request - The incoming HTTP request
 * @returns {string} Client IP address
 */
export function getClientIP(request) {
  // Cloudflare provides real client IP via CF-Connecting-IP header
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) {
    return cfIP;
  }

  // Fallback to X-Forwarded-For (proxy header)
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }

  // Fallback to X-Real-IP
  const xRealIP = request.headers.get('X-Real-IP');
  if (xRealIP) {
    return xRealIP;
  }

  // Last resort: return unknown (shouldn't happen with Cloudflare)
  return 'unknown';
}

/**
 * Check if a request should be rate limited
 * Uses sliding window algorithm with Cloudflare KV
 *
 * @param {string} key - Unique identifier for rate limit bucket (e.g., "login:user@example.com")
 * @param {number} maxRequests - Maximum number of requests allowed in the time window
 * @param {number} windowSeconds - Time window in seconds
 * @param {object} env - Environment bindings (must include SESSIONS KV namespace)
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
 */
export async function checkRateLimit(key, maxRequests, windowSeconds, env) {
  // Sanitize key to prevent abuse
  const sanitizedKey = `ratelimit:${key.replace(/[^a-zA-Z0-9:@._-]/g, '')}`;

  try {
    // Get current rate limit data from KV
    const data = await env.SESSIONS.get(sanitizedKey);

    const now = Date.now();
    let requests = [];

    if (data) {
      const parsed = JSON.parse(data);
      requests = parsed.requests || [];

      // Filter out requests outside the current window
      const windowStart = now - (windowSeconds * 1000);
      requests = requests.filter(timestamp => timestamp > windowStart);
    }

    // Check if limit exceeded
    if (requests.length >= maxRequests) {
      // Find when the oldest request will expire
      const oldestRequest = requests[0];
      const resetAt = oldestRequest + (windowSeconds * 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.floor(resetAt / 1000), // Unix timestamp in seconds
        retryAfter: Math.ceil((resetAt - now) / 1000) // Seconds until retry
      };
    }

    // Add current request timestamp
    requests.push(now);

    // Store updated rate limit data in KV
    // TTL set to window duration to auto-cleanup
    await env.SESSIONS.put(
      sanitizedKey,
      JSON.stringify({ requests }),
      { expirationTtl: windowSeconds }
    );

    return {
      allowed: true,
      remaining: maxRequests - requests.length,
      resetAt: Math.floor((now + (windowSeconds * 1000)) / 1000)
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);

    // On error, allow the request (fail open)
    // Better to allow occasional abuse than block legitimate users
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Math.floor((Date.now() + (windowSeconds * 1000)) / 1000),
      error: error.message
    };
  }
}

/**
 * Generate a 429 Too Many Requests response
 * @param {number} resetAt - Unix timestamp when rate limit resets
 * @param {number} retryAfter - Seconds until retry (optional, calculated from resetAt if not provided)
 * @returns {Response} HTTP 429 response with rate limit headers
 */
export function rateLimitResponse(resetAt, retryAfter = null) {
  const now = Math.floor(Date.now() / 1000);
  const retryAfterSeconds = retryAfter || Math.max(1, resetAt - now);

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
      retryAfter: retryAfterSeconds,
      resetAt: resetAt
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfterSeconds.toString(),
        'X-RateLimit-Reset': resetAt.toString(),
        'X-RateLimit-Remaining': '0',
        'Access-Control-Allow-Origin': '*',
      }
    }
  );
}

/**
 * Common rate limit presets for different endpoint types
 */
export const RATE_LIMITS = {
  // Authentication endpoints
  LOGIN: { maxRequests: 3, windowSeconds: 900 },          // 3 per 15 minutes
  VERIFY: { maxRequests: 10, windowSeconds: 900 },        // 10 per 15 minutes
  AUTH_GENERAL: { maxRequests: 20, windowSeconds: 300 },  // 20 per 5 minutes

  // API endpoints
  API_READ: { maxRequests: 100, windowSeconds: 60 },      // 100 per minute
  API_WRITE: { maxRequests: 30, windowSeconds: 60 },      // 30 per minute
  API_ADMIN: { maxRequests: 60, windowSeconds: 60 },      // 60 per minute

  // Webhook endpoints
  WEBHOOK: { maxRequests: 500, windowSeconds: 60 },       // 500 per minute (GitHub bursts)

  // Public endpoints
  PUBLIC: { maxRequests: 50, windowSeconds: 60 },         // 50 per minute
};

/**
 * Advanced: Check multiple rate limit buckets (global + per-user)
 * Useful for protecting against both targeted and distributed attacks
 *
 * @param {Array<{key: string, maxRequests: number, windowSeconds: number}>} limits
 * @param {object} env - Environment bindings
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export async function checkMultipleRateLimits(limits, env) {
  for (const limit of limits) {
    const result = await checkRateLimit(
      limit.key,
      limit.maxRequests,
      limit.windowSeconds,
      env
    );

    if (!result.allowed) {
      return {
        allowed: false,
        ...result,
        reason: `Rate limit exceeded for ${limit.key}`
      };
    }
  }

  return { allowed: true };
}
