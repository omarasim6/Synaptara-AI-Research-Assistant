import logging
import uuid

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.deps import get_current_user
from app.database import get_db
from app.models.research import PaymentMethod, Subscription
from app.models.user import User
from app.schemas.research import (
    PLAN_PRICES_PKR,
    CheckoutConfirm,
    CheckoutIntentCreate,
    CheckoutIntentOut,
    PaymentMethodOut,
    SetupIntentConfirm,
    SetupIntentOut,
    SubscriptionOut,
)
from app.services import stripe_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])


def _brand_from_stripe(card: dict) -> str:
    brand = (card.get("brand") or "").lower()
    return brand if brand in {"visa", "mastercard", "amex", "maestro"} else "mastercard"


async def _ensure_customer(user: User, db: AsyncSession) -> str:
    customer_id = await stripe_service.get_or_create_customer(
        stripe_customer_id=user.stripe_customer_id, email=user.email, name=user.name
    )
    if customer_id != user.stripe_customer_id:
        user.stripe_customer_id = customer_id
        await db.commit()
    return customer_id


# ── Start checkout ───────────────────────────────────────────────────────────

@router.post("/checkout", response_model=CheckoutIntentOut)
async def start_checkout(
    payload: CheckoutIntentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckoutIntentOut:
    settings = get_settings()
    amount_pkr = PLAN_PRICES_PKR[payload.plan]

    # Free plan: no payment needed at all — activate immediately.
    if payload.plan == "free":
        current_user.plan = "free"
        record = Subscription(
            user_id=current_user.id, plan="free", amount_pkr=0, status="succeeded"
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return CheckoutIntentOut(
            subscription_id=record.id,
            plan="free",
            amount_pkr=0,
            client_secret=None,
            publishable_key=None,
            status="succeeded",
        )

    if not settings.stripe_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Payments aren't configured yet. Add STRIPE_SECRET_KEY and "
                "STRIPE_PUBLISHABLE_KEY to the backend .env (test-mode keys are "
                "free at https://dashboard.stripe.com/test/apikeys)."
            ),
        )

    customer_id = await _ensure_customer(current_user, db)

    saved_pm_stripe_id: str | None = None
    if payload.saved_payment_method_id:
        result = await db.execute(
            select(PaymentMethod).where(
                PaymentMethod.id == payload.saved_payment_method_id,
                PaymentMethod.user_id == current_user.id,
            )
        )
        card = result.scalar_one_or_none()
        if card is None or not card.stripe_payment_method_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved card not found.")
        saved_pm_stripe_id = card.stripe_payment_method_id

    record = Subscription(
        user_id=current_user.id, plan=payload.plan, amount_pkr=amount_pkr, status="pending"
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    try:
        intent = await stripe_service.create_payment_intent(
            customer_id=customer_id,
            amount_pkr=amount_pkr,
            plan=payload.plan,
            payment_method_id=saved_pm_stripe_id,
            off_session=bool(saved_pm_stripe_id),
        )
    except stripe.error.CardError as exc:
        record.status = "failed"
        await db.commit()
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=exc.user_message or "Your card was declined.")
    except stripe.error.StripeError:
        logger.exception("Stripe PaymentIntent creation failed")
        record.status = "failed"
        await db.commit()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Couldn't reach the payment processor. Please try again.")

    record.stripe_payment_intent_id = intent["id"]
    record.stripe_customer_id = customer_id

    if intent["status"] == "succeeded":
        record.status = "succeeded"
        current_user.plan = payload.plan
        await db.commit()
        return CheckoutIntentOut(
            subscription_id=record.id,
            plan=payload.plan,
            amount_pkr=amount_pkr,
            client_secret=None,
            publishable_key=None,
            status="succeeded",
        )

    await db.commit()
    return CheckoutIntentOut(
        subscription_id=record.id,
        plan=payload.plan,
        amount_pkr=amount_pkr,
        client_secret=intent["client_secret"],
        publishable_key=settings.STRIPE_PUBLISHABLE_KEY,
        status="requires_payment",
    )


# ── Confirm checkout (after stripe.confirmCardPayment on the client) ────────

@router.post("/checkout/confirm", response_model=SubscriptionOut)
async def confirm_checkout(
    payload: CheckoutConfirm,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionOut:
    result = await db.execute(
        select(Subscription).where(
            Subscription.id == payload.subscription_id,
            Subscription.user_id == current_user.id,
        )
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkout not found.")

    if record.status == "succeeded":
        return SubscriptionOut.model_validate(record)

    if not record.stripe_payment_intent_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This checkout has no payment attached.")

    try:
        intent = await stripe_service.retrieve_payment_intent(record.stripe_payment_intent_id)
    except stripe.error.StripeError:
        logger.exception("Failed to retrieve PaymentIntent %s", record.stripe_payment_intent_id)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Couldn't confirm payment status. Please try again.")

    if intent["status"] != "succeeded":
        record.status = "failed" if intent["status"] in ("canceled",) else record.status
        await db.commit()
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Payment has not completed yet.")

    record.status = "succeeded"
    current_user.plan = record.plan

    if payload.save_card and intent.get("payment_method"):
        pm_id = intent["payment_method"]
        try:
            methods = await stripe_service.list_payment_methods(record.stripe_customer_id or current_user.stripe_customer_id or "")
            matched = next((m for m in methods if m["id"] == pm_id), None)
            if matched:
                existing = await db.execute(
                    select(PaymentMethod).where(PaymentMethod.stripe_payment_method_id == pm_id)
                )
                if existing.scalar_one_or_none() is None:
                    is_first = (
                        await db.execute(
                            select(PaymentMethod).where(PaymentMethod.user_id == current_user.id)
                        )
                    ).scalar_one_or_none() is None
                    card_data = matched["card"]
                    db.add(
                        PaymentMethod(
                            user_id=current_user.id,
                            brand=_brand_from_stripe(card_data),
                            last4=card_data["last4"],
                            expiry=f"{card_data['exp_month']:02d}/{str(card_data['exp_year'])[-2:]}",
                            holder_name=matched.get("billing_details", {}).get("name") or current_user.name,
                            is_primary=is_first,
                            stripe_payment_method_id=pm_id,
                        )
                    )
        except stripe.error.StripeError:
            logger.exception("Failed to save card %s after checkout — payment still succeeded.", pm_id)

    await db.commit()
    await db.refresh(record)
    return SubscriptionOut.model_validate(record)


# ── Add a card without charging (Settings > Billing) ─────────────────────────

@router.post("/setup-intent", response_model=SetupIntentOut)
async def create_setup_intent(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SetupIntentOut:
    settings = get_settings()
    if not settings.stripe_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Payments aren't configured yet. Add STRIPE_SECRET_KEY and "
                "STRIPE_PUBLISHABLE_KEY to the backend .env (test-mode keys are "
                "free at https://dashboard.stripe.com/test/apikeys)."
            ),
        )
    customer_id = await _ensure_customer(current_user, db)
    try:
        intent = await stripe_service.create_setup_intent(customer_id=customer_id)
    except stripe.error.StripeError:
        logger.exception("Stripe SetupIntent creation failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Couldn't reach the payment processor. Please try again.")

    return SetupIntentOut(client_secret=intent["client_secret"], publishable_key=settings.STRIPE_PUBLISHABLE_KEY)


@router.post("/setup-intent/confirm", response_model=PaymentMethodOut)
async def confirm_setup_intent(
    payload: SetupIntentConfirm,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentMethodOut:
    """Called after stripe.confirmCardSetup succeeds client-side — saves the
    resulting card into our display-only payment_methods table."""
    try:
        setup_intent = await stripe_service.retrieve_setup_intent(payload.setup_intent_id)
    except stripe.error.StripeError:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Couldn't confirm the card. Please try again.")

    if setup_intent["status"] != "succeeded" or not setup_intent.get("payment_method"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Card setup did not complete.")

    pm_id = setup_intent["payment_method"]

    existing = await db.execute(select(PaymentMethod).where(PaymentMethod.stripe_payment_method_id == pm_id))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This card is already saved.")

    try:
        method = await stripe_service.retrieve_payment_method(pm_id)
    except stripe.error.StripeError:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Couldn't retrieve card details. Please try again.")

    card_data = method["card"]
    is_first = (
        await db.execute(select(PaymentMethod).where(PaymentMethod.user_id == current_user.id))
    ).scalar_one_or_none() is None

    record = PaymentMethod(
        user_id=current_user.id,
        brand=_brand_from_stripe(card_data),
        last4=card_data["last4"],
        expiry=f"{card_data['exp_month']:02d}/{str(card_data['exp_year'])[-2:]}",
        holder_name=method.get("billing_details", {}).get("name") or current_user.name,
        is_primary=is_first or payload.make_primary,
        stripe_payment_method_id=pm_id,
    )
    if payload.make_primary and not is_first:
        existing_cards = (
            await db.execute(select(PaymentMethod).where(PaymentMethod.user_id == current_user.id))
        ).scalars().all()
        for c in existing_cards:
            c.is_primary = False

    db.add(record)
    await db.commit()
    await db.refresh(record)
    return PaymentMethodOut.model_validate(record)


# ── History ──────────────────────────────────────────────────────────────────

@router.get("/subscriptions", response_model=list[SubscriptionOut])
async def list_subscriptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SubscriptionOut]:
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == current_user.id)
        .order_by(Subscription.created_at.desc())
    )
    return [SubscriptionOut.model_validate(s) for s in result.scalars().all()]


# ── Publishable key (safe to expose) ─────────────────────────────────────────

@router.get("/config")
async def billing_config() -> dict:
    settings = get_settings()
    return {"enabled": settings.stripe_enabled, "publishable_key": settings.STRIPE_PUBLISHABLE_KEY or None}


# ── Webhook ──────────────────────────────────────────────────────────────────

@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    """
    Confirms subscription state from Stripe's side independently of the
    client-side confirm call above, so a closed tab or dropped connection
    right after payment doesn't leave a subscription stuck as "pending".
    """
    settings = get_settings()
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Webhook not configured.")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe_service.construct_webhook_event(payload, sig_header)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature.")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_payment_intent_id == intent["id"])
        )
        record = result.scalar_one_or_none()
        if record and record.status != "succeeded":
            record.status = "succeeded"
            user_result = await db.execute(select(User).where(User.id == record.user_id))
            user = user_result.scalar_one_or_none()
            if user:
                user.plan = record.plan
            await db.commit()

    elif event["type"] == "payment_intent.payment_failed":
        intent = event["data"]["object"]
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_payment_intent_id == intent["id"])
        )
        record = result.scalar_one_or_none()
        if record and record.status == "pending":
            record.status = "failed"
            await db.commit()

    return {"received": True}
