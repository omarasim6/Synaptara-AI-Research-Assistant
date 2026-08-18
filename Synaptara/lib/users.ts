/**
 * lib/users.ts — thin shim for backward-compatibility.
 *
 * The real user store is now PostgreSQL via FastAPI.
 * This file is kept so any existing import paths don't break.
 * `authOptions.ts` already calls FastAPI directly via `lib/api.ts`,
 * so these functions are only used if some other route still imports them.
 */

import { authApi } from "@/lib/api";

/** Minimal shape that existing callers may expect */
export interface StoredUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/**
 * Verify email + password against the FastAPI backend.
 * Returns a minimal user object on success, null on failure.
 */
export async function verifyUserPassword(
  email: string,
  password: string
): Promise<StoredUser | null> {
  try {
    const data = await authApi.login(email, password);
    return {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      createdAt: data.user.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Create a new user in the FastAPI backend.
 * Throws if the email already exists or validation fails.
 */
export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<StoredUser> {
  const data = await authApi.register(name, email, password);
  return {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    createdAt: data.user.created_at,
  };
}

/**
 * Look up a user by email. Returns undefined if not found.
 * NOTE: this makes a login attempt — only suitable for existence checks
 * where the caller already has the password. For auth flows, use
 * `verifyUserPassword` directly.
 */
export async function findUserByEmail(
  email: string
): Promise<StoredUser | undefined> {
  // We don't expose a public "get user by email" endpoint without auth,
  // so we can only signal existence through the register-conflict response.
  // This is intentionally a no-op to avoid exposing user enumeration.
  return undefined;
}
