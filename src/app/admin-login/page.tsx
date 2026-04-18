"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getCurrentStaff, setCurrentStaff } from "@/lib/storage";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const staff = getCurrentStaff();
    if (staff?.role === "admin") {
      router.replace("/admin-dashboard");
    } else if (staff?.role === "teacher") {
      router.replace("/teacher-dashboard");
    }
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin", username, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to login admin");
      }

      const payload = await response.json();
      setCurrentStaff(payload.staff);
      router.push("/admin-dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="min-h-[calc(100vh-72px)] bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-10">
        <div className="mx-auto flex min-h-[80vh] w-full items-center justify-center">
          <section className="w-full max-w-md rounded-2xl border border-white/30 bg-white/80 p-8 shadow-xl backdrop-blur-md">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">Admin Portal</p>
            <h1 className="mt-2 text-center text-2xl font-semibold text-slate-900">Admin Login</h1>
            <p className="mb-6 mt-1 text-center text-sm text-slate-500">Access platform-wide configuration and analytics controls.</p>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label">Username</label>
                <input
                  className="input"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button className="btn btn-primary mt-2 w-full" disabled={loading} type="submit">
                {loading ? "Please wait..." : "Login as Admin"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
