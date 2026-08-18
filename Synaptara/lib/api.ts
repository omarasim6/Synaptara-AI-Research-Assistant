/**
 * Synaptara API client
 * Wraps all calls to the FastAPI backend.
 *
 * There are two different network paths to the same backend, and they are
 * NOT interchangeable in Docker:
 *
 *  - Browser (client components, "use client" code): must use
 *    NEXT_PUBLIC_API_URL, e.g. http://localhost:8000/api/v1 — the backend
 *    port published to the host machine. The browser has no knowledge of
 *    Docker's internal network, so a Compose service name like
 *    "http://api:8000" would fail to resolve here.
 *
 *  - Server (NextAuth's authorize()/signIn() callbacks, and Next.js Route
 *    Handlers like /api/register): these run *inside* the Next.js
 *    container, so "http://localhost:8000" would point back at the
 *    frontend container itself, not the backend. These must instead use
 *    INTERNAL_API_URL (defaults to the Compose service DNS name
 *    "http://api:8000/api/v1").
 *
 * `typeof window === "undefined"` reliably distinguishes the two: it's
 * only ever false in the browser.
 */

const BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://api:8000/api/v1"
    : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── Types (mirroring FastAPI schemas) ─────────────────────────────────────────

export interface UserOut {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  plan: string;
  email_alerts_enabled: boolean;
  weekly_digest_enabled: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserOut;
}

export interface SearchResultItem {
  title: string;
  authors: string;
  source: string;
  year: string;
  tag: string;
  summary: string;
  paper_url: string | null;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResultItem[];
  search_id: string;
}

export interface SearchOut {
  id: string;
  query: string;
  results_count: number;
  source_filter: string | null;
  created_at: string;
}

export interface SavedPaperOut {
  id: string;
  title: string;
  authors: string;
  source: string;
  year: string;
  tag: string;
  summary: string;
  paper_url: string | null;
  saved_at: string;
}

export interface ReportOut {
  id: string;
  title: string;
  tag: string;
  pages: number;
  created_at: string;
}

export interface ReportDetailOut extends ReportOut {
  content: string | null;
}

export interface AlertOut {
  id: string;
  source: string;
  query: string;
  is_active: boolean;
  created_at: string;
}

export interface AlertNotificationOut {
  id: string;
  alert_id: string;
  title: string;
  papers_count: number;
  is_read: boolean;
  created_at: string;
  source: string;
  alert_query: string;
}

export interface StatItem {
  label: string;
  value: string;
  delta: string;
}

export interface DashboardStats {
  stats: StatItem[];
  recent_searches: SearchOut[];
  saved_reports: ReportOut[];
  alerts: AlertNotificationOut[];
}

export type CardBrand = "visa" | "mastercard" | "amex" | "maestro";

export interface PaymentMethodOut {
  id: string;
  brand: CardBrand;
  last4: string;
  expiry: string;
  holder_name: string;
  is_primary: boolean;
  created_at: string;
}

export type PlanId = "free" | "go" | "plus" | "pro";

export interface CheckoutIntentOut {
  subscription_id: string;
  plan: PlanId;
  amount_pkr: number;
  client_secret: string | null;
  publishable_key: string | null;
  status: "requires_payment" | "succeeded";
}

export interface SubscriptionOut {
  id: string;
  plan: PlanId;
  amount_pkr: number;
  status: "pending" | "succeeded" | "failed";
  created_at: string;
}

export interface BillingConfig {
  enabled: boolean;
  publishable_key: string | null;
}

export interface SetupIntentOut {
  client_secret: string;
  publishable_key: string;
}

// ── Assistant (Sage) ─────────────────────────────────────────────────────────

export interface AssistantConfig {
  name: string;
}

export interface AssistantMessageOut {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface AssistantReplyOut {
  conversation_id: string;
  message: AssistantMessageOut;
}

export interface AssistantConversationOut {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AssistantConversationDetailOut extends AssistantConversationOut {
  messages: AssistantMessageOut[];
}

export interface PageContext {
  path?: string;
  page_name?: string;
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

/**
 * FastAPI returns errors in two shapes:
 *  - `HTTPException(detail="...")`               → { detail: "some string" }
 *  - Pydantic validation errors (422)             → { detail: [{ msg: "...", ... }, ...] }
 * This normalizes both into a single readable string, stripping Pydantic's
 * "Value error, " prefix from custom @field_validator messages.
 */
function extractErrorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg.replace(/^Value error,\s*/, "");
  }
  return fallback || "Something went wrong.";
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(rest.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(extractErrorMessage(body, res.statusText));
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (name: string, email: string, password: string): Promise<TokenResponse> =>
    apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string): Promise<TokenResponse> =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  googleAuth: (email: string, name: string, avatar_url?: string | null): Promise<TokenResponse> =>
    apiFetch("/auth/google", {
      method: "POST",
      body: JSON.stringify({ email, name, avatar_url }),
    }),

  me: (token: string): Promise<UserOut> =>
    apiFetch("/auth/me", { token }),

  updateProfile: (token: string, data: { name?: string; avatar_url?: string }): Promise<UserOut> =>
    apiFetch("/auth/profile", {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  deleteAccount: (token: string): Promise<void> =>
    apiFetch("/auth/me", { method: "DELETE", token }),

  updateNotifications: (
    token: string,
    data: { email_alerts_enabled?: boolean; weekly_digest_enabled?: boolean }
  ): Promise<UserOut> =>
    apiFetch("/auth/notifications", {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),
};

// ── Search ────────────────────────────────────────────────────────────────────

export const searchApi = {
  search: (token: string, query: string, source_filter?: string): Promise<SearchResponse> =>
    apiFetch("/search", {
      method: "POST",
      token,
      body: JSON.stringify({ query, source_filter: source_filter ?? null }),
    }),

  getHistory: (token: string, limit = 10): Promise<SearchOut[]> =>
    apiFetch(`/search/history?limit=${limit}`, { token }),

  deleteHistory: (token: string, searchId: string): Promise<void> =>
    apiFetch(`/search/history/${searchId}`, { method: "DELETE", token }),
};

// ── Papers ────────────────────────────────────────────────────────────────────

export const papersApi = {
  getSaved: (token: string): Promise<SavedPaperOut[]> =>
    apiFetch("/papers/saved", { token }),

  save: (token: string, paper: Omit<SavedPaperOut, "id" | "saved_at">): Promise<SavedPaperOut> =>
    apiFetch("/papers/save", {
      method: "POST",
      token,
      body: JSON.stringify(paper),
    }),

  remove: (token: string, paperId: string): Promise<void> =>
    apiFetch(`/papers/saved/${paperId}`, { method: "DELETE", token }),
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reportsApi = {
  getAll: (token: string): Promise<ReportOut[]> =>
    apiFetch("/reports", { token }),

  getOne: (token: string, reportId: string): Promise<ReportDetailOut> =>
    apiFetch(`/reports/${reportId}`, { token }),

  create: (token: string, data: { title: string; tag: string; pages?: number }): Promise<ReportOut> =>
    apiFetch("/reports", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  generate: (token: string, data: { query: string; source_filter?: string }): Promise<ReportDetailOut> =>
    apiFetch("/reports/generate", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, reportId: string): Promise<void> =>
    apiFetch(`/reports/${reportId}`, { method: "DELETE", token }),
};

// ── Alerts ────────────────────────────────────────────────────────────────────

export const alertsApi = {
  getAll: (token: string): Promise<AlertOut[]> =>
    apiFetch("/alerts", { token }),

  create: (token: string, data: { source: string; query: string }): Promise<AlertOut> =>
    apiFetch("/alerts", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, alertId: string): Promise<void> =>
    apiFetch(`/alerts/${alertId}`, { method: "DELETE", token }),

  getNotifications: (token: string): Promise<AlertNotificationOut[]> =>
    apiFetch("/alerts/notifications", { token }),

  markRead: (token: string, notificationId: string): Promise<void> =>
    apiFetch(`/alerts/notifications/${notificationId}/read`, { method: "PATCH", token }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: (token: string): Promise<DashboardStats> =>
    apiFetch("/dashboard/stats", { token }),
};

// ── Payment Methods ─────────────────────────────────────────────────────────
// NOTE: Only PCI-safe, display-oriented fields (brand, last4, expiry, holder
// name) ever pass through this client — never a full card number or CVV.

export const paymentApi = {
  getAll: (token: string): Promise<PaymentMethodOut[]> =>
    apiFetch("/payment-methods", { token }),

  add: (
    token: string,
    data: { brand: CardBrand; last4: string; expiry: string; holder_name: string }
  ): Promise<PaymentMethodOut> =>
    apiFetch("/payment-methods", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (
    token: string,
    cardId: string,
    data: { holder_name?: string; expiry?: string }
  ): Promise<PaymentMethodOut> =>
    apiFetch(`/payment-methods/${cardId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  setPrimary: (token: string, cardId: string): Promise<PaymentMethodOut> =>
    apiFetch(`/payment-methods/${cardId}/primary`, { method: "PATCH", token }),

  remove: (token: string, cardId: string): Promise<void> =>
    apiFetch(`/payment-methods/${cardId}`, { method: "DELETE", token }),
};

// ── Billing (Stripe checkout) ───────────────────────────────────────────────

export const billingApi = {
  getConfig: (): Promise<BillingConfig> => apiFetch("/billing/config"),

  startCheckout: (
    token: string,
    data: { plan: PlanId; saved_payment_method_id?: string }
  ): Promise<CheckoutIntentOut> =>
    apiFetch("/billing/checkout", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  confirmCheckout: (
    token: string,
    data: { subscription_id: string; save_card?: boolean }
  ): Promise<SubscriptionOut> =>
    apiFetch("/billing/checkout/confirm", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  getSubscriptions: (token: string): Promise<SubscriptionOut[]> =>
    apiFetch("/billing/subscriptions", { token }),

  createSetupIntent: (token: string): Promise<SetupIntentOut> =>
    apiFetch("/billing/setup-intent", { method: "POST", token }),

  confirmSetupIntent: (
    token: string,
    data: { setup_intent_id: string; make_primary?: boolean }
  ): Promise<PaymentMethodOut> =>
    apiFetch("/billing/setup-intent/confirm", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),
};

// ── Assistant (Sage) ─────────────────────────────────────────────────────────

export const assistantApi = {
  getConfig: (): Promise<AssistantConfig> => apiFetch("/assistant/config"),

  sendMessage: (
    token: string,
    data: { message: string; conversation_id?: string | null; page_context?: PageContext }
  ): Promise<AssistantReplyOut> =>
    apiFetch("/assistant/message", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  getConversation: (token: string, conversationId: string): Promise<AssistantConversationDetailOut> =>
    apiFetch(`/assistant/conversations/${conversationId}`, { token }),

  listConversations: (token: string): Promise<AssistantConversationOut[]> =>
    apiFetch("/assistant/conversations", { token }),

  deleteConversation: (token: string, conversationId: string): Promise<void> =>
    apiFetch(`/assistant/conversations/${conversationId}`, { method: "DELETE", token }),
};
