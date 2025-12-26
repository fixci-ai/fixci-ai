export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle API requests
    if (url.pathname === '/api/waitlist' && request.method === 'POST') {
      return handleWaitlistSignup(request, env);
    }

    // Serve landing page
    return serveLandingPage();
  },
};

async function handleWaitlistSignup(request, env) {
  try {
    const { email } = await request.json();

    if (!email || !isValidEmail(email)) {
      return jsonResponse({ error: 'Invalid email address' }, 400);
    }

    await env.DB.prepare(
      'INSERT INTO waitlist (email) VALUES (?) ON CONFLICT(email) DO NOTHING'
    ).bind(email).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Waitlist signup error:', error);
    return jsonResponse({ error: 'Failed to save email' }, 500);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
  });
}

function serveLandingPage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FixCI - AI that explains why your pipeline broke</title>
  <meta name="description" content="Stop scrolling through cryptic build logs. FixCI uses AI to explain CI/CD failures in plain English and suggests fixes in seconds.">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔧</text></svg>">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --primary: #10b981;
      --primary-dark: #059669;
      --bg: #0f172a;
      --bg-light: #1e293b;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --border: #334155;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 24px;
    }

    nav {
      padding: 24px 0;
      border-bottom: 1px solid var(--border);
    }

    .logo {
      font-size: 24px;
      font-weight: 700;
      color: var(--text);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-icon {
      background: var(--primary);
      color: var(--bg);
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
    }

    .hero {
      padding: 80px 0 60px;
      text-align: center;
    }

    .badge {
      display: inline-block;
      background: var(--bg-light);
      border: 1px solid var(--border);
      padding: 6px 14px;
      border-radius: 50px;
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    .badge span {
      color: var(--primary);
    }

    h1 {
      font-size: clamp(36px, 6vw, 56px);
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 24px;
      letter-spacing: -1px;
    }

    .highlight {
      color: var(--primary);
    }

    .subtitle {
      font-size: 20px;
      color: var(--text-muted);
      max-width: 600px;
      margin: 0 auto 40px;
    }

    .email-form {
      display: flex;
      gap: 12px;
      max-width: 440px;
      margin: 0 auto;
      flex-wrap: wrap;
      justify-content: center;
    }

    .email-input {
      flex: 1;
      min-width: 240px;
      padding: 16px 20px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-light);
      color: var(--text);
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s;
    }

    .email-input:focus {
      border-color: var(--primary);
    }

    .email-input::placeholder {
      color: var(--text-muted);
    }

    .submit-btn {
      padding: 16px 28px;
      background: var(--primary);
      color: var(--bg);
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .submit-btn:hover {
      background: var(--primary-dark);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .form-note {
      width: 100%;
      text-align: center;
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 12px;
    }

    .problem {
      padding: 60px 0;
      border-top: 1px solid var(--border);
    }

    .section-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
    }

    h2 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 24px;
    }

    .problem-text {
      color: var(--text-muted);
      font-size: 18px;
      margin-bottom: 32px;
    }

    .code-block {
      background: #0d1117;
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }

    .code-header {
      background: var(--bg-light);
      padding: 12px 16px;
      font-size: 13px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .code-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #f85149;
    }

    .code-content {
      padding: 20px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.7;
      overflow-x: auto;
    }

    .code-line {
      color: var(--text-muted);
    }

    .code-error {
      color: #f85149;
    }

    .solution {
      padding: 60px 0;
      border-top: 1px solid var(--border);
    }

    .solution-box {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 12px;
      padding: 32px;
    }

    .solution-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .solution-icon {
      width: 40px;
      height: 40px;
      background: var(--primary);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .solution-title {
      font-size: 18px;
      font-weight: 600;
    }

    .solution-text {
      color: var(--text-muted);
      font-size: 16px;
      margin-bottom: 20px;
    }

    .solution-fix {
      background: var(--bg);
      border-radius: 8px;
      padding: 16px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 14px;
      color: var(--primary);
    }

    .how {
      padding: 60px 0;
      border-top: 1px solid var(--border);
    }

    .steps {
      display: grid;
      gap: 24px;
      margin-top: 32px;
    }

    .step {
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }

    .step-num {
      width: 40px;
      height: 40px;
      background: var(--bg-light);
      border: 1px solid var(--border);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      flex-shrink: 0;
    }

    .step-content h3 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .step-content p {
      color: var(--text-muted);
      font-size: 15px;
    }

    .cta {
      padding: 80px 0;
      text-align: center;
      border-top: 1px solid var(--border);
    }

    .cta h2 {
      margin-bottom: 16px;
    }

    .cta p {
      color: var(--text-muted);
      margin-bottom: 32px;
    }

    footer {
      padding: 32px 0;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-muted);
      font-size: 14px;
    }

    .success-message {
      display: none;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid var(--primary);
      padding: 16px 24px;
      border-radius: 8px;
      color: var(--primary);
      font-weight: 500;
    }

    .success-message.show {
      display: block;
    }

    .error-message {
      display: none;
      background: rgba(248, 81, 73, 0.1);
      border: 1px solid #f85149;
      padding: 16px 24px;
      border-radius: 8px;
      color: #f85149;
      font-weight: 500;
      margin-top: 12px;
    }

    .error-message.show {
      display: block;
    }

    .email-form.hidden {
      display: none;
    }

    @media (max-width: 480px) {
      .hero { padding: 60px 0 40px; }
      .email-form { flex-direction: column; }
      .email-input { min-width: 100%; }
      .submit-btn { width: 100%; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="container">
      <a href="/" class="logo">
        <div class="logo-icon">F</div>
        FixCI
      </a>
    </div>
  </nav>

  <section class="hero">
    <div class="container">
      <div class="badge">Coming Soon — Join the waitlist</div>
      <h1>AI that explains why your <span class="highlight">pipeline broke</span></h1>
      <p class="subtitle">Stop scrolling through cryptic build logs. FixCI analyzes CI/CD failures and tells you what went wrong — in plain English.</p>

      <form class="email-form" id="waitlist-form">
        <input type="email" class="email-input" placeholder="you@company.com" required id="email-input">
        <button type="submit" class="submit-btn">Join Waitlist</button>
        <p class="form-note">Free tier available. No spam, ever.</p>
      </form>
      <div class="success-message" id="success-message">
        You're on the list! We'll notify you when FixCI launches.
      </div>
      <div class="error-message" id="error-message"></div>
    </div>
  </section>

  <section class="problem">
    <div class="container">
      <div class="section-label">The Problem</div>
      <h2>CI failures waste hours of your time</h2>
      <p class="problem-text">Your build failed. Now you're scrolling through 500 lines of logs, searching Stack Overflow, and context-switching away from actual work.</p>

      <div class="code-block">
        <div class="code-header">
          <div class="code-dot"></div>
          GitHub Actions — build failed
        </div>
        <div class="code-content">
          <div class="code-line">Run npm test</div>
          <div class="code-line">FAIL src/components/Auth.test.tsx</div>
          <div class="code-error">  Auth › should redirect after login</div>
          <div class="code-error">    TypeError: Cannot read properties of undefined (reading 'push')</div>
          <div class="code-line">      at Object.&lt;anonymous&gt; (src/components/Auth.test.tsx:42:18)</div>
          <div class="code-line">      at Promise.then.completed (node_modules/jest/build/jest.js:123:45)</div>
          <div class="code-error">Error: Process completed with exit code 1.</div>
        </div>
      </div>
    </div>
  </section>

  <section class="solution">
    <div class="container">
      <div class="section-label">The Solution</div>
      <h2>Get answers in seconds, not hours</h2>
      <p class="problem-text">FixCI reads your logs, understands the context, and explains exactly what went wrong and how to fix it.</p>

      <div class="solution-box">
        <div class="solution-header">
          <div class="solution-icon">🔧</div>
          <div class="solution-title">FixCI Analysis</div>
        </div>
        <p class="solution-text"><strong>Issue:</strong> The test is failing because <code>useNavigate()</code> returns undefined in the test environment. This happens when the component isn't wrapped in a Router context during testing.</p>
        <div class="solution-fix">
          <strong>Fix:</strong> Wrap your test component with &lt;MemoryRouter&gt; from react-router-dom in your test setup.
        </div>
      </div>
    </div>
  </section>

  <section class="how">
    <div class="container">
      <div class="section-label">How It Works</div>
      <h2>Three steps to faster debugging</h2>

      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-content">
            <h3>Connect your repo</h3>
            <p>Install the GitHub App with one click. Works with GitHub Actions, GitLab CI, CircleCI.</p>
          </div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-content">
            <h3>Pipeline fails</h3>
            <p>FixCI automatically detects failures and analyzes the logs using AI.</p>
          </div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-content">
            <h3>Get instant answers</h3>
            <p>Receive a Slack message or PR comment explaining the issue and how to fix it.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="cta">
    <div class="container">
      <h2>Ship faster. Debug less.</h2>
      <p>Join the waitlist and be first to try FixCI when we launch.</p>
      <form class="email-form" id="waitlist-form-2">
        <input type="email" class="email-input" placeholder="you@company.com" required>
        <button type="submit" class="submit-btn">Join Waitlist</button>
      </form>
      <div class="success-message" id="success-message-2">
        You're on the list! We'll notify you when FixCI launches.
      </div>
      <div class="error-message" id="error-message-2"></div>
    </div>
  </section>

  <footer>
    <div class="container">
      <p>© 2025 FixCI. Built for developers who hate debugging CI.</p>
    </div>
  </footer>

  <script>
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.querySelector('input[type="email"]').value;
        const button = form.querySelector('button');
        const isFirst = form.id === 'waitlist-form';
        const successEl = document.getElementById(isFirst ? 'success-message' : 'success-message-2');
        const errorEl = document.getElementById(isFirst ? 'error-message' : 'error-message-2');

        button.disabled = true;
        button.textContent = 'Joining...';
        errorEl.classList.remove('show');

        try {
          const res = await fetch('/api/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });

          const data = await res.json();

          if (res.ok) {
            form.classList.add('hidden');
            successEl.classList.add('show');
          } else {
            throw new Error(data.error || 'Something went wrong');
          }
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.classList.add('show');
          button.disabled = false;
          button.textContent = 'Join Waitlist';
        }
      });
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
    },
  });
}
