"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "transconnect-dishub-session";

// Hardcoded single account -- there is no user/account system in this
// project (see task.py's assigned_to and AppHeader's history note on the
// removed fake "Sesi Aktif (Admin)" menu for the same reasoning), and
// account creation / password reset are explicitly out of scope for now.
// If DISHUB ever needs more than one account, this is the place a real
// user table replaces these two constants.
const DISHUB_USERNAME = "DISHUB#1";
const DISHUB_PASSWORD = "DISHUB#1jaya";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify() {
  listeners.forEach((cb) => cb());
}

function readSession(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * DISHUB login session -- a localStorage flag, not real auth (no server
 * session/JWT). It never expires on its own; only an explicit logout clears
 * it. That's an accepted tradeoff for a single hardcoded internal account,
 * not something meant to gate genuinely sensitive data.
 *
 * useSyncExternalStore (not useState(readSession)) on purpose: a lazy
 * useState initializer re-runs during the client's hydration render, and by
 * then `window` already exists, so it would disagree with the server-
 * rendered pass (which always sees no session) -- a real hydration mismatch,
 * not just a lint nag. getServerSnapshot fixes the first client render to
 * match the server; only the effect-driven subscription afterward can
 * reveal the real localStorage value.
 */
export function useDishubAuth() {
  const loggedIn = useSyncExternalStore(subscribe, readSession, () => false);

  const login = useCallback((username: string, password: string): boolean => {
    if (username !== DISHUB_USERNAME || password !== DISHUB_PASSWORD) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Private browsing / storage disabled -- login still works for this
      // page load, it just won't persist across a refresh.
    }
    notify();
    return true;
  }, []);

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op
    }
    notify();
  }, []);

  return { loggedIn, login, logout };
}
