# Security

## Reporting a vulnerability

**Do not** open a public GitHub issue for an undisclosed security vulnerability.

Report security issues privately using one of these channels (maintainers: replace with real contact details):

- **Email:** `security@vestroo.example` (placeholder — replace with your security or engineering inbox), or
- **Private channel:** contact maintainers via your organisation’s agreed private channel (e.g. security mailing list, internal Slack, or vendor disclosure process).

Include enough detail to reproduce or assess impact (affected component, steps, versions if known). We aim to acknowledge receipt and coordinate remediation and disclosure timelines with you.

## Coordinated disclosure

**Coordinated disclosure** means we work with you in private: we confirm the issue, ship a fix, and agree on when details can be shared publicly (for example in release notes or a short advisory) so users can protect themselves without publishing a roadmap for attackers before a patch exists.

## Scope

- **This repository:** application source, configuration templates (e.g. `.env.example`), and documentation in this repo. Reports may cover code, dependencies, and documented deployment practices.
- **Hosted infrastructure:** production or staging systems (e.g. Vercel, Supabase, DNS, third-party APIs) are in scope for disclosure when they affect Vestroo’s deployment or data, but remediation may involve your hosting provider’s processes — we will coordinate as appropriate.

## Public issues

**Do not** use public issues to discuss undisclosed vulnerabilities. Use the private reporting path above. After a fix is released, coordinated public disclosure may follow per mutual agreement.
