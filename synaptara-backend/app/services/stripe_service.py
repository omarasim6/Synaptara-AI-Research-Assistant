"""
Stripe integration helpers.

All Stripe SDK calls used by the billing router live here so the router
stays focused on request/response handling and DB writes. Every function
raises `StripeNotConfigured` if STRIPE_SECRET_KEY isn't set, so callers can
turn that into a clean 503 rather than a confusing SDK stack trace.

Amounts: Synaptara's prices are in PKR. Stripe's PKR support varies by
account/region, so amounts are charged in USD cents using a fixed display
exchange rate — good enough for a working test-mode integration. Swap
`PKR_TO_USD_RATE` for a live FX lookup if this goes to production billing.
"""

import logging

import stripe

from app.config import get_settings

logger = logging.getLogger(__name__)

# Static PKR → USD rate used only to size the Stripe charge (Stripe test mode
# doesn't support PKR as a settlement currency on most accounts). Update this
# constant, or replace with a live FX rate, before relying on it for real money.
PKR_TO_USD_RATE = 280.0


class StripeNotConfigured(RuntimeError):
    pass


def _client() -> stripe:
    settings = get_settings()
    if not settings.stripe_enabled:
        raise StripeNotConfigured(
            "STRIPE_SECRET_KEY is not set. Add test-mode keys to synaptara-backend/.env "
            "(see .env.example) — get them free at https://dashboard.stripe.com/test/apikeys"
        )
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def pkr_to_usd_cents(amount_pkr: int) -> int:
    if amount_pkr <= 0:
        return 0
    usd = amount_pkr / PKR_TO_USD_RATE
    return max(50, round(usd * 100))  # Stripe's practical minimum charge is ~$0.50


async def get_or_create_customer(*, stripe_customer_id: str | None, email: str, name: str) -> str:
    """Returns an existing Stripe Customer id, or creates one and returns the new id."""
    client = _client()
    if stripe_customer_id:
        try:
            customer = client.Customer.retrieve(stripe_customer_id)
            if not customer.get("deleted"):
                return stripe_customer_id
        except stripe.error.InvalidRequestError:
            logger.warning("Stored Stripe customer %s no longer exists — creating a new one.", stripe_customer_id)

    customer = client.Customer.create(email=email, name=name)
    return customer["id"]


async def create_payment_intent(
    *,
    customer_id: str,
    amount_pkr: int,
    plan: str,
    payment_method_id: str | None = None,
    off_session: bool = False,
) -> "stripe.PaymentIntent":
    """
    Creates a PaymentIntent for a plan purchase.

    If `payment_method_id` is provided (an existing saved Stripe PaymentMethod),
    this attempts to confirm the charge immediately using that card. Otherwise
    it returns a PaymentIntent in `requires_payment_method` state for the
    frontend to complete with a newly entered card via Stripe Elements.
    """
    client = _client()
    kwargs: dict = {
        "amount": pkr_to_usd_cents(amount_pkr),
        "currency": "usd",
        "customer": customer_id,
        "metadata": {"plan": plan, "amount_pkr": str(amount_pkr)},
        "automatic_payment_methods": {"enabled": True, "allow_redirects": "never"},
    }
    if payment_method_id:
        kwargs["payment_method"] = payment_method_id
        kwargs["off_session"] = off_session
        kwargs["confirm"] = True
        kwargs.pop("automatic_payment_methods", None)

    return client.PaymentIntent.create(**kwargs)


async def retrieve_payment_intent(payment_intent_id: str) -> "stripe.PaymentIntent":
    client = _client()
    return client.PaymentIntent.retrieve(payment_intent_id)


async def create_setup_intent(*, customer_id: str) -> "stripe.SetupIntent":
    """
    A SetupIntent saves a card for later use without charging it now — used
    by the "Add a card" flow in Settings (as opposed to /billing/checkout's
    PaymentIntent, which saves *and* charges in one step during a purchase).
    """
    client = _client()
    return client.SetupIntent.create(customer=customer_id, usage="off_session")


async def retrieve_setup_intent(setup_intent_id: str) -> "stripe.SetupIntent":
    client = _client()
    return client.SetupIntent.retrieve(setup_intent_id)


async def retrieve_payment_method(payment_method_id: str) -> "stripe.PaymentMethod":
    client = _client()
    return client.PaymentMethod.retrieve(payment_method_id)


async def list_payment_methods(customer_id: str) -> list[dict]:
    client = _client()
    result = client.PaymentMethod.list(customer=customer_id, type="card")
    return result.get("data", [])


async def detach_payment_method(payment_method_id: str) -> None:
    client = _client()
    try:
        client.PaymentMethod.detach(payment_method_id)
    except stripe.error.InvalidRequestError:
        logger.warning("Stripe payment method %s already detached or missing.", payment_method_id)


def construct_webhook_event(payload: bytes, sig_header: str) -> "stripe.Event":
    settings = get_settings()
    client = _client()
    return client.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
