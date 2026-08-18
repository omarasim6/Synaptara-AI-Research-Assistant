import type { PlanId } from "@/lib/api";

export interface PlanMeta {
  id: PlanId;
  name: string;
  tagline: string;
  priceLabel: string;
  priceValuePkr: number;
  cta: string;
  features: string[];
  note: string | null;
}

export const PLANS: Record<PlanId, PlanMeta> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Intelligence for everyday research",
    priceLabel: "PKR 0",
    priceValuePkr: 0,
    cta: "Get Free",
    features: [
      "Limited access to Synaptara AI",
      "Limited questions and uploads",
      "Limited source citations",
      "Limited deep research",
      "Limited memory and context",
    ],
    note: null,
  },
  go: {
    id: "go",
    name: "Go",
    tagline: "Continue researching with access.",
    priceLabel: "PKR 1,400",
    priceValuePkr: 1400,
    cta: "Get Go",
    features: [
      "Everything in Free and:",
      "More access to Synaptara AI",
      "More questions per day",
      "More document uploads",
      "More source citations",
      "Longer memory",
    ],
    note: null,
  },
  plus: {
    id: "plus",
    name: "Plus",
    tagline: "Do more with advanced reasoning",
    priceLabel: "PKR 5,700",
    priceValuePkr: 5700,
    cta: "Get Plus",
    features: [
      "Everything in Go and:",
      "Advanced reasoning over papers",
      "More complex, accurate citations",
      "Expanded deep research mode",
      "Expanded memory and context",
      "Projects, tasks, and saved searches",
      "Early access to new features",
    ],
    note: "Limits apply",
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Maximize your research output",
    priceLabel: "PKR 27,999",
    priceValuePkr: 27999,
    cta: "Get Pro",
    features: [
      "Everything in Plus and:",
      "5x or 20x more usage",
      "Pro-level reasoning depth",
      "Maximum deep research and agent mode",
      "Unlimited file uploads",
      "Maximum memory and context",
      "Expanded projects and saved searches",
      "Research preview of new features",
    ],
    note: "Unlimited with limits.",
  },
};

export const PLAN_LIST: PlanMeta[] = [PLANS.free, PLANS.go, PLANS.plus, PLANS.pro];

export function isPlanId(v: string | undefined | null): v is PlanId {
  return !!v && v in PLANS;
}
