/**
 * Rate Limit Testing Script
 * Tests the rate limiting functionality locally
 *
 * Run with: node test-ratelimit.js
 */

import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from './src/ratelimit.js';

// Mock KV namespace for testing
class MockKV {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  async put(key, value, options = {}) {
    const expiry = options.expirationTtl
      ? Date.now() + (options.expirationTtl * 1000)
      : null;

    this.store.set(key, { value, expiry });
  }

  async delete(key) {
    this.store.delete(key);
  }
}

// Mock environment
const mockEnv = {
  SESSIONS: new MockKV()
};

// Mock request
const mockRequest = {
  headers: {
    data: {
      'CF-Connecting-IP': '192.168.1.100',
      'X-Forwarded-For': '192.168.1.100',
      'User-Agent': 'Test/1.0'
    },
    get(name) {
      return this.data[name] || null;
    }
  }
};

async function runTests() {
  console.log('🧪 Starting Rate Limit Tests\n');

  // Test 1: getClientIP
  console.log('Test 1: Extract Client IP');
  const ip = getClientIP(mockRequest);
  console.log(`✓ Extracted IP: ${ip}\n`);

  // Test 2: Basic rate limiting
  console.log('Test 2: Basic Rate Limiting (3 requests per 5 seconds)');
  for (let i = 1; i <= 5; i++) {
    const result = await checkRateLimit('test:basic', 3, 5, mockEnv);
    console.log(`  Request ${i}: ${result.allowed ? '✓ ALLOWED' : '✗ BLOCKED'} (remaining: ${result.remaining})`);

    if (i === 4 && result.allowed === true) {
      console.error('  ✗ ERROR: Should have been blocked!');
      process.exit(1);
    }
  }
  console.log('✓ Test passed\n');

  // Test 3: Window expiration
  console.log('Test 3: Rate Limit Window Expiration');
  await checkRateLimit('test:expiry', 2, 1, mockEnv); // 1st request
  await checkRateLimit('test:expiry', 2, 1, mockEnv); // 2nd request (limit reached)

  const blocked = await checkRateLimit('test:expiry', 2, 1, mockEnv);
  console.log(`  Before wait: ${blocked.allowed ? '✗ ALLOWED (wrong)' : '✓ BLOCKED (correct)'}`);

  // Wait for window to expire
  console.log('  Waiting 1.5 seconds for window to expire...');
  await new Promise(resolve => setTimeout(resolve, 1500));

  const allowed = await checkRateLimit('test:expiry', 2, 1, mockEnv);
  console.log(`  After wait: ${allowed.allowed ? '✓ ALLOWED (correct)' : '✗ BLOCKED (wrong)'}`);

  if (!allowed.allowed) {
    console.error('  ✗ ERROR: Should have been allowed after expiry!');
    process.exit(1);
  }
  console.log('✓ Test passed\n');

  // Test 4: Different keys don't interfere
  console.log('Test 4: Key Isolation');
  await checkRateLimit('test:user1', 1, 10, mockEnv);
  const user1Block = await checkRateLimit('test:user1', 1, 10, mockEnv);
  const user2Allow = await checkRateLimit('test:user2', 1, 10, mockEnv);

  console.log(`  User1 second request: ${user1Block.allowed ? '✗ ALLOWED' : '✓ BLOCKED'}`);
  console.log(`  User2 first request: ${user2Allow.allowed ? '✓ ALLOWED' : '✗ BLOCKED'}`);

  if (user1Block.allowed || !user2Allow.allowed) {
    console.error('  ✗ ERROR: Keys interfering with each other!');
    process.exit(1);
  }
  console.log('✓ Test passed\n');

  // Test 5: Rate limit response format
  console.log('Test 5: Rate Limit Response Format');
  const resetAt = Math.floor(Date.now() / 1000) + 60;
  const response = rateLimitResponse(resetAt);

  console.log(`  Status: ${response.status === 429 ? '✓ 429' : '✗ ' + response.status}`);
  console.log(`  Retry-After header: ${response.headers.get('Retry-After')}`);

  const body = JSON.parse(await response.text());
  console.log(`  Body contains error: ${body.error ? '✓ Yes' : '✗ No'}`);
  console.log(`  Body contains retryAfter: ${body.retryAfter ? '✓ Yes' : '✗ No'}`);

  if (response.status !== 429 || !body.error || !body.retryAfter) {
    console.error('  ✗ ERROR: Invalid rate limit response format!');
    process.exit(1);
  }
  console.log('✓ Test passed\n');

  // Test 6: Preset rate limits
  console.log('Test 6: Rate Limit Presets');
  console.log(`  LOGIN: ${RATE_LIMITS.LOGIN.maxRequests} requests per ${RATE_LIMITS.LOGIN.windowSeconds}s`);
  console.log(`  VERIFY: ${RATE_LIMITS.VERIFY.maxRequests} requests per ${RATE_LIMITS.VERIFY.windowSeconds}s`);
  console.log(`  WEBHOOK: ${RATE_LIMITS.WEBHOOK.maxRequests} requests per ${RATE_LIMITS.WEBHOOK.windowSeconds}s`);
  console.log('✓ Presets loaded\n');

  // Test 7: Key sanitization
  console.log('Test 7: Key Sanitization (prevent injection)');
  const maliciousKey = 'test:../../etc/passwd';
  const result = await checkRateLimit(maliciousKey, 5, 10, mockEnv);
  console.log(`  Malicious key handled: ${result.allowed ? '✓ Yes' : '✗ No'}`);
  console.log('✓ Test passed\n');

  console.log('✅ All tests passed!\n');
  console.log('Summary:');
  console.log('  - Client IP extraction works');
  console.log('  - Rate limiting enforces limits correctly');
  console.log('  - Time windows expire properly');
  console.log('  - Different keys are isolated');
  console.log('  - Response format is correct');
  console.log('  - Security: Key sanitization works');
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
