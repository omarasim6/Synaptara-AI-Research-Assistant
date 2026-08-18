import re
import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator


# ── Search ────────────────────────────────────────────────────────────────────

class SearchCreate(BaseModel):
    query: str
    source_filter: str | None = None  # e.g. "arXiv", "OpenAI"


class SearchOut(BaseModel):
    id: uuid.UUID
    query: str
    results_count: int
    source_filter: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchResultItem(BaseModel):
    title: str
    authors: str
    source: str
    year: str
    tag: str
    summary: str
    paper_url: str | None = None


class SearchResponse(BaseModel):
    query: str
    total: int
    results: list[SearchResultItem]
    search_id: uuid.UUID


# ── Saved Papers ──────────────────────────────────────────────────────────────

class PaperSaveRequest(BaseModel):
    title: str
    authors: str
    source: str
    year: str
    tag: str
    summary: str
    paper_url: str | None = None


class SavedPaperOut(BaseModel):
    id: uuid.UUID
    title: str
    authors: str
    source: str
    year: str
    tag: str
    summary: str
    paper_url: str | None
    saved_at: datetime

    model_config = {"from_attributes": True}


# ── Reports ───────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    title: str
    tag: str
    content: str | None = None
    pages: int = 1


class ReportGenerateRequest(BaseModel):
    """Kick off report generation from a research query."""
    query: str
    source_filter: str | None = None


class ReportOut(BaseModel):
    id: uuid.UUID
    title: str
    tag: str
    pages: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportDetailOut(ReportOut):
    """Full report including body content — used for the single-report view."""
    content: str | None = None


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    source: str
    query: str


class AlertOut(BaseModel):
    id: uuid.UUID
    source: str
    query: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertNotificationOut(BaseModel):
    id: uuid.UUID
    alert_id: uuid.UUID
    title: str
    papers_count: int
    is_read: bool
    created_at: datetime
    source: str  # flattened from alert
    alert_query: str  # flattened from alert

    model_config = {"from_attributes": True}


# ── Payment Methods ───────────────────────────────────────────────────────────
# NOTE: Only PCI-safe, display-oriented fields are accepted/returned here.
# Full card numbers and CVVs must never be sent to or stored by this API —
# in production, card capture should go through a PCI-compliant processor
# (e.g. Stripe Elements) and only the resulting token should reach this
# service.

class PaymentMethodCreate(BaseModel):
    brand: str
    last4: str
    expiry: str  # MM/YY
    holder_name: str

    @field_validator("last4")
    @classmethod
    def last4_is_four_digits(cls, v: str) -> str:
        if not (len(v) == 4 and v.isdigit()):
            raise ValueError("last4 must be exactly 4 digits")
        return v

    @field_validator("expiry")
    @classmethod
    def expiry_is_mm_yy(cls, v: str) -> str:
        if not re.fullmatch(r"(0[1-9]|1[0-2])/\d{2}", v):
            raise ValueError("expiry must be in MM/YY format")
        return v

    @field_validator("brand")
    @classmethod
    def brand_is_known(cls, v: str) -> str:
        allowed = {"visa", "mastercard", "amex", "maestro"}
        if v not in allowed:
            raise ValueError(f"brand must be one of {sorted(allowed)}")
        return v

    @field_validator("holder_name")
    @classmethod
    def holder_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("holder_name cannot be empty")
        return v.strip()


class PaymentMethodUpdate(BaseModel):
    holder_name: str | None = None
    expiry: str | None = None

    @field_validator("expiry")
    @classmethod
    def expiry_is_mm_yy(cls, v: str | None) -> str | None:
        if v is not None and not re.fullmatch(r"(0[1-9]|1[0-2])/\d{2}", v):
            raise ValueError("expiry must be in MM/YY format")
        return v

    @field_validator("holder_name")
    @classmethod
    def holder_name_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("holder_name cannot be empty")
        return v.strip() if v else v


class PaymentMethodOut(BaseModel):
    id: uuid.UUID
    brand: str
    last4: str
    expiry: str
    holder_name: str
    is_primary: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Billing / Checkout (Stripe) ────────────────────────────────────────────
# The frontend never sends a raw card number here — Stripe Elements collects
# card data directly and hands back a Stripe id (PaymentMethod / PaymentIntent),
# which is all this API ever sees.

PLAN_PRICES_PKR: dict[str, int] = {
    "free": 0,
    "go": 1400,
    "plus": 5700,
    "pro": 27999,
}


class CheckoutIntentCreate(BaseModel):
    """Kick off a checkout: creates (or reuses) a PaymentIntent for the plan."""
    plan: str
    # If set, charge this already-saved card instead of collecting a new one.
    saved_payment_method_id: uuid.UUID | None = None

    @field_validator("plan")
    @classmethod
    def plan_is_known(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in PLAN_PRICES_PKR:
            raise ValueError(f"plan must be one of {sorted(PLAN_PRICES_PKR)}")
        return v


class CheckoutIntentOut(BaseModel):
    subscription_id: uuid.UUID
    plan: str
    amount_pkr: int
    # Present when a *new* card needs to be collected client-side via Stripe
    # Elements (stripe.confirmCardPayment). Absent when we charged a saved
    # card directly and the subscription is already confirmed.
    client_secret: str | None
    publishable_key: str | None
    status: str  # "requires_payment" | "succeeded"


class CheckoutConfirm(BaseModel):
    """Called after stripe.confirmCardPayment succeeds client-side, to sync state."""
    subscription_id: uuid.UUID
    # Save the card used for next time (only meaningful for a new-card checkout).
    save_card: bool = False


class SubscriptionOut(BaseModel):
    id: uuid.UUID
    plan: str
    amount_pkr: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SetupIntentOut(BaseModel):
    """Returned when starting an "Add a card" flow (Settings > Billing) —
    saves a card via Stripe without charging anything."""
    client_secret: str
    publishable_key: str


class SetupIntentConfirm(BaseModel):
    setup_intent_id: str
    make_primary: bool = False
