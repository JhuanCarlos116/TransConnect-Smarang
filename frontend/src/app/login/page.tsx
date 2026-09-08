"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { useDishubAuth } from "@/lib/useDishubAuth";

export default function LoginPage() {
  const { login } = useDishubAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(username.trim(), password);
    if (!ok) {
      setError("Username atau password salah.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-subtle px-6 font-sans">
      <Link href="/" className="mb-8 flex flex-col items-center gap-2">
        <Image src="/logo-icon.png" alt="" width={128} height={128} className="h-14 w-14" priority />
        <span className="font-headline-md text-headline-md font-bold text-transport-blue">TransConnect</span>
      </Link>

      <div className="w-full max-w-sm rounded-xl border border-border-low bg-surface p-6 shadow-lg">
        <h1 className="mb-1 font-headline-md text-[20px] font-bold text-on-surface">Login DISHUB</h1>
        <p className="mb-5 text-label-sm text-on-surface-variant">Khusus staf Dinas Perhubungan Kota Semarang.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block font-label-sm text-[12px] font-bold text-on-surface">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="w-full rounded-lg border border-border-low bg-surface-container-low p-2.5 font-body-md text-[14px] text-on-surface focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
            />
          </div>
          <div>
            <label className="mb-1 block font-label-sm text-[12px] font-bold text-on-surface">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-border-low bg-surface-container-low p-2.5 font-body-md text-[14px] text-on-surface focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
            />
          </div>

          {error && <p className="text-label-sm text-alert-red">{error}</p>}

          <button
            type="submit"
            className="mt-1 rounded-lg bg-transport-blue px-4 py-2.5 font-label-md text-label-md font-bold text-on-primary transition-colors hover:bg-primary"
          >
            Masuk
          </button>
        </form>
      </div>

      <Link href="/" className="mt-6 text-label-sm text-on-surface-variant underline">
        Kembali ke halaman utama
      </Link>
    </div>
  );
}
