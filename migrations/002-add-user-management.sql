-- User Management System Migration
-- Adds support for multi-user installations and magic link authentication

-- Users table: Email-based user accounts
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Installation members: Many-to-many relationship
-- Allows multiple users per installation and multiple installations per user
CREATE TABLE installation_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  installation_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member'
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (installation_id) REFERENCES installations(installation_id) ON DELETE CASCADE,
  UNIQUE(user_id, installation_id)
);

-- Session tokens: For magic link auth
CREATE TABLE auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_installation_members_user ON installation_members(user_id);
CREATE INDEX idx_installation_members_installation ON installation_members(installation_id);
CREATE INDEX idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
