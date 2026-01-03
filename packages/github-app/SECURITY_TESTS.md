# FixCI Security Tests

This document describes the security tests for the billing endpoints and how to verify they're properly protected.

## Billing Endpoints Security

### Overview

The billing endpoints (`/billing/checkout` and `/billing/portal`) handle financial operations and must be properly secured to prevent:
- Unauthorized access to billing information
- Fraudulent checkout session creation
- Privacy violations (accessing other users' billing)
- Rate limit abuse

### Security Layers Implemented

#### Layer 1: Authentication
All billing endpoints require a valid session token.

**Test:**
```bash
# Should FAIL with 401 Unauthorized
curl -X POST https://api.fixci.dev/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{"installationId": 123456, "tier": "pro"}'

# Expected response:
# {"error": "Unauthorized"}
```

#### Layer 2: Authorization (Installation Access)
Users can only access billing for installations they're members of.

**Test:**
```bash
# Should FAIL with 403 Forbidden if user doesn't have access
curl -X POST https://api.fixci.dev/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"installationId": 999999, "tier": "pro"}'

# Expected response:
# {"error": "Forbidden: No access to this installation"}
```

#### Layer 3: Input Validation
Invalid inputs are rejected before processing.

**Test - Missing Fields:**
```bash
# Should FAIL with 400 Bad Request
curl -X POST https://api.fixci.dev/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"installationId": 123456}'

# Expected response:
# {"error": "Missing required fields: installationId, tier"}
```

**Test - Invalid Tier:**
```bash
# Should FAIL with 400 Bad Request
curl -X POST https://api.fixci.dev/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"installationId": 123456, "tier": "free"}'

# Expected response:
# {"error": "Invalid tier. Must be one of: pro, enterprise"}
```

#### Layer 4: Rate Limiting
Billing operations are rate limited to prevent abuse.

**Limits:**
- Checkout: 5 requests per hour per user
- Portal: 10 requests per hour per user

**Test:**
```bash
# Make 6 requests rapidly
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST https://api.fixci.dev/billing/checkout \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
    -d '{"installationId": 123456, "tier": "pro"}'
  echo ""
done

# Requests 1-5: Should succeed or fail based on validation
# Request 6: Should FAIL with 429 Too Many Requests
# {"error": "Too Many Requests", "retryAfter": 3600, ...}
```

---

## Security Test Checklist

Use this checklist to verify all security measures are working:

### /billing/checkout Endpoint

- [ ] **Test 1:** Request without auth token → 401 Unauthorized
- [ ] **Test 2:** Request with invalid token → 401 Unauthorized
- [ ] **Test 3:** Request for installation user doesn't own → 403 Forbidden
- [ ] **Test 4:** Request with missing installationId → 400 Bad Request
- [ ] **Test 5:** Request with missing tier → 400 Bad Request
- [ ] **Test 6:** Request with invalid tier (e.g., "free") → 400 Bad Request
- [ ] **Test 7:** 6th request within an hour → 429 Too Many Requests
- [ ] **Test 8:** Valid request with proper auth and access → 200 OK with Stripe URL

### /billing/portal Endpoint

- [ ] **Test 1:** Request without auth token → 401 Unauthorized
- [ ] **Test 2:** Request with invalid token → 401 Unauthorized
- [ ] **Test 3:** Request for installation user doesn't own → 403 Forbidden
- [ ] **Test 4:** Request with missing installationId → 400 Bad Request
- [ ] **Test 5:** 11th request within an hour → 429 Too Many Requests
- [ ] **Test 6:** Valid request with proper auth and access → 200 OK with Stripe URL

---

## Attack Scenarios Prevented

### Scenario 1: Unauthorized Billing Access
**Attack:** Malicious user tries to create checkout session for another user's installation

**Before Fix:**
```bash
# Anyone could access any installation's billing
curl -X POST https://api.fixci.dev/billing/checkout \
  -d '{"installationId": 101750548, "tier": "pro"}'
# ❌ Would succeed and create Stripe session
```

**After Fix:**
```bash
# Same request now fails
curl -X POST https://api.fixci.dev/billing/checkout \
  -d '{"installationId": 101750548, "tier": "pro"}'
# ✅ Returns 401 Unauthorized
```

### Scenario 2: Billing Portal Privacy Violation
**Attack:** Attacker enumerates installation IDs to access billing portals

**Before Fix:**
```bash
# Loop through installation IDs
for id in {100000..200000}; do
  curl -X POST https://api.fixci.dev/billing/portal \
    -d "{\"installationId\": $id}"
done
# ❌ Would expose billing info for all installations
```

**After Fix:**
```bash
# Same attack now fails
for id in {100000..200000}; do
  curl -X POST https://api.fixci.dev/billing/portal \
    -d "{\"installationId\": $id}"
done
# ✅ All requests return 401 Unauthorized
# ✅ Rate limited after 10 attempts
```

### Scenario 3: Stripe Session Flooding
**Attack:** Create thousands of Stripe checkout sessions to abuse the API

**Before Fix:**
```bash
# Create 1000 sessions rapidly
for i in {1..1000}; do
  curl -X POST https://api.fixci.dev/billing/checkout \
    -d '{"installationId": 123, "tier": "pro"}'
done
# ❌ Would create 1000 Stripe sessions (potential cost/abuse)
```

**After Fix:**
```bash
# Same attack now fails
for i in {1..1000}; do
  curl -X POST https://api.fixci.dev/billing/checkout \
    -H "Authorization: Bearer VALID_TOKEN" \
    -d '{"installationId": 123, "tier": "pro"}'
done
# ✅ First 5 may succeed (legitimate use)
# ✅ Requests 6-1000 are rate limited (429 response)
```

### Scenario 4: Tier Manipulation
**Attack:** Try to upgrade to paid tier without paying

**Before Fix:**
```bash
# No validation on tier parameter
curl -X POST https://api.fixci.dev/billing/checkout \
  -d '{"installationId": 123, "tier": "invalid"}'
# ❌ Might crash or behave unexpectedly
```

**After Fix:**
```bash
# Same request now validates tier
curl -X POST https://api.fixci.dev/billing/checkout \
  -H "Authorization: Bearer VALID_TOKEN" \
  -d '{"installationId": 123, "tier": "invalid"}'
# ✅ Returns 400 with clear error message
```

---

## Production Verification

After deployment, verify security with these commands:

### 1. Test Unauthenticated Access (Should Fail)
```bash
curl -v https://api.fixci.dev/billing/checkout \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"installationId": 1, "tier": "pro"}' \
  2>&1 | grep "401\|Unauthorized"
```

### 2. Test Invalid Installation Access (Should Fail)
Requires a valid session token from your actual dashboard:
```bash
# Get your session token from browser DevTools
TOKEN="your-session-token-here"

# Try to access installation you don't own
curl -v https://api.fixci.dev/billing/checkout \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"installationId": 999999, "tier": "pro"}' \
  2>&1 | grep "403\|Forbidden"
```

### 3. Test Rate Limiting (6th Request Should Fail)
```bash
TOKEN="your-session-token-here"
INSTALL_ID="your-installation-id"

for i in {1..6}; do
  echo "Request $i:"
  curl https://api.fixci.dev/billing/checkout \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"installationId\": $INSTALL_ID, \"tier\": \"pro\"}" | jq
  sleep 1
done
```

---

## Security Monitoring

Monitor these metrics in production:

1. **401 Unauthorized responses** - Should be high if attackers are probing
2. **403 Forbidden responses** - Indicates users trying to access installations they don't own
3. **429 Rate Limit responses** - Normal for legitimate users, suspicious if consistent
4. **Successful Stripe session creations** - Should correlate with legitimate upgrade requests

### Recommended Alerts

Set up alerts for:
- More than 100 failed auth attempts per hour (potential attack)
- More than 50 403s from single IP (enumeration attack)
- Spike in rate limit responses (possible DoS attempt)

---

## Code References

Implementation details:

- **Authentication:** `packages/github-app/src/index.js:74-77, 114-117`
- **Authorization:** `packages/github-app/src/index.js:87-94, 121-128`
- **Input Validation:** `packages/github-app/src/index.js:82-100, 116-130`
- **Rate Limiting:** `packages/github-app/src/index.js:80-84, 120-124`
- **Rate Limit Module:** `packages/github-app/src/ratelimit.js`

---

## Compliance Notes

These security measures help with:

- **PCI DSS:** Protecting payment-related endpoints
- **GDPR:** Access control for billing data (privacy)
- **SOC 2:** Authentication and authorization controls
- **OWASP Top 10:**
  - A01:2021 - Broken Access Control (Fixed)
  - A07:2021 - Identification and Authentication Failures (Fixed)

---

Last Updated: 2026-01-03
