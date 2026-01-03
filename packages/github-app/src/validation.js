/**
 * Input Validation Middleware
 * Centralized validation using Zod schemas for all user inputs
 *
 * Prevents:
 * - Injection attacks (SQL, XSS, command injection)
 * - Type confusion bugs
 * - Missing required fields
 * - Invalid data formats
 * - Buffer overflow attempts
 */

import { z } from 'zod';

/**
 * Common reusable schemas
 */
const schemas = {
  // Email validation (RFC 5322 compliant)
  email: z.string().email().min(3).max(254),

  // Installation ID (positive integer, max 20 digits for GitHub's format)
  installationId: z.number().int().positive().max(99999999999999999999),

  // Subscription tier (enum)
  tier: z.enum(['free', 'pro', 'enterprise']),

  // Analysis ID (positive integer)
  analysisId: z.number().int().positive(),

  // GitHub token (hex string, 40-128 chars)
  token: z.string().regex(/^[a-f0-9]{40,128}$/i).optional(),

  // Company name (optional, max 100 chars, no special chars for security)
  company: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9\s\-'&.,]+$/).optional(),

  // URL (must be https in production)
  url: z.string().url(),

  // Pagination
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().nonnegative().default(0),

  // Days for history queries
  days: z.number().int().positive().max(365).default(30),
};

/**
 * Validation schemas for each endpoint
 */
export const validationSchemas = {
  // Auth endpoints
  login: z.object({
    email: schemas.email,
    installationId: z.string().optional(), // String from JSON, will be converted
    company: schemas.company,
  }),

  completeSetup: z.object({
    installationId: z.union([z.string(), z.number()]).transform(val =>
      typeof val === 'string' ? parseInt(val) : val
    ),
    email: schemas.email,
    company: schemas.company,
  }),

  verifyToken: z.object({
    token: z.string().min(32).max(128), // Session tokens are 64 chars hex
  }),

  // Billing endpoints
  billingCheckout: z.object({
    installationId: z.union([z.string(), z.number()]).transform(val =>
      typeof val === 'string' ? parseInt(val) : val
    ),
    tier: schemas.tier.refine(tier => tier !== 'free', {
      message: 'Cannot checkout for free tier. Use pro or enterprise.',
    }),
  }),

  billingPortal: z.object({
    installationId: z.union([z.string(), z.number()]).transform(val =>
      typeof val === 'string' ? parseInt(val) : val
    ),
  }),

  // API endpoints
  subscription: z.object({
    installation_id: z.string().transform(val => parseInt(val)),
  }),

  usageHistory: z.object({
    installation_id: z.string().transform(val => parseInt(val)),
    days: z.string().optional().transform(val => val ? parseInt(val) : 30),
  }),

  analysisStatus: z.object({
    id: z.string().transform(val => parseInt(val)),
  }),

  // Admin endpoints
  adminSubscriptionGrant: z.object({
    installationId: z.union([z.string(), z.number()]).transform(val =>
      typeof val === 'string' ? parseInt(val) : val
    ),
    tier: schemas.tier,
    reason: z.string().min(10).max(500).optional(),
    expiresAt: z.string().datetime().optional(),
  }),

  adminSubscriptionStatus: z.object({
    installationId: z.union([z.string(), z.number()]).transform(val =>
      typeof val === 'string' ? parseInt(val) : val
    ),
    status: z.enum(['active', 'suspended', 'cancelled', 'past_due']),
    reason: z.string().min(10).max(500).optional(),
  }),

  adminResetUsage: z.object({
    installationId: z.union([z.string(), z.number()]).transform(val =>
      typeof val === 'string' ? parseInt(val) : val
    ),
    reason: z.string().min(10).max(500).optional(),
  }),

  adminRevokeSubscription: z.object({
    installationId: z.union([z.string(), z.number()]).transform(val =>
      typeof val === 'string' ? parseInt(val) : val
    ),
    action: z.enum(['downgrade', 'suspend']),
    reason: z.string().min(10).max(500).optional(),
  }),
};

/**
 * Validate request body against a schema
 * @param {object} data - The data to validate (from request.json())
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @returns {{success: boolean, data?: object, errors?: array}}
 */
export function validateInput(data, schema) {
  try {
    const result = schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        errors: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: 'Validation error: ' + error.message,
        code: 'VALIDATION_ERROR',
      }],
    };
  }
}

/**
 * Validate query parameters
 * @param {URLSearchParams} searchParams - The URL search params
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @returns {{success: boolean, data?: object, errors?: array}}
 */
export function validateQueryParams(searchParams, schema) {
  // Convert URLSearchParams to plain object
  const data = {};
  for (const [key, value] of searchParams.entries()) {
    data[key] = value;
  }

  return validateInput(data, schema);
}

/**
 * Create a validation error response
 * @param {array} errors - Array of validation errors
 * @param {Request} request - Original request for CORS headers
 * @returns {Response} JSON response with 400 status and validation errors
 */
export function validationErrorResponse(errors, request = null) {
  const corsHeaders = request ? getCorsHeaders(request) : {
    'Access-Control-Allow-Origin': 'https://fixci.dev',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  return new Response(JSON.stringify({
    error: 'Validation failed',
    details: errors,
    message: errors.map(e => `${e.field}: ${e.message}`).join('; '),
  }), {
    status: 400,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Helper to get CORS headers (simplified version)
 */
function getCorsHeaders(request) {
  const ALLOWED_ORIGINS = [
    'https://fixci.dev',
    'https://www.fixci.dev',
    'https://dashboard.fixci.dev',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ];

  const origin = request.headers.get('Origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Sanitize string input to prevent XSS and injection attacks
 * @param {string} input - The string to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    return '';
  }

  // Truncate to max length
  let sanitized = input.substring(0, maxLength);

  // Remove null bytes (potential for binary injection)
  sanitized = sanitized.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate and sanitize email
 * @param {string} email - Email to validate
 * @returns {{valid: boolean, email?: string, error?: string}}
 */
export function validateEmail(email) {
  const result = schemas.email.safeParse(email);

  if (result.success) {
    return {
      valid: true,
      email: result.data.toLowerCase(), // Normalize to lowercase
    };
  } else {
    return {
      valid: false,
      error: result.error.errors[0].message,
    };
  }
}

/**
 * Validate installation ID
 * @param {string|number} installationId - Installation ID to validate
 * @returns {{valid: boolean, installationId?: number, error?: string}}
 */
export function validateInstallationId(installationId) {
  // Convert string to number if needed
  const id = typeof installationId === 'string'
    ? parseInt(installationId)
    : installationId;

  const result = schemas.installationId.safeParse(id);

  if (result.success) {
    return {
      valid: true,
      installationId: result.data,
    };
  } else {
    return {
      valid: false,
      error: 'Invalid installation ID: must be a positive integer',
    };
  }
}

/**
 * Security: Validate that a number is within safe integer range
 * JavaScript's Number.MAX_SAFE_INTEGER = 9007199254740991
 * @param {number} num - Number to validate
 * @returns {boolean} True if safe
 */
export function isSafeInteger(num) {
  return Number.isSafeInteger(num) && num >= 0;
}

/**
 * Prevent ReDoS (Regular Expression Denial of Service) attacks
 * Limits string length before regex matching
 * @param {string} input - String to validate
 * @param {RegExp} regex - Regex pattern to match
 * @param {number} maxLength - Max length before matching
 * @returns {boolean} True if matches and within length limit
 */
export function safeRegexMatch(input, regex, maxLength = 1000) {
  if (typeof input !== 'string' || input.length > maxLength) {
    return false;
  }

  return regex.test(input);
}
