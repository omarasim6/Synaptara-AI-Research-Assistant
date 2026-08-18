import type { CardBrand } from "@/lib/api";

export const BRAND_META: Record<CardBrand, { label: string; badge: React.ReactNode }> = {
  mastercard: {
    label: "Mastercard",
    badge: (
      <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
        <circle cx="10.5" cy="9" r="7.5" fill="#EB001B" />
        <circle cx="17.5" cy="9" r="7.5" fill="#F79E1B" fillOpacity="0.9" />
      </svg>
    ),
  },
  visa: {
    label: "Visa",
    badge: (
      <svg width="34" height="14" viewBox="0 0 34 14" fill="none">
        <text x="0" y="12" fontFamily="Arial, sans-serif" fontStyle="italic" fontWeight="700" fontSize="14" fill="#1A1F71">VISA</text>
      </svg>
    ),
  },
  amex: {
    label: "American Express",
    badge: (
      <svg width="34" height="20" viewBox="0 0 34 20" fill="none">
        <rect width="34" height="20" rx="3" fill="#2E77BC" />
        <text x="17" y="13" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7" fill="#fff">AMEX</text>
      </svg>
    ),
  },
  maestro: {
    label: "Maestro",
    badge: (
      <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
        <circle cx="10.5" cy="9" r="7.5" fill="#EB001B" />
        <circle cx="17.5" cy="9" r="7.5" fill="#00A2E5" fillOpacity="0.85" />
      </svg>
    ),
  },
};
