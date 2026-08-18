"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import FullPageLoader from "@/app/components/FullPageLoader";
import { BRAND_META } from "@/app/components/cardBrandMeta";
import CheckoutForm from "./CheckoutForm";
import { billingApi, paymentApi, type CheckoutIntentOut, type PaymentMethodOut } from "@/lib/api";
import { PLANS, isPlanId } from "@/lib/plans";
import { useToast } from "@/providers/ToastProvider";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(publishableKey: string) {
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

type Stage = "loading" | "choose" | "new-card" | "success" | "unavailable";

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const toast = useToast();

  const planParam = typeof params.plan === "string" ? params.plan : Array.isArray(params.plan) ? params.plan[0] : "";
  const plan = isPlanId(planParam) ? PLANS[planParam] : null;

  const token = (session?.user as Record<string, unknown> | undefined)?.accessToken as string | undefined;

  const [stage, setStage] = useState<Stage>("loading");
  const [savedCards, setSavedCards] = useState<PaymentMethodOut[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [intent, setIntent] = useState<CheckoutIntentOut | null>(null);
  const [payingWithSaved, setPayingWithSaved] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/signin?callbackUrl=${encodeURIComponent(`/checkout/${planParam}`)}`);
    }
  }, [status, router, planParam]);

  useEffect(() => {
    if (!token || !plan) return;

    // Free plan needs no cards, no Stripe — activate straight away.
    if (plan.id === "free") {
      billingApi
        .startCheckout(token, { plan: "free" })
        .then(() => setStage("success"))
        .catch(() => setUnavailableReason("Couldn't switch you to the Free plan. Please try again."));
      return;
    }

    paymentApi
      .getAll(token)
      .then((cards) => {
        setSavedCards(cards);
        setSelectedCardId(cards.find((c) => c.is_primary)?.id ?? cards[0]?.id ?? null);
        setStage("choose");
      })
      .catch(() => setStage("choose"));
  }, [token, plan]);

  async function payWithSavedCard() {
    if (!token || !plan || !selectedCardId) return;
    setPayingWithSaved(true);
    try {
      const result = await billingApi.startCheckout(token, {
        plan: plan.id,
        saved_payment_method_id: selectedCardId,
      });
      if (result.status === "succeeded") {
        setStage("success");
      } else {
        // Saved card needed extra verification (e.g. 3D Secure) — fall back
        // to the full card form pre-filled with a fresh PaymentIntent.
        setIntent(result);
        setStage("new-card");
      }
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes("payments aren't configured")) {
        setUnavailableReason(err.message);
        setStage("unavailable");
      } else {
        toast.error(err instanceof Error ? err.message : "Couldn't charge that card. Try a different one.");
      }
    } finally {
      setPayingWithSaved(false);
    }
  }

  async function startNewCardCheckout() {
    if (!token || !plan) return;
    try {
      const result = await billingApi.startCheckout(token, { plan: plan.id });
      if (result.status === "succeeded") {
        setStage("success");
        return;
      }
      setIntent(result);
      setStage("new-card");
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes("payments aren't configured")) {
        setUnavailableReason(err.message);
        setStage("unavailable");
      } else {
        toast.error(err instanceof Error ? err.message : "Couldn't start checkout. Please try again.");
      }
    }
  }

  const stripeElementsPromise = useMemo(
    () => (intent?.publishable_key ? getStripe(intent.publishable_key) : null),
    [intent?.publishable_key]
  );

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-[#1a3a35] dark:text-dark-text font-display text-xl">That plan doesn&apos;t exist.</p>
        <Link href="/pricing" className="text-sm underline text-[#4a7c6f] dark:text-dark-muted hover:opacity-70">
          Back to pricing
        </Link>
      </div>
    );
  }

  if (status === "loading" || !session || stage === "loading") {
    return <FullPageLoader label="Preparing your checkout…" />;
  }

  return (
    <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg">
      {/* Header */}
      <div className="px-4 sm:px-8 pt-4 sm:pt-6 flex items-center justify-between">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-[#1a3a35] dark:text-dark-text text-xs sm:text-sm hover:opacity-70 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </Link>
        <div className="flex items-center gap-2">
          <Image src="/icon.png" alt="Synaptara" width={24} height={24} className="rounded-lg" />
          <span className="font-display text-sm font-semibold text-[#1a3a35] dark:text-dark-text">Synaptara</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {stage === "success" ? (
          <SuccessPanel planName={plan.name} />
        ) : stage === "unavailable" ? (
          <UnavailablePanel reason={unavailableReason} planName={plan.name} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-start">
            {/* Left: payment method */}
            <div className="order-2 lg:order-1">
              <h1 className="font-display text-2xl sm:text-3xl text-[#1a3a35] dark:text-dark-text mb-6">
                Configure your plan
              </h1>

              {stage === "choose" && (
                <ChooseStage
                  savedCards={savedCards}
                  selectedCardId={selectedCardId}
                  onSelect={setSelectedCardId}
                  onPayWithSaved={payWithSavedCard}
                  onUseNewCard={startNewCardCheckout}
                  paying={payingWithSaved}
                />
              )}

              {stage === "new-card" && intent?.client_secret && stripeElementsPromise && (
                <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-5 sm:p-6">
                  <p className="text-sm font-semibold text-[#1a3a35] dark:text-dark-text mb-4">Pay with card</p>
                  <Elements stripe={stripeElementsPromise} options={{ clientSecret: intent.client_secret }}>
                    <CheckoutForm
                      token={token!}
                      subscriptionId={intent.subscription_id}
                      clientSecret={intent.client_secret}
                      onSuccess={() => setStage("success")}
                    />
                  </Elements>
                  {savedCards.length > 0 && (
                    <button
                      onClick={() => setStage("choose")}
                      className="mt-4 text-xs text-[#4a7c6f] dark:text-dark-muted hover:opacity-70 underline"
                    >
                      ‹ Use a saved card instead
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: plan summary */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-8">
              <PlanSummaryCard planName={plan.name} priceLabel={plan.priceLabel} features={plan.features.slice(0, 4)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Choose: saved card fast path or switch to new-card form ────────────── */
function ChooseStage({
  savedCards,
  selectedCardId,
  onSelect,
  onPayWithSaved,
  onUseNewCard,
  paying,
}: {
  savedCards: PaymentMethodOut[];
  selectedCardId: string | null;
  onSelect: (id: string) => void;
  onPayWithSaved: () => void;
  onUseNewCard: () => void;
  paying: boolean;
}) {
  if (savedCards.length === 0) {
    // No saved cards — jump straight into new-card entry.
    return (
      <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-6 text-center">
        <p className="text-sm text-[#4a7c6f] dark:text-dark-muted mb-4">
          You don&apos;t have a saved payment method yet.
        </p>
        <button
          onClick={onUseNewCard}
          className="w-full bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-semibold py-3.5 rounded-full hover:bg-[#2d5248] transition-colors"
        >
          Add a card
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-5 sm:p-6">
      <p className="text-sm font-semibold text-[#1a3a35] dark:text-dark-text mb-4">Pay with</p>

      <div className="space-y-2.5">
        {savedCards.map((card) => {
          const meta = BRAND_META[card.brand];
          const active = card.id === selectedCardId;
          return (
            <button
              key={card.id}
              onClick={() => onSelect(card.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                active
                  ? "border-[#1a3a35] dark:border-dark-text ring-1 ring-[#1a3a35] dark:ring-dark-text bg-[#f5f3ee] dark:bg-white/5"
                  : "border-[#dedad0] dark:border-dark-border hover:bg-[#f5f3ee] dark:hover:bg-white/5"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  active ? "border-[#1a3a35] dark:border-dark-text" : "border-[#c8c4b4] dark:border-dark-border"
                }`}
              >
                {active && <span className="w-2 h-2 rounded-full bg-[#1a3a35] dark:bg-dark-text" />}
              </span>
              {meta.badge}
              <span className="text-sm text-[#1a3a35] dark:text-dark-text">•••• {card.last4}</span>
              <span className="text-xs text-[#a09c8e] dark:text-[#7d9691] ml-auto">{card.expiry}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onPayWithSaved}
        disabled={!selectedCardId || paying}
        className="mt-5 w-full bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-semibold py-3.5 rounded-full hover:bg-[#2d5248] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {paying ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Processing…
          </>
        ) : (
          "Subscribe"
        )}
      </button>

      <div className="flex items-center gap-3 my-5">
        <span className="flex-1 h-px bg-[#e4e0d4] dark:bg-dark-border" />
        <span className="text-xs text-[#a09c8e] dark:text-[#7d9691]">OR</span>
        <span className="flex-1 h-px bg-[#e4e0d4] dark:bg-dark-border" />
      </div>

      <button
        onClick={onUseNewCard}
        className="w-full border border-[#dedad0] dark:border-dark-border text-[#1a3a35] dark:text-dark-text text-sm font-medium py-3 rounded-full hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors"
      >
        Use a different card
      </button>
    </div>
  );
}

/* ── Right-hand plan summary card (matches the reference layout) ────────── */
function PlanSummaryCard({
  planName,
  priceLabel,
  features,
}: {
  planName: string;
  priceLabel: string;
  features: string[];
}) {
  return (
    <div className="bg-[#1a3a35] dark:bg-dark-surface-2 rounded-2xl p-6 sm:p-7">
      <h2 className="font-display text-2xl text-[#EDEADE] dark:text-dark-text mb-4">{planName} plan</h2>

      <p className="text-xs font-medium text-[#99ada7] dark:text-[#8fada4] mb-2.5">Top features</p>
      <ul className="space-y-2.5 mb-5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-[#EDEADE] dark:text-dark-text">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5 text-[#7db8a8]">
              <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="leading-snug">{f}</span>
          </li>
        ))}
      </ul>

      <div className="border-t border-[#EDEADE]/10 dark:border-white/10 pt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#99ada7] dark:text-[#8fada4]">Monthly subscription</span>
          <span className="text-[#EDEADE] dark:text-dark-text">{priceLabel}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#99ada7] dark:text-[#8fada4]">Estimated tax</span>
          <span className="text-[#EDEADE] dark:text-dark-text">PKR 0</span>
        </div>
        <div className="flex items-center justify-between text-sm font-semibold pt-1">
          <span className="text-[#EDEADE] dark:text-dark-text">Due today</span>
          <span className="text-[#EDEADE] dark:text-dark-text">{priceLabel}</span>
        </div>
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-[#99ada7] dark:text-[#8fada4]">
        Renews monthly until cancelled. You can cancel anytime from Settings. By subscribing, you agree to our{" "}
        <Link href="/legal/terms" className="underline hover:opacity-80">Terms of Use</Link> and have read our{" "}
        <Link href="/legal/privacy" className="underline hover:opacity-80">Privacy Policy</Link>.
      </p>
    </div>
  );
}

function SuccessPanel({ planName }: { planName: string }) {
  return (
    <div className="max-w-md mx-auto text-center py-12">
      <div className="w-16 h-16 rounded-full bg-[#1a3a35] dark:bg-dark-surface-2 flex items-center justify-center mx-auto mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M4 12.5l5 5L20 6" stroke="#EDEADE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="font-display text-2xl text-[#1a3a35] dark:text-dark-text mb-2">You&apos;re all set</h1>
      <p className="text-sm text-[#4a7c6f] dark:text-dark-muted mb-8">
        Your account is now on the <span className="font-semibold text-[#1a3a35] dark:text-dark-text">{planName}</span> plan.
      </p>
      <Link
        href="/dashboard"
        className="inline-block bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-semibold px-8 py-3.5 rounded-full hover:bg-[#2d5248] transition-colors"
      >
        Go to dashboard
      </Link>
    </div>
  );
}

function UnavailablePanel({ reason, planName }: { reason: string | null; planName: string }) {
  return (
    <div className="max-w-md mx-auto text-center py-12">
      <div className="w-16 h-16 rounded-full bg-[#f5f3ee] dark:bg-dark-surface-2 flex items-center justify-center mx-auto mb-6">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#4a7c6f" strokeWidth="1.6" />
          <path d="M12 8v5M12 16h.01" stroke="#4a7c6f" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="font-display text-2xl text-[#1a3a35] dark:text-dark-text mb-2">Payments aren&apos;t set up yet</h1>
      <p className="text-sm text-[#4a7c6f] dark:text-dark-muted mb-8">
        {reason ?? `We couldn't start checkout for the ${planName} plan. Please try again shortly.`}
      </p>
      <Link
        href="/pricing"
        className="inline-block border border-[#dedad0] dark:border-dark-border text-[#1a3a35] dark:text-dark-text text-sm font-medium px-8 py-3.5 rounded-full hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors"
      >
        Back to pricing
      </Link>
    </div>
  );
}
