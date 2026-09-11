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

/*
 * The parsed profile is cached against the raw JSON string, and THAT is not an
 * optimisation -- it is what makes the hook work at all.
 *
 * useSyncExternalStore compares each render's snapshot with the previous one
 * using Object.is. Parsing on every call returned a brand-new object every time,
 * so React saw "the store changed" on every single render. Mount survived it
 * (nothing had notified the store yet), but pressing Simpan called notify(),
 * the store-change handler read the snapshot, saw a new object, forced a
 * re-render, read another new object, and looped until React gave up:
 *
 *   Warning: The result of getSnapshot should be cached to avoid an infinite loop
 *   Error: Maximum update depth exceeded
 *
 * which is the crash users hit when saving a profile -- the page stays painted
 * but every control stops responding. Measured on the live site: 0 errors until
 * Simpan, React #185 on Simpan, and the profile button dead afterwards.
 *
 * Returning the same object whenever the stored string is unchanged fixes it and
 * still picks up writes from other tabs, because the raw string is re-read on
 * every call.
 */
let cachedRaw: string | null = null;
let cachedProfile: LocalProfile = EMPTY_PROFILE;

function readProfile(): LocalProfile {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedProfile;
    cachedRaw = raw;
    if (!raw) {
      cachedProfile = EMPTY_PROFILE;
    } else {
      const parsed = JSON.parse(raw) as Partial<LocalProfile>;
      cachedProfile = { name: parsed.name ?? "", photoDataUrl: parsed.photoDataUrl ?? null };
    }
  } catch {
    // Malformed JSON, or storage unavailable (private mode). Settle on the empty
    // profile and keep handing back that same object.
    cachedProfile = EMPTY_PROFILE;
  }
  return cachedProfile;
}

function getServerSnapshot(): LocalProfile {
  return EMPTY_PROFILE;
}

// Hoisted so their identity is stable: inline arrows here change every render,
// which makes useSyncExternalStore tear down and re-subscribe on each pass.
const getLoadedSnapshot = () => true;
const getNotLoadedSnapshot = () => false;

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
  const loaded = useSyncExternalStore(subscribe, getLoadedSnapshot, getNotLoadedSnapshot);

  return { profile, setProfile, loaded };
}
