/**
 * GitHub API integration
 */

import { SignJWT, importPKCS8 } from 'jose';

/**
 * Generate installation access token
 */
export async function getInstallationToken(installationId, env) {
  const jwt = await generateJWT(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY);

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'FixCI-GitHub-App',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get installation token: ${error}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Generate GitHub App JWT for authentication
 */
async function generateJWT(appId, privateKeyPem) {
  // Remove header/footer and newlines from PEM (support both PRIVATE KEY and RSA PRIVATE KEY formats)
  const pemContents = privateKeyPem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, '')
    .replace(/-----END (RSA )?PRIVATE KEY-----/, '')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .trim();

  // Decode base64 to get the raw private key
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const now = Math.floor(Date.now() / 1000);

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 600) // 10 minutes
    .setIssuer(appId)
    .sign(privateKey);

  return jwt;
}

/**
 * Post a comment on a Pull Request
 */
export async function postPRComment(owner, repo, prNumber, body, token) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'FixCI-GitHub-App',
      },
      body: JSON.stringify({ body }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to post comment: ${error}`);
  }

  return await response.json();
}

/**
 * Fetch workflow run jobs and logs
 */
export async function getWorkflowJobs(owner, repo, runId, token) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'FixCI-GitHub-App',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch workflow jobs: ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetch logs for a specific job
 * Note: GitHub redirects to the actual log file, so we need to follow redirects
 */
export async function getJobLogs(owner, repo, jobId, token) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'FixCI-GitHub-App',
      },
      redirect: 'follow', // Follow redirects to get actual log content
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch job logs: ${response.status} - ${response.statusText}`);
  }

  // GitHub returns plain text logs after redirect
  return await response.text();
}

/**
 * Format analysis as GitHub-flavored markdown comment
 */
export function formatPRComment(analysis) {
  return `## 🔧 FixCI Analysis

**${analysis.issue_summary}**

### Root Cause
${analysis.root_cause}

### Suggested Fix
${analysis.suggested_fix}

${analysis.code_example ? `### Code Example
\`\`\`
${analysis.code_example}
\`\`\`
` : ''}

---
*Analysis confidence: ${Math.round(analysis.confidence_score * 100)}% | Model: ${analysis.model_used} | Processed in ${analysis.processing_time_ms}ms*

<sub>Powered by [FixCI](https://fixci.dev) - AI that explains why your pipeline broke</sub>`;
}
