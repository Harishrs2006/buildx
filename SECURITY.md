# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| main    | ✅ |
| develop | ✅ |
| older   | ❌ |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues by opening a **[GitHub Security Advisory](https://github.com/Harishrs2006/buildx/security/advisories/new)** (private disclosure).

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

You will receive a response within **48 hours**. We will work with you to understand and resolve the issue before any public disclosure.

## Scope

In scope:
- SQL injection, XSS, CSRF
- Authentication/authorization bypass
- Data exposure (PII, financial data)
- API rate limiting bypass
- Dependency vulnerabilities with direct impact

Out of scope:
- Social engineering
- Physical attacks
- Issues in third-party services (Clerk, Cloudinary, OpenAI)
