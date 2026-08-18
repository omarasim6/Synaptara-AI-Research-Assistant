from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://synaptara:synaptara_pass@localhost:5432/synaptara"

    # JWT
    SECRET_KEY: str = "change_this_secret_key_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Internal API key (Next.js server → FastAPI)
    BACKEND_API_KEY: str = "change_this_internal_key_in_production"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    # App
    APP_NAME: str = "Synaptara"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # OpenAI — kept only as an optional fallback. Not required when
    # AI_PROVIDER=ollama (the default now — see below).
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-5-mini"

    # ── AI provider switch ──────────────────────────────────────────────────
    # "ollama" (default): free, runs entirely locally, no API key needed.
    #   No live web search — answers come from the local model's own
    #   knowledge only.
    # "openai": uses OPENAI_API_KEY / OPENAI_MODEL above, with real web
    #   search grounding for the general-knowledge search fallback.
    AI_PROVIDER: str = "ollama"

    # Ollama — local model server. OLLAMA_BASE_URL must be reachable from
    # *inside* the api container. When running via docker-compose on
    # Windows/Mac, "http://host.docker.internal:11434" reaches Ollama
    # running on the host machine. On Linux, use the host's LAN/bridge IP,
    # or run Ollama in its own container on the same docker network instead.
    OLLAMA_BASE_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "llama3.2:1b"

    # Stripe — billing / subscriptions (test mode keys from dashboard.stripe.com)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    @property
    def stripe_enabled(self) -> bool:
        return bool(self.STRIPE_SECRET_KEY)

    # ── Email (SMTP) ─────────────────────────────────────────────────────────
    # Used for Email Alerts + Weekly Digest. Left blank by default — no
    # credentials are hardcoded anywhere. When SMTP_HOST is unset, the email
    # service logs the would-be email instead of sending (safe local/dev
    # default), so the feature is fully wired end-to-end and ready for a real
    # provider without code changes — just fill in .env.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    EMAIL_FROM: str = "Synaptara <no-reply@synaptara.app>"

    @property
    def email_enabled(self) -> bool:
        return bool(self.SMTP_HOST)

    # ── Weekly digest scheduler ─────────────────────────────────────────────
    WEEKLY_DIGEST_DAY_OF_WEEK: str = "mon"  # apscheduler cron day (mon-sun)
    WEEKLY_DIGEST_HOUR: int = 8


@lru_cache
def get_settings() -> Settings:
    return Settings()
