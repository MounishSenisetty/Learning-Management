"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { clearCurrentStaff, clearCurrentStudent, getCurrentStaff, getCurrentStudent } from "@/lib/storage";

const studentLinks = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Student Login" },
  { href: "/teacher-login", label: "Teacher Login" },
  { href: "/admin-login", label: "Admin Login" },
  { href: "/experiments", label: "Experiments" },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const staffRole = useSyncExternalStore(subscribeSession, getStaffRoleSnapshot, getServerStaffRoleSnapshot);
  const hasStudent = useSyncExternalStore(subscribeSession, getHasStudentSnapshot, getServerHasStudentSnapshot);

  const links =
    staffRole === "teacher"
      ? [
          { href: "/teacher-dashboard", label: "Teacher Dashboard" },
          { href: "/", label: "Landing" },
        ]
      : staffRole === "admin"
        ? [
            { href: "/admin-dashboard", label: "Admin Dashboard" },
            { href: "/teacher-dashboard", label: "Teacher View" },
            { href: "/", label: "Landing" },
          ]
        : studentLinks;

  function onStaffLogout() {
    const role = getCurrentStaff()?.role ?? null;
    clearCurrentStaff();
    router.push(role === "admin" ? "/admin-login" : "/teacher-login");
  }

  function onStudentLogout() {
    clearCurrentStudent();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-600 to-teal-500 text-sm font-bold text-white shadow-lg shadow-cyan-900/20">
            LA
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Academic Suite</p>
            <p className="text-sm font-semibold text-slate-900">Learning Analytics Platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b-2 px-1 pb-1 text-sm font-medium transition ${
                  active ? "border-teal-600 text-teal-600" : "border-transparent text-slate-600 hover:text-teal-600"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {staffRole ? (
            <>
              <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 sm:inline">
                {staffRole} mode
              </span>
              <button
                type="button"
                onClick={onStaffLogout}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </>
          ) : hasStudent ? (
            <>
              <Link href="/dashboard" className="hidden text-sm text-slate-600 transition hover:text-teal-600 sm:inline">
                Dashboard
              </Link>
              <button
                type="button"
                onClick={onStudentLogout}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm text-slate-600 transition hover:text-teal-600 sm:inline">
                Login
              </Link>
              <Link href="/experiments" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>

      <nav className="flex items-center gap-2 overflow-x-auto border-t border-slate-200/70 px-4 py-2 md:hidden">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
          return (
            <Link
              key={`mobile-${link.href}`}
              href={link.href}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition ${
                active ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-600 hover:border-teal-300"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

function subscribeSession(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener("staff-session-changed", handler);
  window.addEventListener("student-session-changed", handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("staff-session-changed", handler);
    window.removeEventListener("student-session-changed", handler);
  };
}

function getStaffRoleSnapshot() {
  return getCurrentStaff()?.role ?? null;
}

function getServerStaffRoleSnapshot() {
  return null;
}

function getHasStudentSnapshot() {
  return Boolean(getCurrentStudent()?.id);
}

function getServerHasStudentSnapshot() {
  return false;
}
