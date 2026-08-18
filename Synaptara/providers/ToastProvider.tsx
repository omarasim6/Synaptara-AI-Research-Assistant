"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastVariant = "success" | "error";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  /** Show a success toast, e.g. toast.success("Saved"). */
  success: (message: string) => void;
  /** Show an error toast, e.g. toast.error("Couldn't save the paper"). */
  error: (message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 4000;
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => {
      // Cap the number of toasts on screen at once so a burst of actions
      // (e.g. removing several saved papers quickly) doesn't get messy.
      const next = [...prev, { id, message, variant }];
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    });
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, AUTO_DISMISS_MS);
    timers.current.set(id, timer);
  }, []);

  const success = useCallback((message: string) => push(message, "success"), [push]);
  const error = useCallback((message: string) => push(message, "error"), [push]);

  return (
    <ToastContext.Provider value={{ success, error, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * useToast() — call from any client component to fire toasts:
 *   const toast = useToast();
 *   toast.success("Saved");
 *   toast.error("Couldn't save the paper");
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

/* ── Viewport & individual toast ─────────────────────────────────────────── */

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      // Fixed bottom-right on all breakpoints — a single consistent corner,
      // clear of the mobile sidebar/dropdowns which live at the top.
      className="fixed bottom-4 right-4 left-4 sm:left-auto z-[1000] flex flex-col items-end gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const isError = toast.variant === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`
        pointer-events-auto w-full sm:w-auto sm:min-w-[280px] sm:max-w-sm
        flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg
        animate-toast-in
        ${isError
          ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
          : "bg-[#1a3a35] dark:bg-dark-surface-2 border-[#1a3a35] dark:border-dark-border text-[#EDEADE] dark:text-dark-text"}
      `}
    >
      <span className="shrink-0 mt-0.5">
        {isError ? (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
            <path d="M5 8.3l2 2 4-4.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <p className="text-sm leading-snug flex-1 pt-px">{toast.message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className={`shrink-0 p-0.5 rounded-md transition-colors ${
          isError ? "hover:bg-red-500/10" : "hover:bg-white/10"
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M2.5 2.5l8 8M10.5 2.5l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
