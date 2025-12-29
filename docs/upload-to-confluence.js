#!/usr/bin/env node

/**
 * Upload FixCI documentation to Confluence
 *
 * Usage:
 *   node upload-to-confluence.js
 *
 * Environment variables required:
 *   CONFLUENCE_SITE_URL - Your Confluence site (e.g., https://yoursite.atlassian.net)
 *   CONFLUENCE_EMAIL - Your Confluence email
 *   CONFLUENCE_API_TOKEN - API token from https://id.atlassian.com/manage-profile/security/api-tokens
 *   CONFLUENCE_SPACE_KEY - Space key where docs will be created (e.g., FIXCI)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFLUENCE_SITE_URL = process.env.CONFLUENCE_SITE_URL;
const CONFLUENCE_EMAIL = process.env.CONFLUENCE_EMAIL;
const CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
const CONFLUENCE_SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY;

// Documentation files in order
const DOCS = [
  { file: '00-Home.md', title: 'FixCI Documentation', isParent: true },
  { file: '01-Overview.md', title: 'Overview' },
  { file: '02-Setup-Guide.md', title: 'Setup Guide' },
  { file: '03-AI-Providers.md', title: 'AI Providers Guide' },
  { file: '04-Database-Schema.md', title: 'Database Schema Reference' },
  { file: '05-API-Reference.md', title: 'API Reference' },
];

// Check environment variables
function checkEnvironment() {
  const missing = [];
  if (!CONFLUENCE_SITE_URL) missing.push('CONFLUENCE_SITE_URL');
  if (!CONFLUENCE_EMAIL) missing.push('CONFLUENCE_EMAIL');
  if (!CONFLUENCE_API_TOKEN) missing.push('CONFLUENCE_API_TOKEN');
  if (!CONFLUENCE_SPACE_KEY) missing.push('CONFLUENCE_SPACE_KEY');

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nSet them with:');
    console.error('export CONFLUENCE_SITE_URL=https://yoursite.atlassian.net');
    console.error('export CONFLUENCE_EMAIL=your@email.com');
    console.error('export CONFLUENCE_API_TOKEN=your-api-token');
    console.error('export CONFLUENCE_SPACE_KEY=FIXCI');
    console.error('\nGet API token from: https://id.atlassian.com/manage-profile/security/api-tokens');
    process.exit(1);
  }
}

// Convert markdown to Confluence storage format
function markdownToConfluence(markdown) {
  // This is a simplified conversion
  // For production, consider using a library like markdown-to-confluence

  let confluence = markdown;

  // Headers
  confluence = confluence.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  confluence = confluence.replace(/^## (.+)$/gm, '<h2>$2</h2>');
  confluence = confluence.replace(/^### (.+)$/gm, '<h3>$3</h3>');
  confluence = confluence.replace(/^#### (.+)$/gm, '<h4>$4</h4>');

  // Code blocks
  confluence = confluence.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">${lang || 'text'}</ac:parameter><ac:plain-text-body><![CDATA[${code}]]></ac:plain-text-body></ac:structured-macro>`;
  });

  // Inline code
  confluence = confluence.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  confluence = confluence.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  confluence = confluence.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  confluence = confluence.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Lists
  confluence = confluence.replace(/^- (.+)$/gm, '<li>$1</li>');
  confluence = confluence.replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>');

  // Paragraphs
  confluence = confluence.replace(/^(?!<[hula]|```|[-*]|\|)(.+)$/gm, '<p>$1</p>');

  return confluence;
}

// Create Confluence page
async function createPage(title, content, parentId = null) {
  const auth = Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`).toString('base64');

  const body = {
    type: 'page',
    title: title,
    space: { key: CONFLUENCE_SPACE_KEY },
    body: {
      storage: {
        value: content,
        representation: 'storage'
      }
    }
  };

  if (parentId) {
    body.ancestors = [{ id: parentId }];
  }

  try {
    const response = await fetch(`${CONFLUENCE_SITE_URL}/wiki/rest/api/content`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create page: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error creating page "${title}":`, error.message);
    throw error;
  }
}

// Check if page exists
async function findPage(title) {
  const auth = Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`).toString('base64');

  try {
    const response = await fetch(
      `${CONFLUENCE_SITE_URL}/wiki/rest/api/content?spaceKey=${CONFLUENCE_SPACE_KEY}&title=${encodeURIComponent(title)}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search: ${response.status}`);
    }

    const data = await response.json();
    return data.results.length > 0 ? data.results[0] : null;
  } catch (error) {
    console.error(`❌ Error finding page "${title}":`, error.message);
    return null;
  }
}

// Main upload function
async function uploadDocs() {
  console.log('🚀 Starting FixCI documentation upload to Confluence...\n');

  checkEnvironment();

  let parentPageId = null;

  for (const doc of DOCS) {
    const filePath = path.join(__dirname, 'confluence', doc.file);

    console.log(`📄 Processing ${doc.title}...`);

    // Read markdown file
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      continue;
    }

    const markdown = fs.readFileSync(filePath, 'utf-8');
    const confluence = markdownToConfluence(markdown);

    // Check if page already exists
    const existing = await findPage(doc.title);
    if (existing) {
      console.log(`   ⚠️  Page "${doc.title}" already exists (ID: ${existing.id})`);
      console.log(`   Visit: ${CONFLUENCE_SITE_URL}/wiki${existing._links.webui}`);

      if (doc.isParent) {
        parentPageId = existing.id;
      }
      continue;
    }

    // Create page
    try {
      const page = await createPage(
        doc.title,
        confluence,
        doc.isParent ? null : parentPageId
      );

      console.log(`   ✅ Created: ${CONFLUENCE_SITE_URL}/wiki${page._links.webui}`);

      if (doc.isParent) {
        parentPageId = page.id;
      }
    } catch (error) {
      console.error(`   ❌ Failed to create page`);
    }

    // Rate limiting - wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✨ Documentation upload complete!');
  console.log(`\n📖 View your docs: ${CONFLUENCE_SITE_URL}/wiki/spaces/${CONFLUENCE_SPACE_KEY}`);
}

// Run
uploadDocs().catch(error => {
  console.error('\n❌ Upload failed:', error);
  process.exit(1);
});
