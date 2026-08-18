"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import ProfileDropdown from "@/app/components/ProfileDropdown";
import FullPageLoader from "@/app/components/FullPageLoader";
import AvatarUploader from "@/app/components/AvatarUploader";
import { authApi, papersApi, type SavedPaperOut, type PlanId } from "@/lib/api";
import { PLANS, isPlanId } from "@/lib/plans";
import { useTheme } from "@/providers/ThemeProvider";
import { useToast } from "@/providers/ToastProvider";
import { useAvatar } from "@/providers/AvatarProvider";
import PaymentMethods from "@/app/components/PaymentMethods";

type Tab = "profile" | "settings" | "billing";

/* ── Nav item ────────────────────────────────────────────────────────────── */
function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
        active ? "bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text" : "text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text hover:bg-black/5"
      }`}
    >
      <span className={active ? "opacity-90" : "opacity-70"}>{icon}</span>
      {label}
    </button>
  );
}

/* ── Profile tab ─────────────────────────────────────────────────────────── */
function ProfileTab({ session, token }: {
  session: ReturnType<typeof useSession>["data"];
  token: string;
}) {
  const name  = session?.user?.name  ?? "";
  const email = session?.user?.email ?? "";
  const { avatarUrl } = useAvatar();

  const [displayName, setDisplayName]   = useState(name);
  const [status, setStatus]             = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg]         = useState("");
  const [savedPapers, setSavedPapers]   = useState<SavedPaperOut[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!token) return;
    papersApi.getSaved(token)
      .then(setSavedPapers)
      .catch(() => {})
      .finally(() => setLoadingPapers(false));
  }, [token]);

  async function handleSave() {
    if (!displayName.trim()) return;
    setStatus("saving");
    setErrorMsg("");
    try {
      await authApi.updateProfile(token, { name: displayName.trim() });
      setStatus("saved");
      toast.success("Profile updated ✓");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save.";
      setErrorMsg(msg);
      setStatus("error");
      toast.error("Couldn't update your profile");
    }
  }

  async function handleRemovePaper(paperId: string) {
    try {
      await papersApi.remove(token, paperId);
      setSavedPapers((prev) => prev.filter((p) => p.id !== paperId));
      toast.success("Removed from Library");
    } catch {
      toast.error("Couldn't remove the paper");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-[#1a3a35] dark:text-dark-text mb-1">Profile</h2>
        <p className="text-sm text-[#4a7c6f] dark:text-dark-muted">Manage your personal information.</p>
      </div>

      {/* Avatar */}
      <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-6">
        <p className="text-sm font-semibold text-[#1a3a35] dark:text-dark-text mb-4">Profile picture</p>
        <AvatarUploader
          token={token}
          currentImage={avatarUrl}
          fallbackLetter={(displayName || name)[0]?.toUpperCase() ?? "?"}
        />
      </div>

      {/* Personal info */}
      <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-6 space-y-4">
        <p className="text-sm font-semibold text-[#1a3a35] dark:text-dark-text">Personal information</p>

        <div>
          <label className="block text-xs font-medium text-[#1a3a35] dark:text-dark-text mb-1.5">Full name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setStatus("idle"); }}
            className="w-full border border-[#dedad0] dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-[#1a3a35] dark:text-dark-text outline-none focus:border-[#4a7c6f] focus:ring-2 focus:ring-[#4a7c6f]/10 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#1a3a35] dark:text-dark-text mb-1.5">Email address</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full border border-[#dedad0] dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-[#4a7c6f] dark:text-dark-muted bg-[#f5f3ee] dark:bg-dark-surface cursor-not-allowed"
          />
          <p className="text-xs text-[#a09c8e] dark:text-[#7d9691] mt-1">Email cannot be changed.</p>
        </div>

        {errorMsg && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={status === "saving" || !displayName.trim() || displayName.trim() === name}
          className="bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#2d5248] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {status === "saving" && (
            <div className="w-3.5 h-3.5 border-2 border-[#EDEADE] dark:border-white/15 border-t-transparent rounded-full animate-spin" />
          )}
          {status === "saved" ? "✓ Saved" : status === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Saved library */}
      <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-6">
        <p className="text-sm font-semibold text-[#1a3a35] dark:text-dark-text mb-4">
          Saved papers
          {savedPapers.length > 0 && (
            <span className="ml-2 text-xs font-normal text-[#4a7c6f] dark:text-dark-muted">({savedPapers.length})</span>
          )}
        </p>

        {loadingPapers ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse h-14 bg-[#f5f3ee] dark:bg-dark-surface rounded-xl" />
            ))}
          </div>
        ) : savedPapers.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-[#4a7c6f] dark:text-dark-muted">No saved papers yet.</p>
            <Link href="/search" className="mt-2 inline-block text-xs font-medium text-[#1a3a35] dark:text-dark-text underline underline-offset-2 hover:text-[#2d5248]">
              Start searching →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {savedPapers.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 p-3 rounded-xl hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors group">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#4a7c6f] dark:text-dark-muted">{p.source}</span>
                    <span className="text-xs text-[#a09c8e] dark:text-[#7d9691]">{p.year}</span>
                  </div>
                  <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text line-clamp-1">{p.title}</p>
                  <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5 line-clamp-1">{p.authors}</p>
                </div>
                <button
                  onClick={() => handleRemovePaper(p.id)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-[#c8c4b4] dark:text-[#5f7d76] hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from library"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Delete account confirmation modal ──────────────────────────────────── */
function DeleteAccountModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canConfirm = confirmText.trim().toUpperCase() === "DELETE" && status !== "deleting";

  async function handleConfirm() {
    if (!canConfirm) return;
    setStatus("deleting");
    setErrorMsg("");
    try {
      await onConfirm();
      // onConfirm handles sign-out / redirect on success; modal unmounts with the page.
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete account. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={status === "deleting" ? undefined : onClose} />

      <div className="relative w-full sm:max-w-sm bg-white dark:bg-dark-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.5L1 15.5h16L9 1.5z" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 7v3.5" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="9" cy="13" r="0.9" fill="#dc2626" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg text-[#1a3a35] dark:text-dark-text">Delete your account?</h3>
            <p className="text-sm text-[#4a7c6f] dark:text-dark-muted mt-1">
              This permanently deletes your account, saved papers, search history, reports, alerts, and payment
              details from our database. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-2">
          <label className="block text-xs font-medium text-[#1a3a35] dark:text-dark-text mb-1.5">
            Type <span className="font-semibold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={status === "deleting"}
            placeholder="DELETE"
            autoFocus
            className="w-full border border-[#dedad0] dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-[#1a3a35] dark:text-dark-text bg-white dark:bg-dark-surface-2 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all disabled:opacity-60"
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2 mt-3">
            {errorMsg}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 mt-6">
          <button
            onClick={onClose}
            disabled={status === "deleting"}
            className="flex-1 text-sm font-medium text-[#1a3a35] dark:text-dark-text border border-[#dedad0] dark:border-dark-border px-4 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-red-600 px-4 py-2.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === "deleting" && (
              <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
            )}
            {status === "deleting" ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ token, onAccountDeleted }: { token: string; onAccountDeleted: () => Promise<void> }) {
  const [emailAlerts, setEmailAlerts]   = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingPref, setSavingPref]     = useState<"email" | "digest" | null>(null);
  const [language, setLanguage]         = useState("English");
  const { theme, toggleTheme }          = useTheme();
  const darkMode = theme === "dark";
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!token) return;
    authApi.me(token)
      .then((u) => {
        setEmailAlerts(u.email_alerts_enabled);
        setWeeklyDigest(u.weekly_digest_enabled);
      })
      .catch(() => {})
      .finally(() => setPrefsLoading(false));
  }, [token]);

  const handleToggleEmailAlerts = async () => {
    const next = !emailAlerts;
    setEmailAlerts(next); // optimistic
    setSavingPref("email");
    try {
      await authApi.updateNotifications(token, { email_alerts_enabled: next });
      toast.success(next ? "Email alerts enabled" : "Email alerts disabled");
    } catch {
      setEmailAlerts(!next); // revert
      toast.error("Couldn't update email alerts");
    } finally {
      setSavingPref(null);
    }
  };

  const handleToggleWeeklyDigest = async () => {
    const next = !weeklyDigest;
    setWeeklyDigest(next); // optimistic
    setSavingPref("digest");
    try {
      await authApi.updateNotifications(token, { weekly_digest_enabled: next });
      toast.success(next ? "Weekly digest enabled" : "Weekly digest disabled");
    } catch {
      setWeeklyDigest(!next); // revert
      toast.error("Couldn't update weekly digest");
    } finally {
      setSavingPref(null);
    }
  };

  const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${checked ? "bg-[#1a3a35] dark:bg-dark-surface-2" : "bg-[#dedad0] dark:bg-dark-border"}`}
      style={{ height: "22px" }}
    >
      <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white dark:bg-[#EDEADE] rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
        style={{ width: "18px", height: "18px" }}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-[#1a3a35] dark:text-dark-text mb-1">Settings</h2>
        <p className="text-sm text-[#4a7c6f] dark:text-dark-muted">Manage your preferences and notifications.</p>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-6 space-y-4">
        <p className="text-sm font-semibold text-[#1a3a35] dark:text-dark-text">Notifications</p>
        {[
          { key: "email" as const, label: "Email alerts", desc: "Get notified when new papers match your alerts", checked: emailAlerts, toggle: handleToggleEmailAlerts },
          { key: "digest" as const, label: "Weekly digest", desc: "A summary of the week's top research in your topics", checked: weeklyDigest, toggle: handleToggleWeeklyDigest },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 py-2 border-b border-[#f0ece4] dark:border-dark-border last:border-0">
            <div>
              <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text">{item.label}</p>
              <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5">{item.desc}</p>
            </div>
            <Toggle checked={item.checked} onChange={item.toggle} disabled={prefsLoading || savingPref === item.key} />
          </div>
        ))}
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-6 space-y-4">
        <p className="text-sm font-semibold text-[#1a3a35] dark:text-dark-text">Appearance</p>
        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text">Dark mode</p>
            <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5">Switch the whole app to a dark color scheme</p>
          </div>
          <Toggle checked={darkMode} onChange={toggleTheme} />
        </div>
        <div className="py-2 border-t border-[#f0ece4] dark:border-dark-border">
          <label className="block text-sm font-medium text-[#1a3a35] dark:text-dark-text mb-2">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full border border-[#dedad0] dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-[#1a3a35] dark:text-dark-text outline-none focus:border-[#4a7c6f] transition-all bg-white dark:bg-dark-surface"
          >
            {["English", "French", "German", "Spanish", "Arabic", "Urdu"].map(l => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-dark-surface border border-red-100 dark:border-red-500/20 rounded-2xl p-6">
        <p className="text-sm font-semibold text-red-600 mb-3">Danger zone</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text">Delete account</p>
            <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5">Permanently remove your account and all data.</p>
          </div>
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="text-xs font-medium text-red-600 border border-red-200 dark:border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
          >
            Delete
          </button>
        </div>
      </div>

      {deleteModalOpen && (
        <DeleteAccountModal
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={async () => {
            await authApi.deleteAccount(token);
            await onAccountDeleted();
          }}
        />
      )}
    </div>
  );
}

/* ── Billing tab ────────────────────────────────────────────────────────── */
function BillingTab({ token }: { token: string }) {
  const [plan, setPlan] = useState<PlanId>("free");
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    if (!token) return;
    authApi
      .me(token)
      .then((u) => setPlan(isPlanId(u.plan) ? u.plan : "free"))
      .catch(() => {})
      .finally(() => setLoadingPlan(false));
  }, [token]);

  const current = PLANS[plan];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-[#1a3a35] dark:text-dark-text mb-1">Plan & Billing</h2>
        <p className="text-sm text-[#4a7c6f] dark:text-dark-muted">Manage your subscription and payment details.</p>
      </div>

      {/* Current plan */}
      <div className="bg-[#1a3a35] dark:bg-dark-surface-2 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-[#99ada7] dark:text-[#8fada4] font-medium uppercase tracking-widest mb-1">Current plan</p>
            <p className="font-display text-2xl text-[#EDEADE] dark:text-dark-text font-semibold">
              {loadingPlan ? "…" : current.name}
            </p>
            <p className="text-sm text-[#99ada7] dark:text-[#8fada4] mt-1">{current.priceLabel} / month</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#EDEADE]/10 dark:bg-white/10 text-[#EDEADE] dark:text-dark-text text-xs font-medium border border-[#EDEADE]/20 dark:border-white/15">
            Active
          </span>
        </div>
        <div className="mt-4 pt-4 border-t border-[#EDEADE]/10 dark:border-white/10">
          <p className="text-xs text-[#99ada7] dark:text-[#8fada4] mb-2">Included in your plan:</p>
          <ul className="space-y-1.5">
            {current.features.slice(0, 3).map(f => (
              <li key={f} className="flex items-center gap-2 text-xs text-[#c5d4cf] dark:text-[#c5d4cf]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#4a7c6f" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/pricing"
          className="mt-4 inline-flex items-center gap-2 bg-[#EDEADE] dark:bg-dark-bg text-[#1a3a35] dark:text-dark-text text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#dedad0] transition-colors"
        >
          {plan === "pro" ? "Manage plan" : "Upgrade plan"} →
        </Link>
      </div>

      {/* Usage */}
      <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-6">
        <p className="text-sm font-semibold text-[#1a3a35] dark:text-dark-text mb-4">Usage this month</p>
        <div className="space-y-4">
          {[
            { label: "AI searches", used: 18, limit: 25 },
            { label: "Document uploads", used: 2, limit: 5 },
            { label: "Reports generated", used: 1, limit: 3 },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-[#1a3a35] dark:text-dark-text">{item.label}</span>
                <span className="text-[#4a7c6f] dark:text-dark-muted">{item.used} / {item.limit}</span>
              </div>
              <div className="h-1.5 bg-[#f0ece4] dark:bg-dark-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1a3a35] dark:bg-dark-surface-2 rounded-full transition-all"
                  style={{ width: `${Math.min((item.used / item.limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment methods */}
      <PaymentMethods token={token} />
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────────── */
const NavIcons = {
  profile: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  billing: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 10.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

/* ── Main profile page ───────────────────────────────────────────────────── */
function ProfileContent() {
  const { data: session, status } = useSession();
  const router        = useRouter();
  const searchParams  = useSearchParams();

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const token = (session?.user as Record<string, unknown>)?.accessToken as string | undefined;
  const firstName = session?.user?.name?.split(" ")[0] ?? "Researcher";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  useEffect(() => {
    const tab = searchParams.get("tab") as Tab | null;
    if (tab && ["profile", "settings", "billing"].includes(tab)) setActiveTab(tab);
  }, [searchParams]);

  if (status === "loading" || status === "unauthenticated") {
    return <FullPageLoader label="Loading your profile…" />;
  }

  return (
    <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex flex-col">

      {/* Top nav */}
      <header className="w-full bg-[#EDEADE] dark:bg-dark-bg border-b border-[#dedad0] dark:border-dark-border px-4 sm:px-6 h-14 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden p-1.5 text-[#1a3a35] dark:text-dark-text rounded-lg hover:bg-black/5 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.png" alt="Synaptara" width={28} height={28} className="rounded-lg" />
            <span className="font-display text-lg font-semibold text-[#1a3a35] dark:text-dark-text">Synaptara</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors hidden sm:block">
            ← Dashboard
          </Link>
          <ProfileDropdown firstName={firstName} email={session?.user?.email ?? ""} />
        </div>
      </header>

      <div className="flex flex-1 relative">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/20 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-14 left-0 h-[calc(100vh-3.5rem)] w-56 bg-[#EDEADE] dark:bg-dark-bg border-r border-[#dedad0] dark:border-dark-border
          flex flex-col z-20 transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {(["profile", "settings", "billing"] as Tab[]).map((t) => (
              <NavItem
                key={t}
                icon={NavIcons[t]}
                label={t.charAt(0).toUpperCase() + t.slice(1)}
                active={activeTab === t}
                onClick={() => { setActiveTab(t); setSidebarOpen(false); }}
              />
            ))}
            <div className="pt-2 border-t border-[#dedad0] dark:border-dark-border mt-2">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l4-4-4-4M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-auto">
          <div className="max-w-2xl mx-auto">
            {activeTab === "profile"  && <ProfileTab session={session} token={token ?? ""} />}
            {activeTab === "settings" && (
              <SettingsTab
                token={token ?? ""}
                onAccountDeleted={() => signOut({ callbackUrl: "/" })}
              />
            )}
            {activeTab === "billing"  && <BillingTab token={token ?? ""} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#1a3a35] dark:border-dark-border border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
