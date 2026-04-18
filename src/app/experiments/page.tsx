"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentStaff, getCurrentStudent, getStaffDashboardPath, setFlowState } from "@/lib/storage";
import { ExperimentType } from "@/types/domain";
import { AppHeader } from "@/components/app-header";
import { SideRail } from "@/components/side-rail";

export default function ExperimentsPage() {
  const router = useRouter();
  const [studentName] = useState(() => getCurrentStudent()?.full_name ?? "Student");

  useEffect(() => {
    const staff = getCurrentStaff();
    if (staff?.role) {
      router.replace(getStaffDashboardPath(staff.role));
      return;
    }

    const student = getCurrentStudent();
    if (!student?.id) {
      router.replace("/login");
    }
  }, [router]);

  function chooseExperiment(type: ExperimentType) {
    setFlowState({ experimentType: type });
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="layout-container workspace-grid">
          <SideRail />
          <div className="workspace-main">
            <section className="section-card">
              <h1 className="text-4xl font-bold">Welcome, {studentName}</h1>
              <p className="mt-2 text-slate-600">Choose an experiment track and begin the guided evaluation workflow.</p>

              <div className="mt-8 grid gap-5 xl:grid-cols-2">
          <Link
            href="/pre-test/ECG"
            className="group rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            onClick={() => chooseExperiment("ECG")}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-700">Track A</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">ECG</h2>
            <p className="mt-3 text-sm text-slate-600">Electrocardiography acquisition, waveform interpretation, and clinical pattern analysis.</p>
            <p className="mt-5 text-sm font-semibold text-cyan-700 group-hover:text-cyan-800">Begin ECG workflow</p>
          </Link>

          <Link
            href="/pre-test/EMG"
            className="group rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            onClick={() => chooseExperiment("EMG")}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-700">Track B</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">EMG</h2>
            <p className="mt-3 text-sm text-slate-600">Electromyography setup, motor-unit recording, and effort-linked signal analytics.</p>
            <p className="mt-5 text-sm font-semibold text-cyan-700 group-hover:text-cyan-800">Begin EMG workflow</p>
          </Link>
              </div>
            </section>

            <aside className="section-card">
              <h2 className="text-xl font-semibold">Selection Tips</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="side-card">
                  <p className="text-xs uppercase tracking-wide text-slate-500">ECG</p>
                  <p className="mt-1 text-sm text-slate-700">Focus on cardiac rhythm capture and interpretation.</p>
                </div>
                <div className="side-card">
                  <p className="text-xs uppercase tracking-wide text-slate-500">EMG</p>
                  <p className="mt-1 text-sm text-slate-700">Analyze muscle activation and recording fidelity.</p>
                </div>
                <div className="side-card">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Workflow</p>
                  <p className="mt-1 text-sm text-slate-700">Pre-test, simulation, post-test, and survey are all required.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
