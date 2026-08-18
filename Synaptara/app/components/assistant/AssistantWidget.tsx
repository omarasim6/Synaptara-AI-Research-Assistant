"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { assistantApi } from "@/lib/api";
import MarkdownLite from "./MarkdownLite";

/* ── Page context: safe, minimal, human-readable name per route ──────────── */
function pageNameForPath(pathname: string): string {
  if (pathname === "/") return "Homepage";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/search")) return "Search";
  if (pathname.startsWith("/profile")) return "Profile & Account";
  if (pathname.startsWith("/pricing")) return "Pricing";
  if (pathname.startsWith("/checkout")) return "Checkout";
  if (pathname.startsWith("/support")) return "Support";
  if (pathname.startsWith("/signin")) return "Sign in";
  if (pathname.startsWith("/signup")) return "Sign up";
  if (pathname.startsWith("/legal")) return "Legal";
  return "Synaptara";
}

const SUGGESTED_PROMPTS = [
  "What is Synaptara?",
  "What can I do here?",
  "How does search work?",
  "Explain my dashboard.",
  "How do I manage my subscription?",
];

/* ── Icons ─────────────────────────────────────────────────────────────── */
const SparkleIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8L10 2z" fill="currentColor" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 8l12-5.5L9.5 14l-1.8-5.2L2 8z" fill="currentColor" />
  </svg>
);

const NewChatIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/* ── Types ─────────────────────────────────────────────────────────────── */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AssistantWidget() {
  const { data: session, status: sessionStatus } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [assistantName, setAssistantName] = useState("Sage");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const isAuthenticated = sessionStatus === "authenticated" && !!token;

  /* Fetch assistant name once (public, no auth needed) */
  useEffect(() => {
    assistantApi
      .getConfig()
      .then((cfg) => setAssistantName(cfg.name))
      .catch(() => {
        /* fall back to default "Sage" — non-critical */
      });
  }, []);

  /* Auto-scroll on new messages */
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, loading]);

  /* Focus input when opened; Escape to close */
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        launcherRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  /* Click outside to close — works on both mobile and desktop */
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        launcherRef.current &&
        !launcherRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    // Use mousedown + touchstart so it fires before click bubbling
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setLastFailedMessage(null);
    setInput("");
  }, []);

  const doSend = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      if (!isAuthenticated) {
        setError("Please sign in to chat with " + assistantName + ".");
        return;
      }

      setError(null);
      setLastFailedMessage(null);

      const userMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: text.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const reply = await assistantApi.sendMessage(token!, {
          message: text.trim(),
          conversation_id: conversationId,
          page_context: {
            path: pathname || undefined,
            page_name: pageNameForPath(pathname || "/"),
          },
        });
        setConversationId(reply.conversation_id);
        const assistantMsg: ChatMessage = {
          id: reply.message.id,
          role: "assistant",
          content: reply.message.content,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        setLastFailedMessage(text.trim());
      } finally {
        setLoading(false);
      }
    },
    [loading, isAuthenticated, assistantName, token, conversationId, pathname]
  );

  const handleSend = useCallback(() => {
    doSend(input);
  }, [doSend, input]);

  const handleRetry = useCallback(() => {
    if (lastFailedMessage) doSend(lastFailedMessage);
  }, [lastFailedMessage, doSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const firstName = (session?.user?.name || "").trim().split(" ")[0] || null;

  return (
    <>
      {/* Launcher — always visible, both mobile and desktop */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="sage-assistant-panel"
        aria-label={open ? `Close ${assistantName} assistant` : `Open ${assistantName}, your Synaptara assistant`}
        className="fixed z-[300] bottom-5 right-5 sm:bottom-6 sm:right-6 flex items-center justify-center w-14 h-14 rounded-full bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text shadow-[0_8px_28px_rgba(26,58,53,0.35)] hover:scale-105 active:scale-95 transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a7c6f] motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        <SparkleIcon size={22} />
      </button>

      {/* Chat panel — floating on both mobile and desktop */}
      {open && (
        <div
          ref={panelRef}
          id="sage-assistant-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed z-[300] bottom-24 right-4 sm:bottom-6 sm:right-6 flex flex-col w-[calc(100vw-2rem)] max-w-[400px] h-[min(560px,calc(100dvh-8rem))] sm:h-[min(680px,calc(100dvh-3rem))] sm:w-[400px] rounded-3xl bg-[#EDEADE] dark:bg-dark-surface border border-[#e8e4d8] dark:border-dark-border shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden animate-[sage-in_0.18s_ease-out] motion-reduce:animate-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-[#e8e4d8] dark:border-dark-border bg-white/60 dark:bg-dark-surface-2/60 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text shrink-0">
                <SparkleIcon size={17} />
              </div>
              <div className="min-w-0">
                <p id={titleId} className="font-display text-[15px] leading-tight text-[#1a3a35] dark:text-dark-text truncate">
                  {assistantName}
                </p>
                <p className="text-[11px] leading-tight text-[#4a7c6f] dark:text-dark-muted truncate">
                  Synaptara&apos;s research assistant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={resetConversation}
                  aria-label="Start a new conversation"
                  title="New conversation"
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-[#4a7c6f] dark:text-dark-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#4a7c6f]"
                >
                  <NewChatIcon />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-[#4a7c6f] dark:text-dark-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#4a7c6f]"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Conversation area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
            {!isAuthenticated && sessionStatus !== "loading" ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text">
                  <SparkleIcon size={20} />
                </div>
                <p className="text-sm text-[#1a3a35] dark:text-dark-text font-medium">
                  Sign in to chat with {assistantName}
                </p>
                <p className="text-xs text-[#4a7c6f] dark:text-dark-muted max-w-[240px]">
                  {assistantName} can answer questions about your account, search, and how to use Synaptara.
                </p>
                <Link
                  href="/signin"
                  onClick={() => setOpen(false)}
                  className="mt-1 px-4 py-2 rounded-full bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Sign in
                </Link>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center gap-5 px-1">
                <div className="text-center space-y-1.5">
                  <div className="mx-auto flex items-center justify-center w-11 h-11 rounded-2xl bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text mb-2">
                    <SparkleIcon size={20} />
                  </div>
                  <p className="font-display text-lg text-[#1a3a35] dark:text-dark-text">
                    {firstName ? `Hi ${firstName}, I'm ${assistantName}.` : `Hi, I'm ${assistantName}.`}
                  </p>
                  <p className="text-[13px] text-[#4a7c6f] dark:text-dark-muted leading-relaxed max-w-[280px] mx-auto">
                    I&apos;m Synaptara&apos;s research assistant. Ask me about search, your
                    dashboard, subscriptions, or how to get the most out of Synaptara.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => doSend(prompt)}
                      className="text-left text-[13px] px-3.5 py-2.5 rounded-xl border border-[#e8e4d8] dark:border-dark-border bg-white/70 dark:bg-dark-surface-2/60 text-[#1a3a35] dark:text-dark-text hover:bg-white dark:hover:bg-dark-surface-2 hover:border-[#c9c2ad] dark:hover:border-dark-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#4a7c6f]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                {loading && <TypingIndicator assistantName={assistantName} />}
                {error && (
                  <div className="flex flex-col gap-2 items-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-[13px] leading-relaxed">
                      {error}
                    </div>
                    {lastFailedMessage && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="text-xs font-medium px-3 py-1.5 rounded-full border border-[#1a3a35]/20 dark:border-dark-border text-[#1a3a35] dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#4a7c6f]"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Composer */}
          {isAuthenticated && (
            <div className="shrink-0 border-t border-[#e8e4d8] dark:border-dark-border bg-white/60 dark:bg-dark-surface-2/60 backdrop-blur-sm px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="flex items-end gap-2 rounded-2xl border border-[#e8e4d8] dark:border-dark-border bg-white dark:bg-dark-surface focus-within:border-[#4a7c6f] dark:focus-within:border-dark-muted transition-colors px-3 py-2">
                <label htmlFor="sage-input" className="sr-only">
                  Message {assistantName}
                </label>
                <textarea
                  id="sage-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${assistantName}…`}
                  rows={1}
                  maxLength={4000}
                  className="flex-1 resize-none bg-transparent outline-none text-[14px] text-[#1a3a35] dark:text-dark-text placeholder:text-[#8fada4] dark:placeholder:text-dark-muted max-h-32 py-1"
                  style={{ minHeight: "24px" }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                  }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                  className="flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text disabled:opacity-35 disabled:cursor-not-allowed hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a7c6f]"
                >
                  <SendIcon />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-[#8fada4] dark:text-dark-muted">
                {assistantName} can make mistakes. Verify important info.
              </p>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes sage-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          #sage-assistant-panel {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}

/* ── Message bubble ────────────────────────────────────────────────────── */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] ${
          isUser
            ? "rounded-br-md bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text"
            : "rounded-bl-md bg-white dark:bg-dark-surface-2/80 border border-[#e8e4d8] dark:border-dark-border text-[#1a3a35] dark:text-dark-text"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap leading-relaxed">{message.content}</span>
        ) : (
          <MarkdownLite content={message.content} />
        )}
      </div>
    </div>
  );
}

/* ── Typing indicator ──────────────────────────────────────────────────── */
function TypingIndicator({ assistantName }: { assistantName: string }) {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label={`${assistantName} is typing`}>
      <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-dark-surface-2/80 border border-[#e8e4d8] dark:border-dark-border flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c6f] dark:bg-dark-muted animate-bounce [animation-delay:-0.3s] motion-reduce:animate-none" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c6f] dark:bg-dark-muted animate-bounce [animation-delay:-0.15s] motion-reduce:animate-none" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c6f] dark:bg-dark-muted animate-bounce motion-reduce:animate-none" />
      </div>
    </div>
  );
}
