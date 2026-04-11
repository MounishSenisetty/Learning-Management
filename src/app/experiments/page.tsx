"use client";

import Link from "next/link";
import { useState } from "react";
import { getCurrentStudent, setFlowState } from "@/lib/storage";
import { ExperimentType } from "@/types/domain";

export default function ExperimentsPage() {
  const [studentName] = useState(() => getCurrentStudent()?.full_name ?? "Student");

  function chooseExperiment(type: ExperimentType) {
    setFlowState({ experimentType: type });
  }

  return (
    <main className="page-shell">
      <section className="content-card">
        <h1 className="text-2xl font-bold">Welcome, {studentName}</h1>
        <p className="mt-2 text-slate-600">Select an experiment and begin your pre-test.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/pre-test/ECG"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow"
            onClick={() => chooseExperiment("ECG")}
          >
            <h2 className="text-xl font-semibold">ECG</h2>
            <p className="mt-2 text-sm text-slate-600">Electrocardiography signal recording and interpretation workflow.</p>
          </Link>

          <Link
            href="/pre-test/EMG"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow"
            onClick={() => chooseExperiment("EMG")}
          >
            <h2 className="text-xl font-semibold">EMG</h2>
            <p className="mt-2 text-sm text-slate-600">Electromyography setup, acquisition, and comparative analysis.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
