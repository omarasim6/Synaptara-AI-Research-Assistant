# Synaptara-AI-Ressearch-Assistant

## In-app AI assistant ("Sage")

Synaptara includes a floating in-app assistant, **Sage**, available from every
authenticated page (bottom-right launcher). It answers questions about
Synaptara's own features, navigation, dashboard, search, account, billing,
and subscriptions — grounded in a hand-maintained knowledge base on the
backend so it never invents routes, prices, or features.

- Frontend: `app/components/assistant/` (lazy-loaded, no impact on initial
  page bundles) + `assistantApi` in `lib/api.ts`.
- Backend: `synaptara-backend/app/routers/assistant.py`,
  `app/services/assistant_service.py`,
  `app/knowledge/synaptara_kb.py` (edit this file to update what Sage knows).

No new environment variables are required beyond what the backend already
uses for AI — see `synaptara-backend/.env.example` (`OPENAI_API_KEY`,
`OPENAI_MODEL`). If that key isn't set, Sage's message endpoint returns a
friendly "not configured" error instead of failing silently.