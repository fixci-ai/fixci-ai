-- FixCI Database Schema

-- Repositories using FixCI
CREATE TABLE IF NOT EXISTS repositories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_repo_id INTEGER UNIQUE NOT NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  installation_id INTEGER,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_repositories_github_id ON repositories(github_repo_id);
CREATE INDEX IF NOT EXISTS idx_repositories_full_name ON repositories(full_name);

-- CI Failure Analyses
CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL,

  -- GitHub workflow info
  workflow_run_id INTEGER NOT NULL,
  workflow_name TEXT,
  job_name TEXT,
  commit_sha TEXT,
  branch TEXT,
  pull_request_number INTEGER,

  -- Failure details
  log_url TEXT,
  failure_type TEXT, -- 'test', 'build', 'lint', 'deploy', etc
  error_message TEXT,

  -- AI Analysis
  analysis_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  ai_provider TEXT, -- 'cloudflare', 'claude', 'openai', 'gemini'
  model_used TEXT, -- 'llama-3.1-8b', 'claude-haiku', 'gpt-4o-mini', 'gemini-flash-lite'
  issue_summary TEXT,
  root_cause TEXT,
  suggested_fix TEXT,
  code_example TEXT,
  confidence_score REAL, -- 0-1

  -- Processing metadata
  processing_time_ms INTEGER,
  token_count INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_usd REAL, -- Cost in USD for this analysis
  error_log TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  analyzed_at TEXT,
  posted_at TEXT,

  FOREIGN KEY (repo_id) REFERENCES repositories(id)
);

CREATE INDEX IF NOT EXISTS idx_analyses_repo ON analyses(repo_id);
CREATE INDEX IF NOT EXISTS idx_analyses_workflow_run ON analyses(workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(analysis_status);
CREATE INDEX IF NOT EXISTS idx_analyses_pr ON analyses(pull_request_number);
CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at);

-- GitHub App Installations
CREATE TABLE IF NOT EXISTS installations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  installation_id INTEGER UNIQUE NOT NULL,
  account_type TEXT, -- 'User' or 'Organization'
  account_login TEXT,
  target_id INTEGER,
  is_active BOOLEAN DEFAULT 1,
  permissions TEXT, -- JSON blob
  events TEXT, -- JSON blob of subscribed events
  contact_email TEXT,
  company_name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_installations_id ON installations(installation_id);

-- Usage tracking for rate limiting / billing
CREATE TABLE IF NOT EXISTS usage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER,
  date TEXT NOT NULL, -- YYYY-MM-DD
  analyses_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (repo_id) REFERENCES repositories(id),
  UNIQUE(repo_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_usage_repo_date ON usage_stats(repo_id, date);
