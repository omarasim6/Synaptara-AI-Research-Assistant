"use client";

import { useEffect, useState } from "react";
import { paymentApi, type CardBrand, type PaymentMethodOut } from "@/lib/api";
import { useToast } from "@/providers/ToastProvider";
import { BRAND_META } from "@/app/components/cardBrandMeta";
import AddCardModal from "@/app/components/AddCardModal";

interface CardEntry {
  id: string;
  brand: CardBrand;
  last4: string;
  expiry: string;
  holderName: string;
  primary?: boolean;
}

function fromApi(p: PaymentMethodOut): CardEntry {
  return {
    id: p.id,
    brand: p.brand,
    last4: p.last4,
    expiry: p.expiry,
    holderName: p.holder_name,
    primary: p.is_primary,
  };
}

const CARD_GRADIENT: Record<CardBrand, string> = {
  mastercard: "from-[#1a3a35] to-[#2d5248] dark:from-[#0c1c19] dark:to-[#1c332d]",
  visa: "from-[#1a3a35] to-[#2d5248] dark:from-[#0c1c19] dark:to-[#1c332d]",
  amex: "from-[#1a3a35] to-[#2d5248] dark:from-[#0c1c19] dark:to-[#1c332d]",
  maestro: "from-[#1a3a35] to-[#2d5248] dark:from-[#0c1c19] dark:to-[#1c332d]",
};


/* ── Edit Card modal (holder name / expiry only — the card number itself
   is never re-entered here since it's tokenized by Stripe; to use a
   different card number, remove this one and add a new one) ────────────── */
function CardFormModal({
  existingCard,
  onClose,
  onSave,
  saving,
}: {
  existingCard: CardEntry;
  onClose: () => void;
  onSave: (card: { holderName: string; expiry: string }) => void;
  saving: boolean;
}) {
  const [holderName, setHolderName] = useState(existingCard.holderName);
  const [expiry, setExpiry] = useState(existingCard.expiry);
  const [cvv, setCvv] = useState("");

  const brand = existingCard.brand;
  const last4 = existingCard.last4;

  function handleExpiryChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) {
      setExpiry(digits);
    } else {
      setExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    }
  }

  const canSave = holderName.trim().length > 0 && expiry.length >= 4 && cvv.length >= 3;

  function handleSave() {
    if (!canSave || saving) return;
    onSave({ expiry, holderName: holderName.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => !saving && onClose()} />

      <div className="relative w-full sm:max-w-sm bg-white dark:bg-dark-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#1a3a35] dark:text-dark-text transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M11 5L5 11M5 5l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <h3 className="font-display text-lg text-[#1a3a35] dark:text-dark-text truncate">Edit Card Details</h3>
        </div>

        {/* Live card preview */}
        <div
          className={`relative rounded-2xl p-5 mb-6 bg-gradient-to-br ${CARD_GRADIENT[brand]} text-[#EDEADE] shadow-lg overflow-hidden`}
          style={{ aspectRatio: "1.586" }}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -right-2 top-10 w-20 h-20 rounded-full bg-white/5" />
          <div className="relative flex items-start justify-between">
            <span className="text-xs font-medium uppercase tracking-widest opacity-70">Debit</span>
            {BRAND_META[brand].badge}
          </div>
          <div className="relative mt-6 flex items-center gap-2">
            <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
              <rect width="28" height="20" rx="3" fill="#d4b969" />
              <line x1="0" y1="6" x2="28" y2="6" stroke="#00000022" strokeWidth="0.5" />
              <line x1="0" y1="10" x2="28" y2="10" stroke="#00000022" strokeWidth="0.5" />
              <line x1="0" y1="14" x2="28" y2="14" stroke="#00000022" strokeWidth="0.5" />
            </svg>
          </div>
          <p className="relative mt-3 text-lg sm:text-xl tracking-widest font-mono truncate">
            •••• •••• •••• {last4}
          </p>
          <div className="relative mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest opacity-60">Card holder</p>
              <p className="text-xs sm:text-sm font-medium mt-0.5 truncate">{holderName || "Your Name"}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[9px] uppercase tracking-widest opacity-60">Expires</p>
              <p className="text-xs sm:text-sm font-medium mt-0.5">{expiry || "MM/YY"}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1a3a35] dark:text-dark-text mb-1.5">Card Number</label>
            <div className="w-full border border-[#dedad0] dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-[#8a8677] dark:text-dark-muted bg-[#f5f3ee] dark:bg-dark-surface-2 font-mono cursor-not-allowed">
              •••• •••• •••• {last4}
            </div>
            <p className="text-[11px] text-[#8a8677] dark:text-dark-muted mt-1.5">
              To use a different card number, remove this card and add a new one.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1a3a35] dark:text-dark-text mb-1.5">Account Holder Name</label>
            <input
              type="text"
              placeholder="Full name on card"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              className="w-full border border-[#dedad0] dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-[#1a3a35] dark:text-dark-text bg-white dark:bg-dark-surface-2 outline-none focus:border-[#4a7c6f] focus:ring-2 focus:ring-[#4a7c6f]/10 dark:focus:ring-[#4a7c6f]/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1a3a35] dark:text-dark-text mb-1.5">Expiry Date</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => handleExpiryChange(e.target.value)}
                maxLength={5}
                className="w-full border border-[#dedad0] dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-[#1a3a35] dark:text-dark-text bg-white dark:bg-dark-surface-2 outline-none focus:border-[#4a7c6f] focus:ring-2 focus:ring-[#4a7c6f]/10 dark:focus:ring-[#4a7c6f]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1a3a35] dark:text-dark-text mb-1.5">CVV</label>
              <input
                type="password"
                inputMode="numeric"
                placeholder="•••"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                className="w-full border border-[#dedad0] dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-[#1a3a35] dark:text-dark-text bg-white dark:bg-dark-surface-2 outline-none focus:border-[#4a7c6f] focus:ring-2 focus:ring-[#4a7c6f]/10 dark:focus:ring-[#4a7c6f]/20 transition-all"
              />
            </div>
          </div>
          <p className="text-[11px] text-[#8a8677] dark:text-dark-muted -mt-2">
            Re-enter the CVV to confirm these changes.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full mt-6 flex items-center justify-center gap-2 bg-[#1a3a35] dark:bg-[#4a7c6f] text-[#EDEADE] dark:text-dark-text text-sm font-semibold py-3 rounded-xl hover:bg-[#2d5248] dark:hover:bg-[#5a8f80] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

/* ── Inline skeleton row (shown while cards are loading) ─────────────────── */
function CardRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 py-4 animate-pulse">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-8 rounded-md bg-[#f0ece4] dark:bg-dark-surface-2 flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 rounded bg-[#f0ece4] dark:bg-dark-surface-2" />
          <div className="h-3 w-40 rounded bg-[#f0ece4] dark:bg-dark-surface-2" />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-7 h-7 rounded-lg bg-[#f0ece4] dark:bg-dark-surface-2" />
        <div className="w-7 h-7 rounded-lg bg-[#f0ece4] dark:bg-dark-surface-2" />
      </div>
    </div>
  );
}

/* ── Main Payment Methods panel ──────────────────────────────────────────── */
export default function PaymentMethods({ token }: { token: string }) {
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const toast = useToast();

  const editingCard = cards.find((c) => c.id === editingCardId);

  function loadCards() {
    if (!token) return;
    setLoading(true);
    setLoadError(false);
    paymentApi
      .getAll(token)
      .then((res) => setCards(res.map(fromApi)))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(loadCards, [token]);

  async function handleEditCard(card: { holderName: string; expiry: string }) {
    if (!editingCardId) return;
    setActionError("");
    setSavingCard(true);
    try {
      const updated = await paymentApi.update(token, editingCardId, {
        holder_name: card.holderName,
        expiry: card.expiry,
      });
      setCards((prev) => prev.map((c) => (c.id === editingCardId ? fromApi(updated) : c)));
      setEditingCardId(null);
      toast.success("Card updated ✓");
    } catch {
      setActionError("Couldn't update this card. Please try again.");
    } finally {
      setSavingCard(false);
    }
  }

  async function handleRemove(id: string) {
    setActionError("");
    setPendingActionId(id);
    const prevCards = cards;
    // Optimistic update, reconciled with the server response below.
    setCards((prev) => {
      const removingPrimary = prev.find((c) => c.id === id)?.primary;
      const rest = prev.filter((c) => c.id !== id);
      if (removingPrimary && rest.length > 0) rest[0] = { ...rest[0], primary: true };
      return rest;
    });
    try {
      await paymentApi.remove(token, id);
      toast.success("Card removed");
    } catch {
      setCards(prevCards);
      setActionError("Couldn't remove this card. Please try again.");
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleSetPrimary(id: string) {
    setActionError("");
    setPendingActionId(id);
    const prevCards = cards;
    setCards((prev) => prev.map((c) => ({ ...c, primary: c.id === id })));
    try {
      await paymentApi.setPrimary(token, id);
      toast.success("Primary card updated ✓");
    } catch {
      setCards(prevCards);
      setActionError("Couldn't update your primary card. Please try again.");
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <p className="text-sm font-semibold text-[#1a3a35] dark:text-dark-text">Payment Methods</p>
          <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-1 max-w-sm">
            Any updates made to your payment method information will be applied to your upcoming scheduled payment.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          disabled={loading}
          className="flex-shrink-0 flex items-center gap-2 bg-[#1a3a35] dark:bg-[#4a7c6f] text-[#EDEADE] dark:text-dark-text text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-[#2d5248] dark:hover:bg-[#5a8f80] transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x="1" y="3" width="13" height="9.5" rx="1.8" stroke="currentColor" strokeWidth="1.3" />
            <path d="M1 6h13" stroke="currentColor" strokeWidth="1.3" />
            <path d="M11.5 1.5v3M10 3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Add Payment Method</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {actionError && (
        <div className="mt-4 flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-xl px-4 py-3">
          <svg width="15" height="15" viewBox="0 0 16 16" className="shrink-0 mt-px" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <p className="text-xs sm:text-sm leading-snug">{actionError}</p>
        </div>
      )}

      {loading ? (
        <div className="mt-5 divide-y divide-[#f0ece4] dark:divide-dark-border border-t border-[#f0ece4] dark:border-dark-border">
          <CardRowSkeleton />
          <CardRowSkeleton />
        </div>
      ) : loadError ? (
        <div className="text-center py-10 border-t border-[#f0ece4] dark:border-dark-border mt-5">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mx-auto mb-3 text-red-400">
            <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.6" />
            <path d="M16 10v7M16 21v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text">Couldn&apos;t load your payment methods</p>
          <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-1 mb-4">Check your connection and try again.</p>
          <button
            onClick={loadCards}
            className="text-xs font-medium text-[#1a3a35] dark:text-dark-text bg-[#f5f3ee] dark:bg-dark-surface-2 px-4 py-2 rounded-lg hover:bg-[#ece9e2] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-10 border-t border-[#f0ece4] dark:border-dark-border mt-5">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mx-auto mb-3 text-[#4a7c6f] dark:text-dark-muted">
            <rect x="2" y="6" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="1.6" />
            <path d="M2 12h28" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 19h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text">No payment method on file</p>
          <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-1">Add a payment method to upgrade your plan.</p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-[#f0ece4] dark:divide-dark-border border-t border-[#f0ece4] dark:border-dark-border">
          {cards.map((card) => {
            const isPending = pendingActionId === card.id;
            return (
              <div key={card.id} className={`flex items-center justify-between gap-3 py-4 transition-opacity ${isPending ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-8 rounded-md bg-[#f5f3ee] dark:bg-dark-surface-2 flex items-center justify-center flex-shrink-0">
                    {BRAND_META[card.brand].badge}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text">{BRAND_META[card.brand].label}</p>
                      {card.primary && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide bg-[#e8f0ee] dark:bg-[#4a7c6f]/20 text-[#1a3a35] dark:text-[#9fc2b8] px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5 truncate">
                      XXXX XXXX XXXX {card.last4} &nbsp;|&nbsp; Expiry {card.expiry}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!card.primary && (
                    <button
                      onClick={() => handleSetPrimary(card.id)}
                      disabled={isPending}
                      className="hidden sm:block text-xs font-medium text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:cursor-not-allowed"
                    >
                      Make primary
                    </button>
                  )}
                  <button
                    onClick={() => setEditingCardId(card.id)}
                    disabled={isPending}
                    className="p-2 rounded-lg text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:cursor-not-allowed"
                    aria-label={`Edit ${BRAND_META[card.brand].label} card ending in ${card.last4}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M9.5 2.5l3 3L4.5 13.5H1.5v-3L9.5 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 4l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemove(card.id)}
                    disabled={isPending}
                    className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:cursor-not-allowed"
                    aria-label={`Remove ${BRAND_META[card.brand].label} card ending in ${card.last4}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M2 4h11M5.5 4V2.5a1 1 0 011-1h1a1 1 0 011 1V4M3.5 4l.6 8.4a1 1 0 001 .9h4.8a1 1 0 001-.9l.6-8.4"
                        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <AddCardModal
          token={token}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            toast.success("Card added ✓");
            loadCards();
          }}
        />
      )}

      {editingCard && (
        <CardFormModal
          existingCard={editingCard}
          onClose={() => setEditingCardId(null)}
          onSave={handleEditCard}
          saving={savingCard}
        />
      )}
    </div>
  );
}
