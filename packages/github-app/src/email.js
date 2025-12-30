/**
 * Email service using Resend API
 * Docs: https://resend.com/docs/send-with-cloudflare-workers
 */

/**
 * Send magic link login email
 * @param {string} email - User's email address
 * @param {string} loginUrl - Magic link URL with token
 * @param {object} env - Environment bindings
 */
export async function sendMagicLink(email, loginUrl, env) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'FixCI <noreply@fixci.dev>',
      to: [email],
      subject: 'Sign in to FixCI',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">FixCI</h1>
          </div>

          <h2 style="color: #1e293b; margin-bottom: 16px;">Sign in to FixCI</h2>

          <p style="color: #475569; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            Click the button below to sign in to your FixCI dashboard:
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}"
               style="display: inline-block;
                      background: #10b981;
                      color: white;
                      padding: 14px 32px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: 600;
                      font-size: 16px;">
              Sign In
            </a>
          </div>

          <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            This link expires in 10 minutes. If you didn't request this, you can safely ignore this email.
          </p>

          <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
            © 2025 FixCI. AI-powered CI/CD failure analysis.
          </p>
        </body>
        </html>
      `
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email failed: ${error}`);
  }

  return await response.json();
}

/**
 * Send welcome email when user first signs up
 * @param {string} email - User's email address
 * @param {string} name - User's name (optional)
 * @param {object} env - Environment bindings
 */
export async function sendWelcomeEmail(email, name, env) {
  const greeting = name ? `Hi ${name}` : 'Welcome';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'FixCI <noreply@fixci.dev>',
      to: [email],
      subject: 'Welcome to FixCI!',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">FixCI</h1>
          </div>

          <h2 style="color: #1e293b; margin-bottom: 16px;">${greeting}!</h2>

          <p style="color: #475569; font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
            Thanks for installing the FixCI GitHub App. We're excited to help you debug CI/CD failures faster with AI-powered analysis.
          </p>

          <h3 style="color: #1e293b; margin-top: 24px; margin-bottom: 12px;">What's next?</h3>

          <ul style="color: #475569; font-size: 16px; line-height: 1.8;">
            <li>Push code to trigger your first CI workflow</li>
            <li>If it fails, FixCI will automatically analyze the logs</li>
            <li>We'll post a detailed explanation as a PR comment</li>
            <li>Track your usage in the <a href="https://dashboard.fixci.dev" style="color: #10b981;">dashboard</a></li>
          </ul>

          <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #475569; font-size: 14px; margin: 0;">
              <strong>Free Tier:</strong> 10 analyses per month with Cloudflare AI and Gemini Flash
            </p>
          </div>

          <p style="color: #475569; font-size: 16px; line-height: 1.5; margin-top: 24px;">
            Need help? Reply to this email or check out our <a href="https://docs.fixci.dev" style="color: #10b981;">documentation</a>.
          </p>

          <p style="color: #64748b; font-size: 14px; margin-top: 32px;">
            Happy debugging!<br>
            The FixCI Team
          </p>

          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            © 2025 FixCI. AI-powered CI/CD failure analysis.
          </p>
        </body>
        </html>
      `
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Welcome email failed: ${error}`);
  }

  return await response.json();
}
