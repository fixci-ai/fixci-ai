# Cookie Authentication Testing Guide

This document explains the cookie-based authentication system and how to test it.

## Overview

FixCI supports **dual authentication modes**:
1. **HTTP-only Cookies** - For browser-based clients (dashboards, web apps)
2. **Bearer Tokens** - For API clients, CLIs, and programmatic access

Both methods use the same session tokens under the hood.

---

## How Cookie Authentication Works

### 1. User Requests Login
```bash
POST /auth/login
{
  "email": "user@example.com",
  "installationId": "123456",  # Optional
  "company": "Acme Inc"         # Optional
}
```

### 2. Magic Link Sent
- Email sent with verification link
- Link contains one-time token (10 min expiry)
- Token stored in both D1 (audit) and KV (fast lookup)

### 3. User Clicks Link
```
GET /auth/verify?token=abc123...
```

**What Happens:**
1. Token validated (KV + D1 check)
2. If metadata contains `installationId`:
   - Creates `installation_members` relationship
   - Links user to their GitHub installation
3. One-time token deleted
4. New long-lived session token created (30 days)
5. **HttpOnly cookie set** with session token
6. User redirected to dashboard

### 4. Authenticated Requests

**Browser automatically sends cookie:**
```
GET /api/subscription?installation_id=123456
Cookie: session=xyz789...
```

**verifySession() checks in this order:**
1. ✅ Check Cookie header first
2. ✅ Fallback to Authorization header
3. ❌ Reject if neither present

---

## Cookie Format

### Set-Cookie Header (from server)
```
Set-Cookie: session=<session-token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000
```

**Attributes:**
- `HttpOnly` - JavaScript cannot access (XSS protection)
- `Secure` - Only sent over HTTPS
- `SameSite=Strict` - CSRF protection
- `Path=/` - Available on all paths
- `Max-Age=2592000` - 30 days (2,592,000 seconds)

### Cookie Header (from browser)
```
Cookie: session=abc123def456...
```

---

## Testing Cookie Authentication

### Test 1: Cookie Parsing

**Verify parseCookies() utility:**
```javascript
const cookieHeader = "session=abc123; other=value; foo=bar";
const cookies = parseCookies(cookieHeader);

// Should return: { session: 'abc123', other: 'value', foo: 'bar' }
```

### Test 2: Login Flow

**Step 1: Request login link**
```bash
curl -X POST https://api.fixci.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "installationId": "123456"
  }'

# Response:
{
  "success": true,
  "message": "Check your email for the login link"
}
```

**Step 2: Check email and get token**
- Email contains: `https://dashboard.fixci.dev/auth/verify?token=<TOKEN>`
- Extract token from URL

**Step 3: Verify token (browser simulation)**
```bash
curl -v 'https://api.fixci.dev/auth/verify?token=<TOKEN>' \
  2>&1 | grep -i "set-cookie"

# Should see:
Set-Cookie: session=<SESSION_TOKEN>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000
```

### Test 3: Using Cookie for API Requests

**Extract session token from Set-Cookie response, then:**

```bash
# Test with cookie
curl https://api.fixci.dev/api/subscription?installation_id=123456 \
  -H "Cookie: session=<SESSION_TOKEN>" | jq

# Should return subscription data (not 401 Unauthorized)
```

### Test 4: Fallback to Authorization Header

**Cookie authentication should NOT break existing API clients:**

```bash
# Test with Bearer token (backward compatibility)
curl https://api.fixci.dev/api/subscription?installation_id=123456 \
  -H "Authorization: Bearer <SESSION_TOKEN>" | jq

# Should also work (same session token)
```

### Test 5: Cookie Priority

**If both cookie and header are present, cookie takes priority:**

```bash
curl https://api.fixci.dev/api/me \
  -H "Cookie: session=<VALID_TOKEN>" \
  -H "Authorization: Bearer <DIFFERENT_TOKEN>" | jq

# Should use cookie token (not header)
```

### Test 6: Logout Clears Cookie

```bash
# Logout request
curl -X POST https://api.fixci.dev/auth/logout \
  -H "Cookie: session=<SESSION_TOKEN>" \
  -v 2>&1 | grep -i "set-cookie"

# Should see cookie cleared:
Set-Cookie: session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
```

---

## Security Features

### 1. HttpOnly Cookies
```javascript
// JavaScript CANNOT access the cookie:
document.cookie // Won't see 'session'
```
**Protection:** XSS attacks can't steal session tokens

### 2. Secure Flag
```javascript
// Cookie only sent over HTTPS
http://api.fixci.dev/api/me // Cookie NOT sent
https://api.fixci.dev/api/me // Cookie sent ✓
```
**Protection:** Man-in-the-middle attacks

### 3. SameSite=Strict
```html
<!-- External site cannot trigger authenticated requests -->
<img src="https://api.fixci.dev/billing/checkout?...">
<!-- Cookie will NOT be sent -->
```
**Protection:** CSRF attacks

### 4. Token Validation
- Every request checks KV (fast) + D1 (audit trail)
- Expired tokens automatically cleaned up
- One-time magic link tokens deleted after use

---

## Troubleshooting

### Issue: Cookie Not Being Sent

**Check 1: Domain mismatch**
```
Cookie set for: api.fixci.dev
Request to: dashboard.fixci.dev
Result: Cookie NOT sent (different domain)
```

**Solution:** Use same domain or configure CORS properly

**Check 2: Secure flag on HTTP**
```
Cookie has Secure flag
Request over HTTP
Result: Cookie NOT sent
```

**Solution:** Use HTTPS in production

### Issue: 401 Unauthorized with Cookie

**Debug steps:**
1. Check if cookie is being sent:
   ```bash
   curl -v ... 2>&1 | grep "Cookie:"
   ```

2. Check cookie value format:
   ```bash
   # Should be hex string (64 chars)
   echo "<TOKEN>" | wc -c
   ```

3. Check token exists in KV:
   ```bash
   npx wrangler kv:key get "<TOKEN>" --namespace-id=2e8fae5e5a774cd0b5059234e7876df0
   ```

### Issue: Dashboard Shows Logged Out

**Possible causes:**
1. Cookie expired (30 days)
2. User logged out
3. Token manually deleted from KV
4. Browser cleared cookies

**Solution:** Request new login link

---

## Implementation Details

### Code Flow

**verifySession() in auth.js:**
```javascript
export async function verifySession(request, env) {
  let token = null;

  // PRIORITY 1: Check for httpOnly cookie
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    token = cookies.session;
  }

  // PRIORITY 2: Fallback to Authorization header
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // Validate token...
}
```

### Cookie Parsing

**parseCookies() utility:**
```javascript
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    const value = rest.join('=').trim();
    if (name && value) {
      cookies[name.trim()] = decodeURIComponent(value);
    }
  });

  return cookies;
}
```

**Handles edge cases:**
- Multiple cookies in one header
- Cookie values containing `=` signs
- URL-encoded values
- Whitespace around names/values

---

## Backward Compatibility

**Old API clients using Bearer tokens:** ✅ Still work
```bash
# This continues to work
curl -H "Authorization: Bearer <TOKEN>" https://api.fixci.dev/api/me
```

**New browser-based clients using cookies:** ✅ Now work
```javascript
// This now works too
fetch('https://api.fixci.dev/api/me', {
  credentials: 'include' // Send cookies
})
```

---

## Production Checklist

- [ ] HTTPS enabled (Cloudflare automatic)
- [ ] Cookies set with Secure flag
- [ ] Cookies set with HttpOnly flag
- [ ] Cookies set with SameSite=Strict
- [ ] CORS headers allow credentials
- [ ] Dashboard sends `credentials: 'include'`
- [ ] Session tokens are cryptographically random (32 bytes)
- [ ] Tokens expire after 30 days
- [ ] Old tokens cleaned up automatically (KV TTL)

---

## Monitoring

### Metrics to Track

1. **Authentication method distribution:**
   - % requests using cookies
   - % requests using Bearer tokens

2. **Session duration:**
   - Average session lifetime
   - % sessions using full 30 days

3. **Token validation failures:**
   - Expired tokens
   - Invalid tokens
   - Deleted tokens

### Alerts

Set up alerts for:
- Spike in 401 errors (token validation issues)
- Spike in token deletions (potential attack)
- Unusual login patterns (potential account takeover)

---

Last Updated: 2026-01-03
