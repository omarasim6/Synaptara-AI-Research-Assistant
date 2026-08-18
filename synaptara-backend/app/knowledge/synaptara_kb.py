"""
Verified, hand-maintained knowledge about the Synaptara application.

This is the ONLY source of "what Synaptara can do" that gets fed to the
assistant model — never raw source code. Keep every fact here accurate and
in sync with the real app; the assistant is instructed to never claim
anything beyond what's written here.

Update this file (not the system prompt in assistant_service.py) whenever a
route, feature, or price changes.
"""

SYNAPTARA_KNOWLEDGE = """
# Synaptara — Application Knowledge

## What Synaptara is
Synaptara is an AI research assistant. It reads papers, blogs, and
newsletters from sources like arXiv, PubMed, OpenAI, and DeepMind, then
summarizes, organizes, and cites them so users can cover more ground in
less time.

## Real routes (only ever link to these)
- `/` — Marketing homepage
- `/dashboard` — Dashboard, Overview tab (default)
- `/dashboard?tab=search` — Dashboard Search tab (quick topic search + stats)
- `/dashboard?tab=reports` — Saved/generated Reports
- `/dashboard?tab=library` — Library of saved papers
- `/dashboard?tab=alerts` — Research alerts & notifications
- `/search` — Full AI-powered search page (main search experience)
- `/profile` — Profile tab (name, avatar, account info)
- `/profile?tab=settings` — Settings tab
- `/profile?tab=billing` — Plan & Billing tab (subscription, invoices)
- `/pricing` — Pricing page, compares all plans
- `/checkout/[plan]` — Checkout flow for a specific plan (free, go, plus, pro)
- `/support` — Support / FAQ page
- `/signin`, `/signup` — Auth pages
- `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/other-policies`

## Core features
1. **Search** (`/search` and `/dashboard?tab=search`): AI-powered search
   over research papers and general knowledge. Users type a topic, question,
   or keyword and can filter by source (arXiv, OpenAI, Anthropic, DeepMind,
   PubMed). Results show a summary, authors, source, year, and a link to
   the original paper. Any result can be saved to the Library. Questions
   that aren't about research papers/AI are answered by a general
   web-grounded AI assistant instead, with sources cited.
2. **Dashboard** (`/dashboard`): Overview tab shows usage stats, recent
   searches, saved reports, and alerts at a glance. Other tabs (Search,
   Reports, Library, Alerts) are accessible from the sidebar or via the
   `?tab=` query param.
3. **Reports**: Saved literature-review style reports the user has
   generated, listed with title, tag, and page count.
4. **Library**: Saved papers a user has bookmarked from search results.
5. **Alerts**: Users can create standing alerts for a topic/source; new
   matching papers generate notifications.
6. **Profile & Settings** (`/profile`): Update name/avatar, manage account
   settings, and delete account.
7. **Billing & Subscriptions** (`/profile?tab=billing`, `/pricing`):
   View/change plan, manage saved payment methods (brand, last 4 digits,
   expiry — never full card numbers), see subscription/payment history.
   Payments are processed by Stripe; only PCI-safe display data is stored.

## Plans & pricing (PKR, billed in Pakistani Rupees)
- **Free** — PKR 0. Limited access to Synaptara AI, limited questions/day,
  limited citations, limited deep research, limited memory.
- **Go** — PKR 1,400. Everything in Free, plus more AI access, more
  questions/day, more document uploads, more citations, longer memory.
- **Plus** — PKR 5,700. Everything in Go, plus advanced reasoning over
  papers, more accurate citations, expanded deep research, expanded memory,
  Projects/tasks/saved searches, early access to new features. (Limits apply.)
- **Pro** — PKR 27,999. Everything in Plus, plus 5x–20x more usage,
  pro-level reasoning depth, max deep research/agent mode, unlimited file
  uploads, max memory, expanded projects/saved searches, research preview
  access. (Unlimited with fair-use limits.)
Users upgrade/downgrade from `/pricing` or `/profile?tab=billing`, which
starts a checkout flow at `/checkout/[plan]`.

## Account & auth
Users sign up/sign in at `/signup` / `/signin` with email+password or
Google. Sessions are managed via NextAuth. Account deletion is available
from Profile > Settings and is permanent.

## What Synaptara does NOT have
No mobile app, no browser extension, no public API for third-party
developers, no team/organization accounts, no offline mode. Don't imply
these exist.

## Common workflows
- "How do I search for papers?" → Go to `/search`, type a topic, optionally
  filter by source, save useful results to your Library.
- "How do I see my past searches?" → `/dashboard` Overview or
  `/dashboard?tab=search` shows recent searches; full history is available
  via the search page.
- "How do I upgrade my plan?" → `/pricing`, pick a plan, complete checkout.
- "How do I manage my card?" → `/profile?tab=billing`.
- "How do I set up an alert for new papers on a topic?" →
  `/dashboard?tab=alerts`, create an alert with a topic/source.
- "How do I delete my account?" → `/profile?tab=settings`.
"""
