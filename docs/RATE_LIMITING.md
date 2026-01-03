# API Rate Limiting

FixCI implements rate limiting to protect against abuse and ensure fair usage for all users.

## Rate Limits

### Authentication Endpoints

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| `/auth/login` | 3 requests | 15 minutes | Per email address |
| `/api/complete-setup` | 5 requests | 10 minutes | Per IP address |
| `/auth/verify` | 10 requests | 5 minutes | Per IP address |

### API Endpoints

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| `/api/subscription` | 60 requests | 1 minute | Per authenticated user |
| `/api/usage/history` | 30 requests | 1 minute | Per authenticated user |
| `/api/me` | 60 requests | 1 minute | Per authenticated user |
| `/api/analysis/status` | 100 requests | 1 minute | Per authenticated user |

### Admin Endpoints

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| `/admin/*` | 120 requests | 1 minute | Per API key |

### Webhook Endpoints

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| GitHub webhooks | No limit* | - | Validated by signature |
| Stripe webhooks | No limit* | - | Validated by signature |

*Webhook endpoints rely on signature verification for security instead of rate limiting.

## Rate Limit Headers

API responses include rate limit information in headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1609459200
```

## Rate Limit Response

When rate limited, you'll receive a `429 Too Many Requests` response:

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 15 minutes",
  "resetAt": "2026-01-03T12:15:00Z"
}
```

## Implementation Details

### Storage

Rate limits are stored in:
- **Cloudflare KV** - For fast distributed rate limiting
- **Key Format**: `ratelimit:{scope}:{identifier}`
- **TTL**: Automatically expires based on window duration

### Algorithm

FixCI uses the **sliding window** algorithm:

1. Each request increments a counter
2. Counter expires after the time window
3. If counter > limit, request is rejected
4. Provides smooth rate limiting without burst spikes

### Code Example

```javascript
import { checkRateLimit, rateLimitResponse } from './ratelimit.js';

// In your endpoint handler
const rateLimit = await checkRateLimit(`login:${email}`, 3, 900, env);
if (!rateLimit.allowed) {
  return rateLimitResponse(rateLimit.resetAt);
}

// Process request...
```

## Bypassing Rate Limits

### For Testing

Rate limits can be bypassed in development:

```javascript
// In wrangler.toml
[vars]
DISABLE_RATE_LIMITING = "true"  # Development only!
```

**WARNING**: Never disable rate limiting in production.

### For Enterprise Users

Enterprise tier customers can request higher rate limits:
- Contact: support@fixci.dev
- Custom limits available
- Requires valid enterprise subscription

## Best Practices

### For API Consumers

1. **Respect Rate Limits**: Check headers and back off when approaching limits
2. **Implement Exponential Backoff**: When rate limited, wait before retrying
3. **Cache Responses**: Reduce API calls by caching data locally
4. **Use Webhooks**: For real-time updates instead of polling

### Example: Exponential Backoff

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    // Rate limited - exponential backoff
    const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('Max retries exceeded');
}
```

## Monitoring Rate Limits

### For Administrators

Monitor rate limit hits via Cloudflare Analytics:

```bash
# View rate limit events
wrangler tail --format=pretty | grep "rate_limit"

# Check KV namespace for active limits
wrangler kv:key list --namespace-id=<SESSIONS_ID> --prefix="ratelimit:"
```

### Metrics Tracked

- Total rate limit hits per endpoint
- Most rate-limited IP addresses
- Most rate-limited users
- Average requests per user

## Adjusting Rate Limits

To modify rate limits:

1. Edit `packages/github-app/src/ratelimit.js`
2. Update constants:
   ```javascript
   const RATE_LIMITS = {
     login: { limit: 3, window: 900 },  // 3 per 15 min
     api: { limit: 60, window: 60 },     // 60 per minute
     // ...
   };
   ```
3. Deploy changes
4. Update this documentation

## Security Considerations

Rate limiting is part of FixCI's defense-in-depth strategy:

- ✅ Prevents brute force attacks on login
- ✅ Protects against API abuse
- ✅ Reduces DDoS impact
- ✅ Ensures fair resource allocation
- ✅ Complements authentication and authorization

## Support

If you're experiencing rate limit issues:

1. Check your request frequency
2. Implement proper backoff strategies
3. Cache API responses
4. Contact support if limits are too restrictive

**Contact**: support@fixci.dev
