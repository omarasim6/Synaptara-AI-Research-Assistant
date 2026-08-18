"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { authApi } from "@/lib/api";

interface AvatarContextValue {
  /** The current avatar as a data URL (or null). Always sourced from the backend. */
  avatarUrl: string | null;
  /** Call after a successful upload to refetch and broadcast the new avatar everywhere. */
  refreshAvatar: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextValue>({
  avatarUrl: null,
  refreshAvatar: async () => {},
});

/**
 * Single source of truth for the user's current avatar image.
 *
 * The NextAuth session cookie deliberately never carries the actual image
 * bytes (see authOptions.ts — a compressed photo is routinely 15-40KB,
 * which blows the ~4KB browser cookie limit and silently corrupts the
 * session). Instead this provider fetches the real avatar_url straight from
 * the backend (source of truth: users.avatar_url) and shares it via context,
 * so every avatar in the app — navbar, dropdown, profile page — reads from
 * the same place and updates together the moment a new photo is uploaded.
 */
export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const token = (session?.user as Record<string, unknown> | undefined)?.accessToken as string | undefined;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const lastFetchedToken = useRef<string | null>(null);

  const fetchAvatar = useCallback(async (tok: string) => {
    try {
      const me = await authApi.me(tok);
      setAvatarUrl(me.avatar_url ?? null);
    } catch {
      // Leave whatever we last had — a transient failure here shouldn't
      // blank out an avatar that was working a moment ago.
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !token) {
      if (status === "unauthenticated") setAvatarUrl(null);
      return;
    }
    if (lastFetchedToken.current === token) return;
    lastFetchedToken.current = token;
    fetchAvatar(token);
  }, [status, token, fetchAvatar]);

  const refreshAvatar = useCallback(async () => {
    if (!token) return;
    await fetchAvatar(token);
    // Bump a tiny counter on the session (not the image itself) so any
    // other tab/listener relying on session-level change detection still
    // sees that something changed, without ever risking the cookie size.
    await update({ avatarBump: true });
  }, [token, fetchAvatar, update]);

  return (
    <AvatarContext.Provider value={{ avatarUrl, refreshAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  return useContext(AvatarContext);
}
