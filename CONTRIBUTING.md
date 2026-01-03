# Contributing to FixCI

Thank you for your interest in contributing to FixCI! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, browser, Node version, etc.)
- **Error messages** or logs

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When suggesting an enhancement:

- Use a **clear and descriptive title**
- Provide a **detailed description** of the proposed feature
- Explain **why this enhancement would be useful**
- Include **mockups or examples** if applicable

### Security Vulnerabilities

**Do not open public issues for security vulnerabilities.** Please see [SECURITY.md](SECURITY.md) for our responsible disclosure policy.

## Development Process

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/fixci-ai.git
cd fixci-ai
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Copy environment variables
cp docs/.env.example .env
# Edit .env with your credentials

# Set up Cloudflare Workers
npm install -g wrangler
wrangler login

# Create local D1 database
wrangler d1 create fixci-db-dev

# Run migrations
npm run migrate
```

### 3. Create a Branch

```bash
# Create a branch for your changes
git checkout -b feature/your-feature-name

# Or for bug fixes:
git checkout -b fix/issue-description
```

### 4. Make Your Changes

Follow our coding standards:

#### JavaScript/TypeScript Style
- Use **ES6+ features** (arrow functions, async/await, destructuring)
- Follow **functional programming** patterns where appropriate
- Use **meaningful variable names** (no single-letter variables except in loops)
- Add **JSDoc comments** for functions and complex logic
- Keep functions **small and focused** (single responsibility)

#### Security Best Practices
- **Always** use parameterized queries for database operations
- **Validate** all user inputs
- **Verify** authentication and authorization on protected endpoints
- **Never** log sensitive data (tokens, passwords, API keys)
- Use **rate limiting** on public endpoints

#### Code Example

```javascript
/**
 * Get user's installations with access verification
 * @param {number} userId - The user ID
 * @param {object} env - Environment bindings
 * @returns {Promise<Array>} List of installations
 */
async function getUserInstallations(userId, env) {
  // Validate input
  if (!userId || typeof userId !== 'number') {
    throw new Error('Invalid user ID');
  }

  // Use parameterized query
  const installations = await env.DB.prepare(`
    SELECT i.*, im.role
    FROM installations i
    JOIN installation_members im ON i.installation_id = im.installation_id
    WHERE im.user_id = ?
  `).bind(userId).all();

  return installations.results;
}
```

### 5. Test Your Changes

```bash
# Run local development server
npm run dev

# Test manually
# - Visit http://localhost:8787
# - Test affected functionality
# - Verify no console errors

# Run syntax checks
npm run lint
```

### 6. Commit Your Changes

We follow conventional commit messages:

```bash
# Format: <type>(<scope>): <description>

git commit -m "feat(auth): add OAuth login support"
git commit -m "fix(analyzer): handle empty log files"
git commit -m "docs(readme): update installation steps"
git commit -m "refactor(api): simplify subscription queries"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `security`: Security fixes

### 7. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# - Use a clear title describing the change
# - Reference any related issues (#123)
# - Describe what changed and why
# - Add screenshots for UI changes
```

## Pull Request Guidelines

### Before Submitting

- ✅ Code follows our style guidelines
- ✅ No console.log statements (use proper logging)
- ✅ Security best practices followed
- ✅ Changes tested locally
- ✅ Commit messages follow conventional format
- ✅ No merge conflicts with main branch

### PR Description Template

Your PR description should include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test this?

## Screenshots (if applicable)
Add screenshots here

## Related Issues
Fixes #123
```

### Review Process

1. **Automated Checks:** CI/CD runs automatically
2. **Code Review:** Maintainers review your code
3. **Feedback:** Address any requested changes
4. **Approval:** Once approved, maintainers will merge

## Project Structure

```
fixci/
├── packages/
│   └── github-app/          # Main GitHub App worker
│       ├── src/
│       │   ├── index.js     # Main entry point
│       │   ├── analyzer.js  # AI analysis logic
│       │   ├── auth.js      # Authentication
│       │   ├── admin.js     # Admin endpoints
│       │   └── providers/   # AI provider integrations
│       └── wrangler.toml    # Worker configuration
├── apps/
│   ├── landing/             # Landing page
│   └── dashboard/           # User dashboard
├── admin-v2/                # Admin panel (React)
├── migrations/              # Database migrations
├── docs/                    # Documentation
└── scripts/                 # Deployment scripts
```

## Adding New Features

### Adding a New AI Provider

1. Create `packages/github-app/src/providers/newprovider.js`
2. Implement the provider interface:
   ```javascript
   export async function analyzeWithNewProvider(prompt, env) {
     // Implementation
   }
   ```
3. Register in `analyzer.js`
4. Add configuration to tier configs
5. Update documentation

### Adding a New API Endpoint

1. Add endpoint in `packages/github-app/src/index.js`
2. **Always add authentication** if handling user data
3. Validate inputs
4. Use parameterized queries
5. Add to admin.js if it's an admin endpoint
6. Document in API docs

## Database Changes

```bash
# Create new migration
touch migrations/004-your-migration-name.sql

# Add SQL statements
# Run migration
npm run migrate
```

**Migration Guidelines:**
- Use `IF NOT EXISTS` for table creation
- Include rollback comments
- Test migrations on local database first

## Need Help?

- 💬 Join our [Discord community](https://discord.gg/fixci)
- 📧 Email: support@fixci.dev
- 📖 Read the [documentation](./docs/README.md)
- 🐛 Check [existing issues](https://github.com/fixci-ai/fixci-ai/issues)

## Recognition

Contributors will be:
- Listed in our contributors page
- Mentioned in release notes
- Given credit in relevant documentation

Thank you for contributing to FixCI! 🎉
