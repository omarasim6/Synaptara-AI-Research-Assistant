"use client";

import { useEffect, useState } from "react";
import { loadStripe, type Stripe, type StripeCardElementChangeEvent } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { billingApi, type CardBrand } from "@/lib/api";
import { BRAND_META } from "@/app/components/cardBrandMeta";

const CARD_GRADIENT: Record<CardBrand, string> = {
  mastercard: "from-[#1a3a35] to-[#2d5248] dark:from-[#0c1c19] dark:to-[#1c332d]",
  visa: "from-[#1a3a35] to-[#2d5248] dark:from-[#0c1c19] dark:to-[#1c332d]",
  amex: "from-[#1a3a35] to-[#2d5248] dark:from-[#0c1c19] dark:to-[#1c332d]",
  maestro: "from-[#1a3a35] to-[#2d5248] dark:from-[#0c1c19] dark:to-[#1c332d]",
};

// Stripe's CardElement reports a subset of brand strings; map to ours.
function mapStripeBrand(brand: string | undefined): CardBrand {
  switch (brand) {
    case "visa": return "visa";
    case "amex": return "amex";
    case "mastercard": return "mastercard";
    default: return "mastercard";
  }
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "15px",
      fontFamily: "Inter, system-ui, sans-serif",
      color: "#1a3a35",
      "::placeholder": { color: "#a09c8e" },
      iconColor: "#EDEADE",
    },
    invalid: { color: "#fca5a5", iconColor: "#fca5a5" },
  },
};

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(publishableKey: string) {
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

function InnerForm({
  clientSecret,
  token,
  onSaved,
}: {
  clientSecret: string;
  token: string;
  onSaved: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [holderName, setHolderName] = useState("");
  const [makePrimary, setMakePrimary] = useState(true);
  const [brand, setBrand] = useState<CardBrand>("mastercard");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCardChange(e: StripeCardElementChangeEvent) {
    setComplete(e.complete);
    setBrand(mapStripeBrand(e.brand));
    setError(e.error?.message ?? null);
  }

  async function handleSave() {
    if (!stripe || !elements) return;
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;
    if (!holderName.trim()) {
      setError("Enter the name on your card.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: { name: holderName.trim() },
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Couldn't save this card. Please try again.");
      setSubmitting(false);
      return;
    }
    if (setupIntent?.status !== "succeeded") {
      setError("Card setup wasn't completed. Please try again.");
      setSubmitting(false);
      return;
    }

    try {
      await billingApi.confirmSetupIntent(token, { setup_intent_id: setupIntent.id, make_primary: makePrimary });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Card was saved with Stripe, but we couldn't finish setup. Please refresh.");
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Live card preview */}
      <div
        className={`relative rounded-2xl p-5 mb-6 bg-gradient-to-br ${CARD_GRADIENT[brand]} text-[#EDEADE] shadow-lg overflow-hidden`}
        style={{ aspectRatio: "1.586" }}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -right-2 top-10 w-20 h-20 rounded-full bg-white/5" />
        <div className="relative flex items-start justify-between">
          <span className="text-xs font-medium uppercase tracking-widest opacity-70">Debit / Credit</span>
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
        <p className="relative mt-3 text-lg sm:text-xl tracking-widest font-mono truncate">•••• •••• •••• ••••</p>
        <div className="relative mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-widest opacity-60">Card holder</p>
            <p className="text-xs sm:text-sm font-medium mt-0.5 truncate">{holderName || "Your Name"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
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

        <div>
          <label className="block text-xs font-medium text-[#1a3a35] dark:text-dark-text mb-1.5">Card details</label>
          <div className="w-full border border-[#dedad0] dark:border-dark-border rounded-xl px-4 py-3.5 bg-[#1a3a35] dark:bg-dark-surface-2 focus-within:border-[#4a7c6f] focus-within:ring-2 focus-within:ring-[#4a7c6f]/20 transition-all">
            <CardElement options={CARD_ELEMENT_OPTIONS} onChange={handleCardChange} />
          </div>
          <p className="text-[11px] text-[#8a8677] dark:text-dark-muted mt-1.5">
            Test mode — use 4242 4242 4242 4242, any future date, any CVC.
          </p>
        </div>

        <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
          <button
            type="button"
            onClick={() => setMakePrimary((v) => !v)}
            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
              makePrimary ? "bg-[#1a3a35] dark:bg-[#4a7c6f]" : "border border-[#c8c4b4] dark:border-dark-border"
            }`}
          >
            {makePrimary && (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1.5 5.5L4 8L9.5 2" stroke="#EDEADE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span className="text-sm text-[#1a3a35] dark:text-dark-text">Make this my primary card</span>
        </label>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mt-4">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={!stripe || submitting || !complete || !holderName.trim()}
        className="w-full mt-6 flex items-center justify-center gap-2 bg-[#1a3a35] dark:bg-[#4a7c6f] text-[#EDEADE] dark:text-dark-text text-sm font-semibold py-3 rounded-xl hover:bg-[#2d5248] dark:hover:bg-[#5a8f80] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        {submitting ? "Saving…" : "Save card"}
      </button>
    </>
  );
}

export default function AddCardModal({
  token,
  onClose,
  onSaved,
}: {
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    billingApi
      .createSetupIntent(token)
      .then((res) => {
        setClientSecret(res.client_secret);
        setPublishableKey(res.publishable_key);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't start card setup."));
  }, [token]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />

      <div className="relative w-full sm:max-w-sm bg-white dark:bg-dark-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#1a3a35] dark:text-dark-text transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M11 5L5 11M5 5l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <h3 className="font-display text-lg text-[#1a3a35] dark:text-dark-text truncate">Add New Card</h3>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">{error}</p>
        )}

        {!clientSecret || !publishableKey ? (
          <div className="py-10 flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-[#1a3a35]/20 dark:border-dark-border border-t-[#1a3a35] dark:border-t-dark-text rounded-full animate-spin" />
          </div>
        ) : (
          <Elements stripe={getStripe(publishableKey)} options={{ clientSecret }}>
            <InnerForm clientSecret={clientSecret} token={token} onSaved={onSaved} />
          </Elements>
        )}
      </div>
    </div>
  );
}
