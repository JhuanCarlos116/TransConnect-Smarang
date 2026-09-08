"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useDishubAuth } from "@/lib/useDishubAuth";

/**
 * Client-side route guard for /dashboard and /dashboard/tasks. There's no
 * middleware.ts here on purpose: the login flag lives in localStorage (see
 * useDishubAuth), which Next.js Middleware can't read (it runs at the
 * edge/server, not the browser) -- a cookie-based flag would be needed for
 * that. For one hardcoded internal account this client-side check is
 * proportionate; revisit if this ever needs to gate something more sensitive.
 *
 * The redirect effect deliberately waits one extra render (via `settled`)
 * before ever deciding to redirect. useDishubAuth's loggedIn starts at
 * `false` on every fresh page load (getServerSnapshot, so hydration matches
 * the server) and flips to the real localStorage value on mount -- but this
 * effect and that flip are two separate passes, and effects on a freshly
 * mounted tree can commit in an order where this one still closes over the
 * pre-flip `false`. Gating the redirect on `settled` (only true starting the
 * render *after* mount) means it only ever fires once loggedIn has had a
 * chance to reflect reality, instead of racing it on a hard reload.
 */
export default function DishubAuthGuard({ children }: { children: React.ReactNode }) {
  const { loggedIn } = useDishubAuth();
  const router = useRouter();
  const [settled, setSettled] = useState(false);

  // Deliberate one-time "mounted" flag, not synchronizing with an external
  // system; there is no store to subscribe to here, just "has one client
  // render happened yet" (see the comment above this component for why that
  // matters for the redirect below).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettled(true);
  }, []);

  useEffect(() => {
    if (settled && !loggedIn) router.replace("/login");
  }, [settled, loggedIn, router]);

  if (!settled || !loggedIn) return null;
  return <>{children}</>;
}
