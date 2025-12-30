/**
 * Authentication Service
 * Handles magic link authentication and session management
 */

import { sendMagicLink } from './email.js';

/**
 * Generate a secure random token for magic links and sessions
 * @returns {string} 64-character hex token
 */
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Send magic link email to user
 * Creates or finds user, generates token, sends email
 * @param {string} email - User's email address
 * @param {object} env - Environment bindings
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendLoginLink(email, env) {
  // Find or create user
  let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

  if (!user) {
    // Create new user
    const result = await env.DB.prepare(
      'INSERT INTO users (email) VALUES (?) RETURNING *'
    ).bind(email).first();
    user = result;
  }

  // Generate magic link token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Store in D1 (for audit trail)
  await env.DB.prepare(`
    INSERT INTO auth_sessions (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `).bind(user.id, token, expiresAt).run();

  // Also store in KV for fast validation (auto-expires)
  await env.SESSIONS.put(token, JSON.stringify({ userId: user.id, email }), {
    expirationTtl: 600 // 10 minutes
  });

  // Send email with magic link
  const loginUrl = `https://dashboard.fixci.dev/auth/verify?token=${token}`;

  try {
    await sendMagicLink(email, loginUrl, env);
  } catch (error) {
    // Clean up token if email failed
    await env.DB.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(token).run();
    await env.SESSIONS.delete(token);
    throw error;
  }

  return {
    success: true,
    message: 'Check your email for the login link'
  };
}

/**
 * Verify magic link token and create long-lived session
 * @param {string} token - Magic link token from URL
 * @param {object} env - Environment bindings
 * @returns {Promise<{valid: boolean, sessionToken?: string, user?: object, error?: string}>}
 */
export async function verifyToken(token, env) {
  // Check KV first (fast lookup)
  const kvData = await env.SESSIONS.get(token);

  if (!kvData) {
    return { valid: false, error: 'Invalid or expired token' };
  }

  const { userId, email } = JSON.parse(kvData);

  // Verify in D1 and check expiration
  const session = await env.DB.prepare(`
    SELECT * FROM auth_sessions
    WHERE token = ? AND expires_at > datetime('now')
  `).bind(token).first();

  if (!session) {
    // Token expired or doesn't exist
    await env.SESSIONS.delete(token);
    return { valid: false, error: 'Token expired or already used' };
  }

  // Delete one-time magic link token
  await env.DB.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(token).run();
  await env.SESSIONS.delete(token);

  // Create long-lived session token (30 days)
  const sessionToken = generateToken();
  const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Store session in D1
  await env.DB.prepare(`
    INSERT INTO auth_sessions (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `).bind(userId, sessionToken, sessionExpiry).run();

  // Store session in KV for fast validation
  await env.SESSIONS.put(sessionToken, JSON.stringify({ userId, email }), {
    expirationTtl: 30 * 24 * 60 * 60 // 30 days
  });

  return {
    valid: true,
    sessionToken,
    user: { id: userId, email }
  };
}

/**
 * Verify session token (for protected routes)
 * @param {Request} request - HTTP request with Authorization header
 * @param {object} env - Environment bindings
 * @returns {Promise<{authenticated: boolean, user?: object, error?: string}>}
 */
export async function verifySession(request, env) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: 'Missing or invalid authorization header'
    };
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  // Check KV for fast lookup
  const kvData = await env.SESSIONS.get(token);

  if (!kvData) {
    return {
      authenticated: false,
      error: 'Invalid or expired session'
    };
  }

  const { userId, email } = JSON.parse(kvData);

  // Optionally verify in D1 for extra security
  const session = await env.DB.prepare(`
    SELECT s.*, u.email, u.name
    FROM auth_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).bind(token).first();

  if (!session) {
    // Session expired or invalid, clean up KV
    await env.SESSIONS.delete(token);
    return {
      authenticated: false,
      error: 'Session expired'
    };
  }

  return {
    authenticated: true,
    user: {
      id: userId,
      email: session.email,
      name: session.name
    }
  };
}

/**
 * Logout - delete session tokens
 * @param {string} token - Session token to invalidate
 * @param {object} env - Environment bindings
 * @returns {Promise<{success: boolean}>}
 */
export async function logout(token, env) {
  // Delete from D1
  await env.DB.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(token).run();

  // Delete from KV
  await env.SESSIONS.delete(token);

  return { success: true };
}
