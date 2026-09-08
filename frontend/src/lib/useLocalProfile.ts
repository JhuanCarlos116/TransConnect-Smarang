"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "transconnect-profile";

export interface LocalProfile {
  name: string;
  photoDataUrl: string | null;
}

const EMPTY_PROFILE: LocalProfile = { name: "", photoDataUrl: null };

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify() {
  listeners.forEach((cb) => cb());
}

function readProfile(): LocalProfile {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as Partial<LocalProfile>;
    return { name: parsed.name ?? "", photoDataUrl: parsed.photoDataUrl ?? null };
  } catch {
    return EMPTY_PROFILE;
  }
}

function getServerSnapshot(): LocalProfile {
  return EMPTY_PROFILE;
}

/**
 * Profile (name + photo) is per-device, stored in localStorage -- there is no
 * account/login system in this project (see AppHeader's history note), so
 * this is deliberately not a "real" identity: switching phone/browser/private
 * window loses it, and nothing here is shared between visitors. It only
 * exists so the same person doesn't have to retype their name for every
 * report/comment on the same device.
 *
 * useSyncExternalStore (not useState(readProfile)) on purpose: a lazy
 * useState initializer re-runs during the client's hydration render, and by
 * then `window` already exists, so it would disagree with the server-
 * rendered pass (which always sees an empty profile) -- a real hydration
 * mismatch. getServerSnapshot keeps the first client render aligned with
 * the server; the real localStorage value only takes effect once mounted.
 */
export function useLocalProfile() {
  const profile = useSyncExternalStore(subscribe, readProfile, getServerSnapshot);

  const setProfile = useCallback((next: LocalProfile) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing / storage disabled -- profile just won't persist.
    }
    notify();
  }, []);

  // True once mounted in the browser -- consumers use this to avoid flashing
  // a placeholder photo/name before the real localStorage read has happened.
  const loaded = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return { profile, setProfile, loaded };
}
