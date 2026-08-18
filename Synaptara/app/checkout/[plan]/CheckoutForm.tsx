"use client";

import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { billingApi } from "@/lib/api";
import { useToast } from "@/providers/ToastProvider";

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "15px",
      fontFamily: "Inter, system-ui, sans-serif",
      color: "#1a3a35",
      "::placeholder": { color: "#a09c8e" },
      iconColor: "#4a7c6f",
    },
    invalid: { color: "#dc2626", iconColor: "#dc2626" },
  },
};

export default function CheckoutForm({
  token,
  subscriptionId,
  clientSecret,
  onSuccess,
}: {
  token: string;
  subscriptionId: string;
  clientSecret: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();

  const [holderName, setHolderName] = useState("");
  const [saveCard, setSaveCard] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    if (!holderName.trim()) {
      setError("Enter the name on your card.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: { name: holderName.trim() },
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Your card couldn't be charged. Please try again.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status !== "succeeded") {
      setError("Payment wasn't completed. Please try again.");
      setSubmitting(false);
      return;
    }

    try {
      await billingApi.confirmCheckout(token, { subscription_id: subscriptionId, save_card: saveCard });
      onSuccess();
    } catch (err) {
      // The charge went through on Stripe's side even if this sync call
      // failed — don't tell the user the payment failed.
      toast.error(err instanceof Error ? err.message : "Payment succeeded, but we couldn't finish setting up your plan. Contact support.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#1a3a35] dark:text-dark-text mb-1.5">
          Name on card
        </label>
        <input
          type="text"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          placeholder="Jane Doe"
          autoComplete="cc-name"
          className="w-full border border-[#dedad0] dark:border-dark-border bg-white dark:bg-dark-surface rounded-xl px-4 py-3 text-sm text-[#1a3a35] dark:text-dark-text outline-none focus:border-[#4a7c6f] focus:ring-2 focus:ring-[#4a7c6f]/10 transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#1a3a35] dark:text-dark-text mb-1.5">
          Card details
        </label>
        <div className="w-full border border-[#dedad0] dark:border-dark-border bg-white dark:bg-dark-surface rounded-xl px-4 py-3.5 focus-within:border-[#4a7c6f] focus-within:ring-2 focus-within:ring-[#4a7c6f]/10 transition-all">
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onChange={(e) => {
              setCardComplete(e.complete);
              if (e.error) setError(e.error.message);
              else setError(null);
            }}
          />
        </div>
        <p className="text-xs text-[#a09c8e] dark:text-[#7d9691] mt-1.5">
          Test mode — use{" "}
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText("4242 4242 4242 4242")}
            className="underline hover:opacity-70"
          >
            4242 4242 4242 4242
          </button>
          , any future date, any CVC.
        </p>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-[#1a3a35] dark:text-dark-text cursor-pointer select-none">
        <input
          type="checkbox"
          checked={saveCard}
          onChange={(e) => setSaveCard(e.target.checked)}
          className="w-4 h-4 rounded border-[#c8c4b4] dark:border-dark-border text-[#1a3a35] focus:ring-[#4a7c6f]/30"
        />
        Save this card for future purchases
      </label>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting || !cardComplete || !holderName.trim()}
        className="w-full bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-semibold py-3.5 rounded-full hover:bg-[#2d5248] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Processing…
          </>
        ) : (
          "Subscribe"
        )}
      </button>
    </form>
  );
}
