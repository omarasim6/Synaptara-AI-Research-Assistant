<div align="center">

<img src="Synaptara/public/icon.png" alt="Synaptara Logo" width="80" height="80" style="border-radius: 16px"/>

# Synaptara

### AI-Powered Research Assistant

**Search, summarise, and track the latest AI research — all in one place.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Live Demo](https://synaptara.vercel.app) · [API Docs](https://synaptara-backend.up.railway.app/docs) · [Report a Bug](https://github.com/omarasim6/Synaptara-AI-Research-Assistant/issues) · [Request a Feature](https://github.com/omarasim6/Synaptara-AI-Research-Assistant/issues)

</div>

---

## What is Synaptara?

Synaptara is a full-stack AI research assistant that aggregates papers and findings from sources like **arXiv**, **PubMed**, **OpenAI**, and **DeepMind** — then uses AI to summarise, organise, and cite them for you. Stop spending hours trawling through papers. Get the signal, not the noise.

---

## Features

| Feature | Description |
|---|---|
| **AI-Powered Search** | Search across major AI and academic sources with AI-generated summaries and citations |
| **Sage Assistant** | Built-in AI chat widget — ask anything about your research or the platform |
| **Research Dashboard** | Unified view of your searches, saved papers, reports, and alerts |
| **Paper Library** | Save and organise papers across topics for later reference |
| **Report Generation** | Auto-generate literature-review style reports from saved papers |
| **Research Alerts** | Set standing alerts on topics — get notified when new papers match |
| **Weekly Digest** | Scheduled email digest of your alert activity (SMTP configurable) |
| **Subscription Billing** | Free, Pro, Scholar, and Institutional plans via Stripe |
| **Google OAuth + Email Auth** | Sign in with Google or traditional email/password |
| **Dark Mode** | Full light/dark theme support |
| **Fully Responsive** | Works on mobile, tablet, and desktop |

---

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
| SQLAlchemy | 2.0 | Async ORM |
| Alembic | 1.13 | Database migrations |
| PostgreSQL | 16 | Primary database |
| AsyncPG | 0.29 | Async PostgreSQL driver |
| APScheduler | 3.10 | Weekly digest cron jobs |
| Stripe SDK | 9.12 | Billing & webhooks |
| python-jose | 3.3 | JWT authentication |
| Pydantic | 2.7 | Data validation & settings |

### AI Providers (switchable)
| Provider | Description |
|---|---|
| **Ollama** (default) | Free, runs locally — no API key needed. Uses `llama3.2:1b` |
| **OpenAI** | GPT with live web search grounding — requires API key |

### Infrastructure
| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Local development environment |
| Vercel | Frontend deployment |
| Railway | Backend + database deployment |

---

## Project Structure

```
Synaptara/
├── Synaptara/                      # Next.js 14 frontend
│   ├── app/
│   │   ├── api/                    # API routes (NextAuth, register)
│   │   ├── checkout/[plan]/        # Stripe checkout flow
│   │   ├── components/             # Shared UI components
│   │   │   └── assistant/          # Sage AI chat widget
│   │   ├── dashboard/              # Main dashboard page
│   │   ├── legal/                  # Privacy, Terms, Cookies pages
│   │   ├── pricing/                # Pricing page
│   │   ├── profile/                # Profile & account settings
│   │   ├── reports/                # Report viewer
│   │   ├── search/                 # Search interface
│   │   ├── signin/ & signup/       # Auth pages
│   │   └── support/                # Help & support centre
│   ├── lib/                        # API client, auth options, plans
│   ├── providers/                  # React context providers
│   └── public/                     # Static assets
│
├── synaptara-backend/              # FastAPI backend
│   ├── app/
│   │   ├── core/                   # Auth dependencies & security
│   │   ├── knowledge/              # Synaptara knowledge base (for Sage)
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── routers/                # API route handlers
│   │   │   ├── auth.py             # Register, login, JWT
│   │   │   ├── search.py           # Search + history
│   │   │   ├── papers.py           # Paper library
│   │   │   ├── reports.py          # Report generation
│   │   │   ├── alerts.py           # Research alerts
│   │   │   ├── dashboard.py        # Dashboard stats
│   │   │   ├── billing.py          # Stripe billing & webhooks
│   │   │   ├── payment_methods.py  # Card management
│   │   │   └── assistant.py        # Sage AI chat
│   │   ├── schemas/                # Pydantic request/response models
│   │   ├── services/               # Business logic
│   │   │   ├── search_service.py   # AI search (Ollama / OpenAI)
│   │   │   ├── assistant_service.py# Sage chat logic
│   │   │   ├── stripe_service.py   # Stripe integration
│   │   │   ├── email_service.py    # SMTP email sender
│   │   │   ├── digest_service.py   # Weekly digest builder
│   │   │   └── scheduler.py        # APScheduler cron jobs
│   │   ├── config.py               # Pydantic settings
│   │   ├── database.py             # Async engine & session
│   │   └── main.py                 # App entry point + lifespan
│   └── alembic/                    # Database migration history
│
└── docker-compose.yml              # Full local stack
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the backend)
- [Node.js 18+](https://nodejs.org/) (for the frontend)
- A [Stripe](https://stripe.com) account (test mode is fine)
- A [Google Cloud](https://console.cloud.google.com) project with OAuth 2.0 credentials

---

### 1. Clone the repository

```bash
git clone https://github.com/omarasim6/Synaptara-AI-Research-Assistant.git
cd Synaptara-AI-Research-Assistant
```

---

### 2. Configure the backend

```bash
cd synaptara-backend
copy .env.example .env      # Windows
# cp .env.example .env      # Mac/Linux
```

Open `.env` and fill in the required values:

```env
# Required
SECRET_KEY=your-random-hex-32-chars
BACKEND_API_KEY=your-internal-api-key

# AI Provider — choose one
AI_PROVIDER=ollama              # Free, local (default)
# AI_PROVIDER=openai            # Requires key below
OPENAI_API_KEY=sk-...

# Stripe (test mode keys from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (optional — logs only if left blank)
SMTP_HOST=
SMTP_USERNAME=
SMTP_PASSWORD=
```

> **Generate a secret key (Windows PowerShell):**
> ```powershell
> -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
> ```

---

### 3. Start the backend

```bash
docker compose up --build
```

Wait for `Application startup complete.` — the API is now live at `http://localhost:8000`

> Migrations run automatically on startup. No manual `alembic upgrade head` needed.

---

### 4. Configure the frontend

```bash
cd ../Synaptara
copy .env.local.example .env.local      # Windows
# cp .env.local.example .env.local      # Mac/Linux
```

Open `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-base64-string
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

> **Generate NEXTAUTH_SECRET (Windows PowerShell):**
> ```powershell
> [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) }))
> ```

> **Google OAuth setup:** Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID → add `http://localhost:3000/api/auth/callback/google` as the authorised redirect URI.

---

### 5. Start the frontend

```bash
npm install
npm run dev
```

---

### You're running ✓

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

---

## Deployment

Synaptara is deployed using **Vercel** (frontend) and **Railway** (backend + PostgreSQL).

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → Import `Synaptara-AI-Research-Assistant`
2. Set **Root Directory** to `Synaptara`
3. Add environment variables (same as `.env.local` but with production URLs)
4. Deploy

### Backend → Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select `Synaptara-AI-Research-Assistant`, set **Root Directory** to `synaptara-backend`
3. Add a **PostgreSQL** database plugin — `DATABASE_URL` is injected automatically
4. Add your environment variables
5. Deploy — Railway runs `alembic upgrade head` automatically on start

### Stripe Webhooks (production)

Add this endpoint in your Stripe dashboard:
```
https://your-railway-url.up.railway.app/api/v1/billing/webhook
```

Required events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

---

## API Reference

Full interactive docs available at `/docs` (Swagger UI) and `/redoc` (ReDoc) when the backend is running.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Create a new account |
| `POST` | `/api/v1/auth/login` | Get JWT access token |
| `GET` | `/api/v1/search` | Run a research search |
| `GET` | `/api/v1/search/history` | Get search history |
| `GET` | `/api/v1/papers` | Get saved paper library |
| `POST` | `/api/v1/papers` | Save a paper |
| `GET` | `/api/v1/reports` | List generated reports |
| `POST` | `/api/v1/reports` | Generate a new report |
| `GET` | `/api/v1/alerts` | List research alerts |
| `POST` | `/api/v1/alerts` | Create a new alert |
| `GET` | `/api/v1/dashboard` | Get dashboard stats |
| `POST` | `/api/v1/assistant/chat` | Chat with Sage AI |
| `POST` | `/api/v1/billing/checkout` | Create Stripe checkout session |
| `POST` | `/api/v1/billing/webhook` | Handle Stripe webhook events |
| `GET` | `/api/v1/payment-methods` | List saved payment methods |
| `GET` | `/health` | Health check |

---

## Environment Variables Reference

### Backend (`synaptara-backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | JWT signing key (32-char hex) |
| `BACKEND_API_KEY` | ✅ | Internal key for Next.js → FastAPI calls |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins |
| `AI_PROVIDER` | ✅ | `ollama` or `openai` |
| `OPENAI_API_KEY` | If OpenAI | OpenAI API key |
| `OPENAI_MODEL` | No | Default: `gpt-5-mini` |
| `OLLAMA_BASE_URL` | If Ollama | Default: `http://host.docker.internal:11434` |
| `OLLAMA_MODEL` | No | Default: `llama3.2:1b` |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | For billing | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `SMTP_HOST` | For email | SMTP server host |
| `SMTP_USERNAME` | For email | SMTP username |
| `SMTP_PASSWORD` | For email | SMTP password |

### Frontend (`Synaptara/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXTAUTH_URL` | ✅ | Full URL of the Next.js app |
| `NEXTAUTH_SECRET` | ✅ | Random base64 string |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API base URL |

---

## Contributing

Contributions are welcome. To get started:

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
# Open a Pull Request
```

Please keep commits clean and descriptive.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Author

**Omar Asim**

Studying AI & IT at FAST NUCES and TMUC, Islamabad.

[![GitHub](https://img.shields.io/badge/GitHub-omarasim6-181717?style=flat-square&logo=github)](https://github.com/omarasim6)

---

<div align="center">

Built with ☕ and a lot of debugging.

</div>
