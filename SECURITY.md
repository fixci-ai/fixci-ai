# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest (main branch) | :white_check_mark: |
| Older versions | :x: |

## Reporting a Vulnerability

We take the security of FixCI seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Disclose Publicly

Please **do not** open a public GitHub issue for security vulnerabilities. This helps protect our users while we work on a fix.

### 2. Report Privately

Send your security report to: **security@fixci.dev**

Include the following information:
- Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability and how it could be exploited

### 3. Response Timeline

We are committed to responding to security reports promptly:

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days with an assessment
- **Fix Timeline:** Critical issues patched within 30 days
- **Public Disclosure:** After fix is deployed and users have been notified

### 4. Bug Bounty

While we don't currently offer a paid bug bounty program, we deeply appreciate security researchers' efforts. We will:

- Acknowledge your contribution in our security advisories (with your permission)
- List you in our Hall of Fame (if you wish)
- Provide you with FixCI Pro subscription as a thank you for critical vulnerabilities

## Security Best Practices

### For Users

1. **Keep Dependencies Updated:** Regularly update to the latest version
2. **Secure Your Secrets:** Never commit API keys, webhook secrets, or tokens
3. **Use Environment Variables:** Store sensitive configuration in Cloudflare Workers secrets
4. **Enable 2FA:** Protect your GitHub and Cloudflare accounts with two-factor authentication
5. **Monitor Access:** Regularly review who has access to your installations

### For Contributors

1. **Parameterized Queries:** Always use parameterized SQL queries to prevent injection
2. **Input Validation:** Validate and sanitize all user inputs
3. **Authentication:** Verify user authentication and authorization on all protected endpoints
4. **Rate Limiting:** Implement rate limits on public endpoints
5. **Secure Cookies:** Use HttpOnly, Secure, and SameSite flags for cookies
6. **CORS:** Maintain strict CORS policies with whitelisted origins
7. **Webhook Verification:** Always verify GitHub webhook signatures

## Known Security Features

FixCI implements several security measures:

### Authentication & Authorization
- ✅ Magic link authentication (passwordless)
- ✅ HttpOnly session cookies with 30-day expiration
- ✅ Session token storage in both D1 and KV for security and performance
- ✅ Installation-level access control
- ✅ User-to-installation membership verification

### Data Protection
- ✅ SQL injection prevention via parameterized queries
- ✅ CORS protection with allowed origins whitelist
- ✅ Webhook signature verification (GitHub, Stripe)
- ✅ Secrets stored in Cloudflare Workers environment variables
- ✅ No sensitive data logged to console

### Rate Limiting
- ✅ Login attempts: 3 per 15 minutes per email
- ✅ API endpoints protected against brute force
- ✅ Per-IP rate limiting on public endpoints

### Infrastructure
- ✅ Cloudflare Workers automatic DDoS protection
- ✅ Cloudflare D1 encrypted at rest
- ✅ TLS/SSL encryption in transit
- ✅ Automatic security headers via Cloudflare

## Security Considerations

### Intentional Test Bugs

The codebase contains **intentional bugs** in `/api/analysis/status` for testing FixCI's own analysis capabilities. These are:

- Clearly marked with comments
- Non-security related (typically typos that cause runtime errors)
- Isolated to test endpoints
- Not exploitable for security vulnerabilities

If you find these, they're working as intended! Please focus on reporting actual security issues.

## Disclosure Policy

We follow **responsible disclosure** principles:

1. Security researchers give us reasonable time to fix vulnerabilities
2. We credit researchers who report issues responsibly
3. We coordinate public disclosure timing with reporters
4. We publish security advisories for all patched vulnerabilities

## Contact

- **Security Email:** security@fixci.dev
- **General Support:** support@fixci.dev
- **Response Time:** 48 hours for security issues

## Hall of Fame

We'll recognize security researchers who help keep FixCI secure:

<!-- Security researchers will be listed here -->

---

Thank you for helping keep FixCI and our users safe!
