export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve logo
    if (url.pathname === '/logo.svg' || url.pathname === '/logo.png') {
      return serveLogo();
    }

    // Serve favicon
    if (url.pathname === '/favicon.svg') {
      return serveLogo();
    }

    // Handle API requests
    if (url.pathname === '/api/waitlist' && request.method === 'POST') {
      return handleWaitlistSignup(request, env);
    }

    // Redirect to GitHub App installation
    if (url.pathname === '/install') {
      return Response.redirect(
        'https://github.com/apps/fixci-ai/installations/new',
        302
      );
    }

    // Post-installation success page
    if (url.pathname === '/installed') {
      return serveInstalledPage(url);
    }

    // Complete setup page (collect email after installation)
    if (url.pathname === '/complete-setup') {
      return serveCompleteSetupPage();
    }

    // Serve landing page
    return serveLandingPage();
  },
};

async function handleWaitlistSignup(request, env) {
  try {
    const { email, repository } = await request.json();

    if (!email || !isValidEmail(email)) {
      return jsonResponse({ error: 'Invalid email address' }, 400);
    }

    if (!repository || !repository.includes('github.com')) {
      return jsonResponse({ error: 'Invalid GitHub repository URL' }, 400);
    }

    await env.DB.prepare(
      'INSERT INTO waitlist (email, repository) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET repository = excluded.repository'
    ).bind(email, repository).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Waitlist signup error:', error);
    return jsonResponse({ error: 'Failed to save email' }, 500);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


function serveFavicon() {
  const svg = `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="60" cy="60" r="55" fill="#1a1d2e"/>
  
  <!-- Checkmark Icon -->
  <defs>
    <linearGradient id="checkGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5FFFB0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00D68F;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Checkmark shape centered -->
  <path d="M 35 60 L 52 77 L 85 40" 
        stroke="url(#checkGradientIcon)" 
        stroke-width="12" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        fill="none"/>
</svg>
`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}

function serveLogo() {
  const svg = `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Checkmark Icon with gradient -->
  <defs>
    <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5FFFB0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00D68F;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00ff88;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0066ff;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Checkmark -->
  <path d="M 10 30 L 20 40 L 40 15" 
        stroke="url(#checkGradient)" 
        stroke-width="6" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        fill="none"/>
  
  <!-- FixCI Text with gradient -->
  <text x="60" y="42" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="36" 
        font-weight="900" 
        fill="url(#textGradient)" 
        letter-spacing="-1">FixCI</text>
</svg>
`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
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

function serveInstalledPage(url) {
  const installation_id = url.searchParams.get('installation_id') || 'unknown';
  const setup_action = url.searchParams.get('setup_action') || 'install';

  // Redirect to complete-setup page to collect email
  if (installation_id !== 'unknown') {
    return Response.redirect(
      `https://fixci.dev/complete-setup?installation_id=${installation_id}`,
      302
    );
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FixCI Installed Successfully!</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Space Mono', monospace;
            background: #0a0e27;
            color: #e8e9f3;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 2rem;
        }
        .container {
            max-width: 700px;
            width: 100%;
            text-align: center;
        }
        .success-icon {
            font-size: 4rem;
            margin-bottom: 2rem;
            animation: bounce 1s ease;
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        h1 {
            font-family: 'Syne', sans-serif;
            font-size: clamp(2rem, 5vw, 2.5rem);
            font-weight: 800;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #00ff88 0%, #0066ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        p {
            font-size: clamp(0.95rem, 2vw, 1.1rem);
            color: #8b8fa8;
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        .installation-id {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.25rem;
            margin: 2rem 0;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
        }
        .installation-id code {
            font-family: 'Space Mono', monospace;
            color: #00ff88;
            font-size: 1rem;
            letter-spacing: 0.05em;
        }
        .copy-btn {
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid rgba(0, 255, 136, 0.3);
            color: #00ff88;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Space Mono', monospace;
            font-size: 0.85rem;
            font-weight: 700;
            transition: all 0.2s ease;
        }
        .copy-btn:hover {
            background: rgba(0, 255, 136, 0.2);
            transform: translateY(-1px);
        }
        .copy-btn.copied {
            background: rgba(0, 255, 136, 0.2);
            border-color: #00ff88;
        }
        .btn {
            display: inline-block;
            padding: 1rem 2rem;
            background: linear-gradient(135deg, #00ff88 0%, #0066ff 100%);
            color: #0a0e27;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 700;
            transition: all 0.3s ease;
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 40px rgba(0, 255, 136, 0.5);
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.03);
            color: #e8e9f3;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: none;
            margin-left: 1rem;
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: #00ff88;
            box-shadow: none;
        }
        .next-steps {
            margin-top: 3rem;
            padding: 2rem;
            background: rgba(0, 255, 136, 0.05);
            border: 1px solid rgba(0, 255, 136, 0.2);
            border-radius: 16px;
            text-align: left;
        }
        .next-steps h2 {
            font-family: 'Syne', sans-serif;
            font-size: 1.5rem;
            color: #00ff88;
            margin-bottom: 1.5rem;
        }
        .next-steps ol {
            margin-left: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .next-steps li {
            margin-bottom: 1rem;
            color: #e8e9f3;
            line-height: 1.6;
        }
        .help-links {
            display: flex;
            gap: 1rem;
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(0, 255, 136, 0.1);
            flex-wrap: wrap;
        }
        .help-link {
            color: #00ff88;
            text-decoration: none;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
        }
        .help-link:hover {
            color: #0066ff;
            text-decoration: underline;
        }
        @media (max-width: 768px) {
            .installation-id {
                flex-direction: column;
                text-align: center;
            }
            .btn-secondary {
                margin-left: 0;
                margin-top: 0.5rem;
            }
            .help-links {
                flex-direction: column;
                gap: 0.75rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1>FixCI is now active!</h1>
        <p>Your CI/CD failures will be automatically analyzed and explained in plain English. Comments will appear on your PRs within seconds of a failure.</p>

        <div class="installation-id">
            <div>
                <strong>Installation ID:</strong> <code>${installation_id}</code>
            </div>
            <button class="copy-btn" onclick="copyInstallationId()">Copy ID</button>
        </div>

        <div class="next-steps">
            <h2>What happens next?</h2>
            <ol>
                <li><strong>Push code or create a PR</strong> in your selected repositories</li>
                <li><strong>When a workflow fails</strong>, FixCI automatically analyzes the logs using AI</li>
                <li><strong>Get instant answers</strong> via a PR comment explaining the root cause and suggested fixes</li>
                <li><strong>View analysis details</strong> in the comment, including confidence scores and code examples</li>
            </ol>

            <div class="help-links">
                <a href="https://github.com/apps/fixci-ai" class="help-link" target="_blank">
                    ⚙️ Manage Repositories
                </a>
                <a href="https://fixci.dev" class="help-link" target="_blank">
                    📚 Documentation
                </a>
            </div>
        </div>

        <p style="margin-top: 2rem;">
            <a href="/" class="btn">← Back to FixCI</a>
            <a href="https://github.com" class="btn btn-secondary" target="_blank">Go to GitHub</a>
        </p>
    </div>

    <script>
        function copyInstallationId() {
            const id = '${installation_id}';
            navigator.clipboard.writeText(id).then(() => {
                const btn = document.querySelector('.copy-btn');
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('copied');
                }, 2000);
            });
        }
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
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
    <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #00ff88;
            --secondary: #0066ff;
            --dark: #0a0e27;
            --darker: #050810;
            --text: #e8e9f3;
            --text-dim: #8b8fa8;
            --error: #ff4757;
            --success: #00ff88;
            --card-bg: rgba(255, 255, 255, 0.03);
            --border: rgba(255, 255, 255, 0.1);
        }

        body {
            font-family: 'Space Mono', monospace;
            background: var(--darker);
            color: var(--text);
            line-height: 1.6;
            overflow-x: hidden;
        }

        /* Animated gradient background */
        .gradient-bg {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: -1;
            background:
                radial-gradient(circle at 20% 20%, rgba(0, 102, 255, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(0, 255, 136, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, rgba(255, 71, 87, 0.05) 0%, transparent 50%);
            animation: gradientShift 20s ease infinite;
        }

        @keyframes gradientShift {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }

        .noise-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            opacity: 0.03;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        nav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 100;
            padding: 1.5rem 2rem;
            backdrop-filter: blur(20px);
            background: rgba(10, 14, 39, 0.8);
            border-bottom: 1px solid var(--border);
        }

        .nav-content {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-family: 'Syne', sans-serif;
            font-size: 1.5rem;
            font-weight: 800;
            letter-spacing: -0.02em;
        }

        .logo img {
            height: 36px;
            width: auto;
            filter: brightness(1.2) contrast(1.1);
        }

        @media (min-width: 769px) {
            .logo img {
                height: 44px;
            }
        }

        @media (max-width: 768px) {
            .logo img {
                filter: brightness(1.3) contrast(1.2) drop-shadow(0 0 8px rgba(0, 255, 136, 0.3));
            }
        }

        .logo-text {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .nav-links {
            display: flex;
            align-items: center;
            gap: 2rem;
        }

        .nav-link {
            color: var(--text-dim);
            text-decoration: none;
            font-size: 0.95rem;
            font-weight: 400;
            transition: color 0.2s ease;
        }

        .nav-link:hover {
            color: var(--primary);
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 100px;
            font-size: 0.85rem;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--primary);
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        /* Hero Section */
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            padding-top: 100px;
            position: relative;
        }

        .hero-content {
            max-width: 1100px;
            animation: fadeInUp 1s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        h1 {
            font-family: 'Syne', sans-serif;
            font-size: clamp(2.5rem, 8vw, 6rem);
            font-weight: 800;
            line-height: 1.15;
            margin-bottom: 1.5rem;
            letter-spacing: -0.03em;
        }

        @media (min-width: 769px) {
            h1 {
                font-size: clamp(3.5rem, 6vw, 6rem);
                max-width: 1000px;
            }
        }

        .gradient-text {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            display: inline-block;
        }

        .hero-description {
            font-size: clamp(1rem, 2vw, 1.25rem);
            color: var(--text-dim);
            margin-bottom: 2.5rem;
            max-width: 600px;
        }

        .cta-group {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            margin-bottom: 2rem;
        }

        .btn {
            padding: 1rem 2rem;
            border-radius: 12px;
            font-family: 'Space Mono', monospace;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
            position: relative;
            overflow: hidden;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            color: var(--darker);
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 40px rgba(0, 255, 136, 0.5);
        }

        .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .btn-secondary {
            background: var(--card-bg);
            color: var(--text);
            border: 1px solid var(--border);
            backdrop-filter: blur(10px);
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: var(--primary);
        }

        .stats {
            display: flex;
            gap: 2rem;
            margin-top: 3rem;
            animation: fadeInUp 1s ease-out 0.3s backwards;
        }

        .stat {
            display: flex;
            flex-direction: column;
        }

        .stat-number {
            font-family: 'Syne', sans-serif;
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary);
        }

        .stat-label {
            font-size: 0.85rem;
            color: var(--text-dim);
        }

        /* Problem Section */
        .section {
            padding: 8rem 0;
            position: relative;
        }

        .section-header {
            text-align: center;
            margin-bottom: 4rem;
        }

        .section-tag {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 100px;
            font-size: 0.85rem;
            color: var(--primary);
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }

        h2 {
            font-family: 'Syne', sans-serif;
            font-size: clamp(2rem, 5vw, 3.5rem);
            font-weight: 800;
            margin-bottom: 1rem;
            letter-spacing: -0.02em;
        }

        .section-description {
            font-size: 1.1rem;
            color: var(--text-dim);
            max-width: 600px;
            margin: 0 auto;
        }

        /* Code Example Card */
        .code-comparison {
            display: grid;
            gap: 2rem;
            margin-top: 4rem;
        }

        .code-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 2rem;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .code-card:hover {
            border-color: var(--primary);
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.1);
        }

        .code-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
        }

        .code-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 0.9rem;
            color: var(--text-dim);
        }

        .status-icon {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }

        .status-error {
            background: var(--error);
            box-shadow: 0 0 10px var(--error);
        }

        .status-success {
            background: var(--success);
            box-shadow: 0 0 10px var(--success);
        }

        .code-content {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            padding: 1.5rem;
            font-size: 0.9rem;
            line-height: 1.8;
            overflow-x: auto;
        }

        .code-line {
            opacity: 0;
            animation: typeIn 0.5s ease forwards;
        }

        .code-line:nth-child(1) { animation-delay: 0.1s; }
        .code-line:nth-child(2) { animation-delay: 0.2s; }
        .code-line:nth-child(3) { animation-delay: 0.3s; }
        .code-line:nth-child(4) { animation-delay: 0.4s; }
        .code-line:nth-child(5) { animation-delay: 0.5s; }

        @keyframes typeIn {
            from {
                opacity: 0;
                transform: translateX(-10px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .error-text {
            color: var(--error);
        }

        .success-text {
            color: var(--success);
        }

        .dim-text {
            color: var(--text-dim);
        }

        /* Solution Card */
        .solution-card {
            background: linear-gradient(135deg, rgba(0, 255, 136, 0.05) 0%, rgba(0, 102, 255, 0.05) 100%);
            border: 1px solid rgba(0, 255, 136, 0.2);
        }

        .solution-content {
            margin-top: 1.5rem;
        }

        .solution-section {
            margin-bottom: 1.5rem;
        }

        .solution-label {
            color: var(--primary);
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        /* How It Works */
        .steps {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 4rem;
        }

        .step {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 2.5rem;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            position: relative;
        }

        .step:hover {
            transform: translateY(-5px);
            border-color: var(--primary);
            box-shadow: 0 10px 40px rgba(0, 255, 136, 0.1);
        }

        .step-number {
            font-family: 'Syne', sans-serif;
            font-size: 3rem;
            font-weight: 800;
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
        }

        .step h3 {
            font-family: 'Syne', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
        }

        .step p {
            color: var(--text-dim);
        }

        /* Integrations */
        .integrations-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1.5rem;
            margin-top: 3rem;
        }

        .integration-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }

        .integration-card:hover {
            border-color: var(--primary);
            transform: translateY(-3px);
        }

        .integration-icon {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }

        /* CTA Section */
        .cta-section {
            text-align: center;
            padding: 8rem 2rem;
            background: linear-gradient(135deg, rgba(0, 255, 136, 0.05) 0%, rgba(0, 102, 255, 0.05) 100%);
            border-radius: 24px;
            margin: 4rem 0;
        }

        .waitlist-form {
            max-width: 500px;
            margin: 2rem auto 0;
            display: flex;
            gap: 1rem;
        }

        .email-input {
            flex: 1;
            padding: 1rem 1.5rem;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: var(--text);
            font-family: 'Space Mono', monospace;
            font-size: 1rem;
            backdrop-filter: blur(10px);
        }

        .email-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
        }

        .email-input::placeholder {
            color: var(--text-dim);
        }

        /* Footer */
        footer {
            padding: 3rem 2rem;
            border-top: 1px solid var(--border);
            text-align: center;
            color: var(--text-dim);
        }

        /* Floating elements */
        .floating-element {
            position: absolute;
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 102, 255, 0.1) 100%);
            filter: blur(40px);
            animation: float 6s ease-in-out infinite;
        }

        .floating-element:nth-child(1) {
            top: 20%;
            left: 10%;
            animation-delay: 0s;
        }

        .floating-element:nth-child(2) {
            top: 60%;
            right: 10%;
            animation-delay: 2s;
        }

        @keyframes float {
            0%, 100% {
                transform: translateY(0px);
            }
            50% {
                transform: translateY(-20px);
            }
        }

        /* Responsive */
        @media (max-width: 768px) {
            nav {
                padding: 1rem;
            }

            .hero {
                padding-top: 80px;
            }

            h1 {
                font-size: 2.5rem;
            }

            .cta-group {
                flex-direction: column;
            }

            .btn {
                width: 100%;
            }

            .stats {
                flex-direction: column;
                gap: 1rem;
            }

            .section {
                padding: 4rem 0;
            }

            .waitlist-form {
                flex-direction: column;
            }

            .steps {
                grid-template-columns: 1fr;
            }
        }

        /* Scroll reveal animation */
        .reveal {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }

        .reveal.active {
            opacity: 1;
            transform: translateY(0);
        }

        /* Message styles */
        .message {
            display: none;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            margin-top: 1rem;
            font-size: 0.9rem;
        }

        .message.show {
            display: block;
        }

        .message.success {
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid var(--success);
            color: var(--success);
        }

        .message.error {
            background: rgba(255, 71, 87, 0.1);
            border: 1px solid var(--error);
            color: var(--error);
        }
    </style>
</head>
<body>
    <div class="gradient-bg"></div>
    <div class="noise-overlay"></div>

    <nav>
        <div class="nav-content">
            <div class="logo">
                <img src="/logo.svg" alt="FixCI Logo">
            </div>
            <div class="nav-links">
                <a href="https://github.com/fixci-ai/docs" class="nav-link" target="_blank">Docs</a>
                <div class="status-badge">
                    <span class="status-dot"></span>
                    Coming Soon
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="floating-element"></div>
        <div class="floating-element"></div>
        <div class="container">
            <div class="hero-content">
                <h1>
                    AI that explains <span class="gradient-text">why your pipeline broke</span>
                </h1>
                <p class="hero-description">
                    Stop scrolling through cryptic build logs. FixCI analyzes CI/CD failures and tells you what went wrong — in plain English.
                </p>
                <div class="cta-group">
                    <a href="/install" class="btn btn-primary" style="text-decoration: none; display: inline-block;">Add to GitHub</a>
                    <button class="btn btn-secondary" onclick="scrollToWaitlist()">Join Waitlist</button>
                </div>
                <div class="stats">
                    <div class="stat">
                        <div class="stat-number">500+</div>
                        <div class="stat-label">Developers waiting</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">3min</div>
                        <div class="stat-label">Average debug time</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">100%</div>
                        <div class="stat-label">Free tier</div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Problem Section -->
    <section class="section">
        <div class="container">
            <div class="section-header reveal">
                <div class="section-tag">The Problem</div>
                <h2>CI failures waste <span class="gradient-text">hours</span> of your time</h2>
                <p class="section-description">
                    Your build failed. Now you're scrolling through 500 lines of logs, searching Stack Overflow, and context-switching away from actual work.
                </p>
            </div>

            <div class="code-comparison">
                <div class="code-card reveal">
                    <div class="code-header">
                        <div class="code-title">
                            <span class="status-icon status-error"></span>
                            GitHub Actions — build failed
                        </div>
                    </div>
                    <div class="code-content">
                        <div class="code-line dim-text">Run npm test</div>
                        <div class="code-line"></div>
                        <div class="code-line error-text">FAIL src/components/Auth.test.tsx</div>
                        <div class="code-line">  Auth › should redirect after login</div>
                        <div class="code-line error-text">  TypeError: Cannot read properties of undefined (reading 'push')</div>
                        <div class="code-line dim-text">    at Object.&lt;anonymous&gt; (src/components/Auth.test.tsx:42:18)</div>
                        <div class="code-line dim-text">    at Promise.then.completed (node_modules/jest/build/jest.js:123:45)</div>
                        <div class="code-line"></div>
                        <div class="code-line error-text">Error: Process completed with exit code 1.</div>
                    </div>
                </div>

                <div class="code-card solution-card reveal">
                    <div class="code-header">
                        <div class="code-title">
                            <span class="status-icon status-success"></span>
                            🔧 FixCI Analysis
                        </div>
                    </div>
                    <div class="solution-content">
                        <div class="solution-section">
                            <div class="solution-label">Issue:</div>
                            <p>The test is failing because <code>useNavigate()</code> returns undefined in the test environment. This happens when the component isn't wrapped in a Router context during testing.</p>
                        </div>
                        <div class="solution-section">
                            <div class="solution-label">Fix:</div>
                            <p>Wrap your test component with <code>&lt;MemoryRouter&gt;</code> from react-router-dom in your test setup.</p>
                        </div>
                        <div class="solution-section">
                            <div class="solution-label">Code Example:</div>
                            <div class="code-content">
                                <div class="code-line success-text">import { MemoryRouter } from 'react-router-dom';</div>
                                <div class="code-line"></div>
                                <div class="code-line">render(</div>
                                <div class="code-line">  &lt;MemoryRouter&gt;</div>
                                <div class="code-line">    &lt;Auth /&gt;</div>
                                <div class="code-line">  &lt;/MemoryRouter&gt;</div>
                                <div class="code-line">);</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- How It Works -->
    <section class="section">
        <div class="container">
            <div class="section-header reveal">
                <div class="section-tag">How It Works</div>
                <h2>Three steps to <span class="gradient-text">faster debugging</span></h2>
            </div>

            <div class="steps">
                <div class="step reveal">
                    <div class="step-number">01</div>
                    <h3>Connect your repo</h3>
                    <p>Install the GitHub App with one click. Works with GitHub Actions, GitLab CI, CircleCI, and more.</p>
                </div>

                <div class="step reveal">
                    <div class="step-number">02</div>
                    <h3>Pipeline fails</h3>
                    <p>FixCI automatically detects failures and analyzes the logs using advanced AI models.</p>
                </div>

                <div class="step reveal">
                    <div class="step-number">03</div>
                    <h3>Get instant answers</h3>
                    <p>Receive a Slack message or PR comment explaining the issue and how to fix it — in seconds.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Integrations -->
    <section class="section">
        <div class="container">
            <div class="section-header reveal">
                <div class="section-tag">Integrations</div>
                <h2>Works with your <span class="gradient-text">existing tools</span></h2>
            </div>

            <div class="integrations-grid">
                <div class="integration-card reveal">
                    <div class="integration-icon">⚡</div>
                    <div>GitHub Actions</div>
                </div>
                <div class="integration-card reveal">
                    <div class="integration-icon">🦊</div>
                    <div>GitLab CI</div>
                </div>
                <div class="integration-card reveal">
                    <div class="integration-icon">🔵</div>
                    <div>CircleCI</div>
                </div>
                <div class="integration-card reveal">
                    <div class="integration-icon">💬</div>
                    <div>Slack</div>
                </div>
                <div class="integration-card reveal">
                    <div class="integration-icon">📧</div>
                    <div>Email</div>
                </div>
                <div class="integration-card reveal">
                    <div class="integration-icon">🔔</div>
                    <div>Discord</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Final CTA -->
    <section class="section">
        <div class="container">
            <div class="cta-section reveal">
                <h2>Ship faster. <span class="gradient-text">Debug less.</span></h2>
                <p class="section-description" style="margin-top: 1rem;">
                    Join the waitlist and be first to try FixCI when we launch.
                </p>
                <form class="waitlist-form" id="waitlist-form">
                    <input type="email" class="email-input" placeholder="your@email.com" required id="email-input">
                    <input type="url" class="email-input" placeholder="https://github.com/yourname/your-repo" required id="repo-input" style="margin-top: 0.75rem;">
                    <button type="submit" class="btn btn-primary">Join Waitlist</button>
                </form>
                <p style="font-size: 0.85rem; color: var(--text-dim); margin-top: 0.75rem;">
                    Enter the GitHub repository where you want FixCI to analyze CI failures.
                </p>
                <div class="message success" id="success-message">
                    You're on the list! We'll notify you when FixCI launches.
                </div>
                <div class="message error" id="error-message"></div>
                <p style="font-size: 0.85rem; color: var(--text-dim); margin-top: 1rem;">
                    Free tier available. No spam, ever.
                </p>
            </div>
        </div>
    </section>

    <footer>
        <div class="container">
            © 2025 FixCI. Built for developers who hate debugging CI.
        </div>
    </footer>

    <script>
        // Scroll reveal animation
        const reveals = document.querySelectorAll('.reveal');

        const revealOnScroll = () => {
            reveals.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const windowHeight = window.innerHeight;

                if (elementTop < windowHeight - 100) {
                    element.classList.add('active');
                }
            });
        };

        window.addEventListener('scroll', revealOnScroll);
        revealOnScroll(); // Initial check

        // Scroll to waitlist function
        function scrollToWaitlist() {
            document.querySelector('.cta-section').scrollIntoView({
                behavior: 'smooth'
            });
        }

        // Form submission
        document.getElementById('waitlist-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email-input').value;
            const repository = document.getElementById('repo-input').value;
            const button = e.target.querySelector('button');
            const successEl = document.getElementById('success-message');
            const errorEl = document.getElementById('error-message');
            const form = document.getElementById('waitlist-form');

            button.disabled = true;
            button.textContent = 'Joining...';
            errorEl.classList.remove('show');
            successEl.classList.remove('show');

            try {
                const res = await fetch('/api/waitlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, repository })
                });

                const data = await res.json();

                if (res.ok) {
                    form.style.display = 'none';
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
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
    },
  });
}


function serveCompleteSetupPage() {
  return new Response(completeSetupHTML, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "no-cache"
    }
  });
}

const completeSetupHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Setup - FixCI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .container {
            max-width: 500px;
            width: 100%;
            background: #1e293b;
            border-radius: 16px;
            padding: 2.5rem;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            border: 1px solid #334155;
        }

        .logo {
            text-align: center;
            margin-bottom: 2rem;
        }

        .logo h1 {
            color: #10b981;
            font-size: 2rem;
            font-weight: 700;
        }

        .success-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 1.5rem;
            background: #10b98120;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .success-icon svg {
            width: 32px;
            height: 32px;
            color: #10b981;
        }

        h2 {
            color: #f1f5f9;
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            text-align: center;
        }

        .subtitle {
            color: #94a3b8;
            text-align: center;
            margin-bottom: 2rem;
            font-size: 0.95rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        label {
            display: block;
            color: #cbd5e1;
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }

        input {
            width: 100%;
            padding: 0.875rem;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            color: #e2e8f0;
            font-size: 1rem;
            transition: border-color 0.2s;
        }

        input:focus {
            outline: none;
            border-color: #10b981;
        }

        button {
            width: 100%;
            padding: 1rem;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.2s;
        }

        button:hover {
            background: #059669;
        }

        button:disabled {
            background: #334155;
            cursor: not-allowed;
        }

        .message {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }

        .message.success {
            background: #10b98120;
            border: 1px solid #10b981;
            color: #10b981;
        }

        .message.error {
            background: #ef444420;
            border: 1px solid #ef4444;
            color: #ef4444;
        }

        .note {
            margin-top: 1.5rem;
            padding: 1rem;
            background: #0f172a;
            border-left: 3px solid #10b981;
            border-radius: 4px;
            font-size: 0.85rem;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>FixCI</h1>
        </div>

        <div id="form-container">
            <div class="success-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>

            <h2>Installation Successful!</h2>
            <p class="subtitle">One last step to complete your setup</p>

            <div id="message-container"></div>

            <form id="setup-form">
                <div class="form-group">
                    <label for="email">Email Address *</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="you@company.com"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="company">Company/Organization (optional)</label>
                    <input
                        type="text"
                        id="company"
                        name="company"
                        placeholder="Acme Inc"
                    >
                </div>

                <button type="submit" id="submit-btn">Complete Setup</button>
            </form>

            <div class="note">
                <strong>Why we need this:</strong><br>
                We'll use your email to send you important updates about your FixCI subscription, usage alerts, and feature announcements.
            </div>
        </div>

        <div id="success-container" style="display: none;">
            <div class="success-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>

            <h2>Check Your Email!</h2>
            <p class="subtitle">We've sent you a magic link to access your dashboard</p>

            <div class="message success" id="success-message">
                Check your email for a login link to access your dashboard
            </div>

            <div class="note">
                <strong>Next steps:</strong><br>
                1. Check your email inbox for the magic link<br>
                2. Click the link to access your FixCI dashboard<br>
                3. View your installations and usage statistics<br>
                4. Push code and let FixCI analyze any failed workflows
            </div>

            <button onclick="window.close()">Close Window</button>
        </div>
    </div>

    <script>
        const urlParams = new URLSearchParams(window.location.search);
        const installationId = urlParams.get('installation_id');

        if (!installationId) {
            document.getElementById('message-container').innerHTML =
                '<div class="message error">Missing installation ID. Please try installing the app again.</div>';
            document.getElementById('setup-form').style.display = 'none';
        }

        document.getElementById('setup-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const company = document.getElementById('company').value;
            const submitBtn = document.getElementById('submit-btn');
            const messageContainer = document.getElementById('message-container');

            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
            messageContainer.innerHTML = '';

            try {
                const response = await fetch('https://api.fixci.dev/api/complete-setup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        installationId: parseInt(installationId),
                        email,
                        company
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to save information');
                }

                // Update success message
                document.getElementById('success-message').textContent = data.message;

                // Show success view
                document.getElementById('form-container').style.display = 'none';
                document.getElementById('success-container').style.display = 'block';

            } catch (error) {
                messageContainer.innerHTML = '<div class="message error">' + error.message + '</div>';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Complete Setup';
            }
        });
    </script>
</body>
</html>
`;
