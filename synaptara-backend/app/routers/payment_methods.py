import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models.research import PaymentMethod
from app.models.user import User
from app.schemas.research import PaymentMethodCreate, PaymentMethodOut, PaymentMethodUpdate
from app.services import stripe_service

router = APIRouter(prefix="/payment-methods", tags=["payment-methods"])


@router.get("", response_model=list[PaymentMethodOut])
async def list_payment_methods(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PaymentMethodOut]:
    result = await db.execute(
        select(PaymentMethod)
        .where(PaymentMethod.user_id == current_user.id)
        .order_by(PaymentMethod.created_at.asc())
    )
    return [PaymentMethodOut.model_validate(c) for c in result.scalars().all()]


@router.post("", response_model=PaymentMethodOut, status_code=status.HTTP_201_CREATED)
async def add_payment_method(
    payload: PaymentMethodCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentMethodOut:
    # The first card a user adds automatically becomes their primary method.
    existing = await db.execute(
        select(PaymentMethod).where(PaymentMethod.user_id == current_user.id)
    )
    is_first = existing.scalar_one_or_none() is None

    card = PaymentMethod(
        user_id=current_user.id,
        brand=payload.brand,
        last4=payload.last4,
        expiry=payload.expiry,
        holder_name=payload.holder_name,
        is_primary=is_first,
    )
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return PaymentMethodOut.model_validate(card)


@router.patch("/{card_id}", response_model=PaymentMethodOut)
async def update_payment_method(
    card_id: uuid.UUID,
    payload: PaymentMethodUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentMethodOut:
    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == card_id,
            PaymentMethod.user_id == current_user.id,
        )
    )
    card = result.scalar_one_or_none()
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found.")

    if payload.holder_name is not None:
        card.holder_name = payload.holder_name
    if payload.expiry is not None:
        card.expiry = payload.expiry

    await db.commit()
    await db.refresh(card)
    return PaymentMethodOut.model_validate(card)


@router.patch("/{card_id}/primary", response_model=PaymentMethodOut)
async def set_primary_payment_method(
    card_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentMethodOut:
    result = await db.execute(
        select(PaymentMethod).where(PaymentMethod.user_id == current_user.id)
    )
    cards = result.scalars().all()
    target = next((c for c in cards if c.id == card_id), None)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found.")

    for c in cards:
        c.is_primary = c.id == card_id

    await db.commit()
    await db.refresh(target)
    return PaymentMethodOut.model_validate(target)


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_payment_method(
    card_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(PaymentMethod).where(PaymentMethod.user_id == current_user.id)
    )
    cards = list(result.scalars().all())
    target = next((c for c in cards if c.id == card_id), None)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found.")

    was_primary = target.is_primary
    stripe_pm_id = target.stripe_payment_method_id
    await db.delete(target)

    # If we removed the primary card, promote the next oldest remaining card.
    if was_primary:
        remaining = [c for c in cards if c.id != card_id]
        if remaining:
            remaining.sort(key=lambda c: c.created_at)
            remaining[0].is_primary = True

    await db.commit()

    # Detach from Stripe too, so it stops showing up as a usable customer
    # payment method there. Best-effort — the local delete has already
    # succeeded, so a Stripe hiccup here shouldn't roll that back.
    if stripe_pm_id:
        try:
            await stripe_service.detach_payment_method(stripe_pm_id)
        except stripe_service.StripeNotConfigured:
            pass
