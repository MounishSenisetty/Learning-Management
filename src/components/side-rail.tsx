"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const routes = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/experiments", label: "Experiments", icon: "🧪" },
  { href: "/pre-test/ECG", label: "Pre-test", icon: "📝" },
];

export function SideRail() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const asideRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const workspace = asideRef.current?.closest(".workspace-grid") as HTMLElement | null;
    if (!workspace) return;
    workspace.style.setProperty("--sidebar-width", isOpen ? "16rem" : "5rem");
  }, [isOpen]);

  return (
    <aside ref={asideRef} className="hidden lg:block">
      <div className="sticky top-6">
        <section
          className={`side-card overflow-hidden transition-all duration-300 ${isOpen ? "w-64" : "w-20"}`}
        >
          <div className="flex items-center justify-between">
            {isOpen ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Workspace</p> : <span />}
            <button
              type="button"
              aria-label="Toggle sidebar"
              onClick={() => setIsOpen((prev) => !prev)}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            >
              ☰
            </button>
          </div>

          <nav className="mt-3 space-y-1">
            {routes.map((route) => {
              const active = pathname === route.href || pathname?.startsWith(route.href);
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  title={route.label}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-teal-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-base">{route.icon}</span>
                    {isOpen && <span>{route.label}</span>}
                  </span>
                </Link>
              );
            })}
          </nav>

          {isOpen && (
            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Evaluation Notes</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Complete all workflow stages to unlock final analytics.</li>
                <li>Attempts are tracked separately for EMG and ECG.</li>
                <li>Dashboard reflects student-specific metrics only.</li>
              </ul>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
