# Dependencies and lockfile

## Source of truth

- **`package-lock.json`** is the **source of truth** for resolved dependency versions in this repo. It is **committed** alongside `package.json`.
- Use **`npm ci`** in deploy pipelines and clean clones so installs match the lockfile exactly (see **`CONTRIBUTING.md`**).

For **local day-to-day** development, **`npm install`** is normal when you add or change dependencies (it updates **`package-lock.json`** when needed—always commit lockfile changes with the PR). For **clean, reproducible** installs that match the committed lockfile exactly—**deploy pipelines**, a **fresh clone**, or any environment that must not drift—use **`npm ci`** instead; it removes `node_modules` and installs from the lockfile and will error if `package.json` and the lockfile disagree.

## Audits and updates

- Run **`npm audit`** regularly to surface known vulnerabilities in the dependency tree.
- Apply **patch/minor** updates in normal PRs when low risk; treat **major** upgrades (frameworks, runtime-critical packages) as **dedicated PRs** with release notes review and full **lint / test / build** (per **`CONTRIBUTING.md`**).
- After changing dependencies, run **`npm run lint`**, **`npm test`**, and **`npm run build`** before merge.

## Scheduled / automated audit (your choice)

This repo does **not** ship a GitHub Actions audit workflow. Run **`npm audit`** on a cadence that fits your team (e.g. weekly), or wire **`npm audit --audit-level=high`** into **your** CI or cron. To capture machine-readable output: **`npm audit --audit-level=high --json > audit.json`** (inspect locally or upload from your pipeline).
