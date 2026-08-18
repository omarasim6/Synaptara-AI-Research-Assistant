<div align="center">

<img src="Synaptara/public/icon.png" alt="Synaptara Logo" width="80" height="80" style="border-radius: 16px"/>

# Synaptara

### AI-Powered Research Assistant

**Search, summarise, and track the latest AI research all in one place.**

[Live Demo]() · [Report a Bug](https://github.com/omarasim6/Synaptara-AI-Research-Assistant/issues)

</div>

---

## What is Synaptara?

Synaptara is a full-stack AI research assistant that aggregates papers and findings from sources like **arXiv**, **PubMed**, **OpenAI**, and **DeepMind**; then uses AI to summarise, organise, and cite them for you. Stop spending hours searching through papers. ***Get the signal, not the noise***.

## Features

| Feature | Description |
|---|---|
| **AI-Powered Search** | Search across major AI and academic sources with AI-generated summaries and citations |
| **Sage Assistant** | Built-in AI chat widget ask anything about your research or the platform |
| **Research Dashboard** | Unified view of your searches, saved papers, reports, and alerts |
| **Paper Library** | Save and organise papers across topics for later reference |
| **Report Generation** | Auto-generate literature-review style reports from saved papers |
| **Research Alerts** | Set standing alerts on topics get notified when new papers match |
| **Weekly Digest** | Scheduled email digest of your alert activity (SMTP configurable) |
| **Subscription Billing** | Free, Pro, Scholar, and Institutional plans via Stripe |
| **Google OAuth + Email Auth** | Sign in with Google or traditional email/password |
| **Dark Mode** | Full light/dark theme support |
| **Fully Responsive** | Works on mobile, tablet, and desktop |

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2 | React framework with App Router |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
| NextAuth.js | 4.24 | Authentication (Google OAuth + credentials) |
| Stripe.js | 4.10 | Payment UI |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.111 | Async REST API |
| Alembic | 1.13 | Database migrations |
| PostgreSQL | 16 | Primary database |
| APScheduler | 3.10 | Weekly digest cron jobs |
| Stripe SDK | 9.12 | Billing & webhooks |
| python-jose | 3.3 | JWT authentication |
| Pydantic | 2.7 | Data validation & settings |

### AI Providers
| Provider | Description |
|---|---|
| **Ollama** (default) | Free, runs locally no API key needed. Uses `llama3.2:1b` |
| **OpenAI** | GPT with live web search grounding requires API key |
---
