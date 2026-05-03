# Infrastructure and Deployment Overview

* **Cloud Provider:** Vercel (Frontend/API/CMS) + Supabase (Database).

* **Infrastructure as Code:** Vercel Project Config (vercel.json where needed) + Payload Config.

* **Deployment Strategy:**
  * **Push to Main:** Triggers Vercel Production Build.
  * **Pull Request:** Triggers Vercel Preview Deployment (Ephemeral environments).

* **Environment Promotion:** Automated via Git flow (dev branch → Preview, main branch → Prod).

