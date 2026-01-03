/**
 * PR Code Review Module
 * Gemini-powered code review for pull requests
 */

import { analyzeWithGemini } from './providers/gemini.js';
import { getInstallationToken } from './github.js';

/**
 * Review a pull request with Gemini
 * @param {object} pullRequest - PR object from webhook
 * @param {object} repository - Repository object
 * @param {number} installationId - GitHub App installation ID
 * @param {object} env - Environment bindings
 * @returns {Promise<object>} Review result
 */
export async function reviewPullRequest(pullRequest, repository, installationId, env) {
  const startTime = Date.now();

  try {
    console.log(`Starting PR review #${pullRequest.number} in ${repository.full_name}`);

    // Get installation token for GitHub API
    const token = await getInstallationToken(installationId, env);

    // Fetch PR diff
    const diff = await getPRDiff(
      repository.owner.login,
      repository.name,
      pullRequest.number,
      token
    );

    // Fetch PR files
    const files = await getPRFiles(
      repository.owner.login,
      repository.name,
      pullRequest.number,
      token
    );

    console.log(`PR has ${files.length} changed files, diff size: ${diff.length} chars`);

    // Analyze the PR with Gemini
    const review = await analyzeWithGemini(diff, {
      prNumber: pullRequest.number,
      title: pullRequest.title,
      description: pullRequest.body || '',
      filesChanged: files.map(f => f.filename),
      additions: pullRequest.additions,
      deletions: pullRequest.deletions,
    }, env);

    // Parse review into actionable comments
    const comments = parseReviewComments(review.analysis, files);

    // Post review comments on PR
    if (comments.length > 0) {
      await postReviewComments(
        repository.owner.login,
        repository.name,
        pullRequest.number,
        comments,
        token
      );
    }

    // Post summary comment
    await postReviewSummary(
      repository.owner.login,
      repository.name,
      pullRequest.number,
      review,
      comments.length,
      token
    );

    const elapsed = Date.now() - startTime;
    console.log(`PR review #${pullRequest.number} completed in ${elapsed}ms`);

    return {
      success: true,
      commentsPosted: comments.length,
      processingTime: elapsed,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`PR review failed after ${elapsed}ms:`, error.message);
    throw error;
  }
}

/**
 * Fetch PR diff from GitHub
 */
async function getPRDiff(owner, repo, prNumber, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.diff',
      'User-Agent': 'FixCI-App',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PR diff: ${response.status}`);
  }

  return await response.text();
}

/**
 * Fetch PR files from GitHub
 */
async function getPRFiles(owner, repo, prNumber, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'FixCI-App',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PR files: ${response.status}`);
  }

  return await response.json();
}

/**
 * Parse Gemini's review into line-specific comments
 */
function parseReviewComments(analysis, files) {
  const comments = [];

  // Extract suggestions from the review
  // Format: "File: path/to/file.js, Line: 42, Issue: description"
  const suggestionPattern = /File:\s*([^\n,]+),\s*Line:\s*(\d+),\s*Issue:\s*([^\n]+)/gi;
  let match;

  const fullText = `${analysis.summary}\n${analysis.rootCause}\n${analysis.fix}`;

  while ((match = suggestionPattern.exec(fullText)) !== null) {
    const [, filePath, lineNumber, issue] = match;

    // Find the file in the PR
    const file = files.find(f => f.filename === filePath.trim());

    if (file) {
      comments.push({
        path: file.filename,
        line: parseInt(lineNumber),
        body: `🤖 **Gemini Code Review**\n\n${issue.trim()}`,
      });
    }
  }

  return comments;
}

/**
 * Post review comments on specific lines
 */
async function postReviewComments(owner, repo, prNumber, comments, token) {
  // Get the latest commit SHA
  const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
  const prResponse = await fetch(prUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'FixCI-App',
    },
  });

  const pr = await prResponse.json();
  const commitId = pr.head.sha;

  // Create a review with comments
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;

  const reviewBody = {
    commit_id: commitId,
    event: 'COMMENT',
    comments: comments.map(c => ({
      path: c.path,
      line: c.line,
      body: c.body,
    })),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'FixCI-App',
    },
    body: JSON.stringify(reviewBody),
  });

  if (!response.ok) {
    console.error('Failed to post review comments:', await response.text());
    throw new Error(`Failed to post review: ${response.status}`);
  }

  return await response.json();
}

/**
 * Post summary comment on PR
 */
async function postReviewSummary(owner, repo, prNumber, review, commentsCount, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;

  const summary = formatReviewSummary(review, commentsCount);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'FixCI-App',
    },
    body: JSON.stringify({ body: summary }),
  });

  if (!response.ok) {
    throw new Error(`Failed to post summary: ${response.status}`);
  }

  return await response.json();
}

/**
 * Format review summary for PR comment
 */
function formatReviewSummary(review, commentsCount) {
  const { analysis, processingTime, inputTokens, outputTokens, estimatedCost } = review;

  return `## 🤖 Gemini Code Review

### Summary
${analysis.summary || 'No major issues found in this PR.'}

### Analysis
${analysis.rootCause || 'The code changes look good overall.'}

### Suggestions
${analysis.fix || 'No specific suggestions at this time.'}

${analysis.codeExample ? `### Code Example\n\`\`\`\n${analysis.codeExample}\n\`\`\`\n` : ''}

---

${commentsCount > 0 ? `📝 Posted ${commentsCount} inline comment${commentsCount > 1 ? 's' : ''} on specific lines\n` : ''}
*Reviewed by Gemini 2.5 Flash-Lite*
*Processed in ${processingTime}ms • Tokens: ${inputTokens + outputTokens} • Cost: $${estimatedCost.toFixed(6)}*
`;
}
