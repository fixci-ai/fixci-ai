# 🔧 FixCI - AI that explains why your pipeline broke

Stop scrolling through cryptic build logs. FixCI analyzes CI/CD failures and tells you what went wrong — in plain English.

[![Install FixCI](https://img.shields.io/badge/Install_on-GitHub-00ff88?style=for-the-badge&logo=github)](https://github.com/apps/fixci-ai/installations/new)
[![Website](https://img.shields.io/badge/Website-fixci.dev-0066ff?style=for-the-badge)](https://fixci.dev)

---

## ✨ Features

- 🤖 **AI-Powered Analysis** - Understands build logs and explains errors in plain English
- ⚡ **Instant Feedback** - Comments appear on your PRs within seconds
- 🎯 **Root Cause Detection** - Identifies what actually broke, not just symptoms
- 💡 **Suggested Fixes** - Get actionable solutions with code examples
- 🆓 **100% Free** - Unlimited repos, unlimited analyses during beta

---

## 🚀 Quick Start

### 1. Install the App

```bash
# Visit the installation page:
https://github.com/apps/fixci-ai/installations/new

# Or click the "Install" badge above ☝️
```

### 2. Select Repositories

Choose which repos you want FixCI to monitor (all repos or specific ones)

### 3. Done! ✅

That's it. FixCI will now analyze failed workflows and comment on your PRs.

---

## 📊 Example

**Before FixCI:**
```
Error: Process completed with exit code 1.
TypeError: Cannot read properties of undefined (reading 'push')
  at Object.<anonymous> (src/components/Auth.test.tsx:42:18)
  ...500 more lines of logs...
```

**With FixCI:**
> ## 🔧 FixCI Analysis
>
> **The test is failing because `useNavigate()` returns undefined in the test environment.**
>
> ### Root Cause
> This happens when the component isn't wrapped in a Router context during testing.
>
> ### Fix
> Wrap your test component with `<MemoryRouter>` from react-router-dom:
>
> ```javascript
> import { MemoryRouter } from 'react-router-dom';
>
> render(
>   <MemoryRouter>
>     <Auth />
>   </MemoryRouter>
> );
> ```

---

## 🛠️ Supported CI/CD Platforms

- ✅ GitHub Actions (fully supported)
- 🔜 GitLab CI (coming soon)
- 🔜 CircleCI (coming soon)
- 🔜 Jenkins (coming soon)

---

## 📚 Documentation

- [Installation Guide](https://fixci.dev/docs/installation)
- [Troubleshooting](https://fixci.dev/docs/troubleshooting)
- [FAQ](https://fixci.dev/docs/faq)

---

## 🤝 Contributing

FixCI is currently in private beta. Interested in contributing? Reach out!

---

## 📧 Support

- **Website:** https://fixci.dev
- **Email:** support@fixci.dev
- **Issues:** Open an issue on any FixCI repository

---

## 📊 Stats

- 🔥 **Analyses:** 40+ and counting
- ⚡ **Avg Response:** < 3 seconds
- 🎯 **Accuracy:** 90%+ confidence scores

---

**Built with ❤️ for developers who hate debugging CI/CD**
