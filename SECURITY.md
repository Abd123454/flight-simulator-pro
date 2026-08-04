# Security Policy

## Reporting Vulnerabilities
Report security issues via GitHub Issues (public repo, no sensitive data stored).

## Security Measures
- No user-uploaded content (no XSS surface)
- No API keys in client code
- localStorage stores only game progress (no PII)
- CSP-ready: X-Frame-Options, X-Content-Type-Options, Referrer-Policy headers set
- All external API calls use AbortController with timeout
