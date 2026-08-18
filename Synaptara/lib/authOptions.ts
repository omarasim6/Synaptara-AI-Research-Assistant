import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { authApi } from "@/lib/api";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        try {
          // Verify credentials against FastAPI and get a JWT
          const data = await authApi.login(credentials.email, credentials.password);
          return {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            // Deliberately NOT data.user.avatar_url: NextAuth seeds the JWT's
            // `picture` claim straight from this `image` field before the
            // jwt() callback even runs, which would put the (often 15-100KB+)
            // base64 avatar data URL into the session cookie on every
            // sign-in. The real avatar always comes from the backend via
            // useAvatar()/AvatarProvider, never from the session — see the
            // jwt() callback below for the full explanation.
            image: null,
            accessToken: data.access_token,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Invalid email or password.";
          throw new Error(msg);
        }
      },
    }),
  ],

  pages: {
    signIn: "/signin",
    error: "/signin",
  },

  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  callbacks: {
    // ── Google: upsert user in FastAPI on every sign-in ──────────────────
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const data = await authApi.googleAuth(
            user.email!,
            user.name!,
            user.image ?? null
          );
          // Attach the FastAPI token and UUID to the NextAuth user object
          (user as unknown as Record<string, unknown>).accessToken = data.access_token;
          (user as unknown as Record<string, unknown>).backendId = data.user.id;
        } catch {
          return false; // Block sign-in if backend call fails
        }
      }
      return true;
    },

    // ── Store backend JWT and UUID in the NextAuth JWT ────────────────────
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.id = (u.backendId as string | undefined) ?? (u.id as string);
        token.accessToken = u.accessToken as string | undefined;
      }
      // IMPORTANT: the NextAuth JWT is stored in a browser cookie, which has
      // a hard ~4KB-per-cookie limit (NextAuth silently chunks across
      // multiple cookies past that, which just moves the failure to the
      // ~8-16KB *total request header* limit instead — large enough
      // cumulative cookies make EVERY request to the app fail with
      // `431 Request Header Fields Too Large`, including the CORS
      // preflight / actual PATCH for the next avatar upload, which the
      // browser reports as a misleading CORS error).
      //
      // Profile pictures are compressed base64 data URLs that routinely run
      // 15-100KB+ — far too big for the cookie. Do NOT put image bytes on
      // the token. Instead we bump a small version counter, and the client
      // re-fetches the actual avatar from the backend (source of truth:
      // users.avatar_url) whenever this changes — see AvatarProvider /
      // useAvatar().
      //
      // NextAuth seeds the token with `picture: user.image` itself, BEFORE
      // this callback ever runs (see its callback.js) — and the credentials
      // `authorize()` above sets `user.image` to the backend's avatar_url.
      // So without this, the huge data URL rides straight into the JWT on
      // every sign-in/refresh regardless of anything done here. Strip it
      // unconditionally; nothing in the app reads token/session.user.image,
      // every real avatar render goes through useAvatar() instead.
      delete (token as Record<string, unknown>).picture;
      if (trigger === "update" && session?.avatarBump) {
        token.avatarVersion = ((token.avatarVersion as number | undefined) ?? 0) + 1;
      }
      return token;
    },

    // ── Expose accessToken + id in the client session ─────────────────────
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).accessToken = token.accessToken;
        (session.user as Record<string, unknown>).avatarVersion = token.avatarVersion ?? 0;
        // `image` is intentionally left as whatever NextAuth set at sign-in
        // (Google's own small avatar URL, or null for credentials sign-in).
        // The *current* avatar always comes from the backend via useAvatar(),
        // never from this cookie-backed field, so it can never blow the
        // cookie size limit no matter how large the uploaded photo is.
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url === baseUrl || url === `${baseUrl}/`) return baseUrl;
      if (url.startsWith("/")) {
        if (url === "/") return `${baseUrl}/dashboard`;
        return `${baseUrl}${url}`;
      }
      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) {
          if (parsed.pathname === "/") return `${baseUrl}/dashboard`;
          return url;
        }
      } catch { /* ignore */ }
      return `${baseUrl}/dashboard`;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
