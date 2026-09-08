"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "transconnect-profile";

export interface LocalProfile {
  name: string;
  photoDataUrl: string | null;
}

const EMPTY_PROFILE: LocalProfile = { name: "", photoDataUrl: null };

function readProfile(): LocalProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as Partial<LocalProfile>;
    return { name: parsed.name ?? "", photoDataUrl: parsed.photoDataUrl ?? null };
  } catch {
    return EMPTY_PROFILE;
  }
}

/**
 * Profile (name + photo) is per-device, stored in localStorage -- there is no
 * account/login system in this project (see AppHeader's history note), so
 * this is deliberately not a "real" identity: switching phone/browser/private
 * window loses it, and nothing here is shared between visitors. It only
 * exists so the same person doesn't have to retype their name for every
 * report/comment on the same device.
 */
export function useLocalProfile() {
  // Lazy initializer runs once on mount, client-side only (readProfile()
  // guards on `typeof window`) -- avoids a setState-in-effect render pass
  // just to pull in a value that's synchronously available by then anyway.
  const [profile, setProfileState] = useState<LocalProfile>(readProfile);
  const [loaded] = useState(() => typeof window !== "undefined");

  const setProfile = useCallback((next: LocalProfile) => {
    setProfileState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing / storage disabled -- profile just won't persist.
    }
  }, []);

  return { profile, setProfile, loaded };
}
