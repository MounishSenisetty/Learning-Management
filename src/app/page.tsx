"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";

export default function HomePage() {
  const [studentsTracked, setStudentsTracked] = useState(0);
  const [attemptsLogged, setAttemptsLogged] = useState(0);
  const [learningGain, setLearningGain] = useState(0);
  const [timeReduction, setTimeReduction] = useState(0);

  useEffect(() => {
    const targets = {
      students: 120,
      attempts: 356,
      gain: 35,
      time: 30,
    };

    const tick = window.setInterval(() => {
      setStudentsTracked((value) => Math.min(targets.students, value + Math.max(1, Math.ceil((targets.students - value) / 10))));
      setAttemptsLogged((value) => Math.min(targets.attempts, value + Math.max(1, Math.ceil((targets.attempts - value) / 10))));
      setLearningGain((value) => Math.min(targets.gain, value + 1));
      setTimeReduction((value) => Math.min(targets.time, value + 1));
    }, 35);

    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const revealNodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.2 }
    );

    revealNodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="layout-container space-y-14">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/75 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm md:p-10">
            <div className="pointer-events-none absolute -left-12 -top-14 h-36 w-36 rounded-full bg-cyan-200/45 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-14 -right-10 h-40 w-40 rounded-full bg-blue-200/45 blur-2xl" />

            <div className="grid items-center gap-10 md:grid-cols-2">
              <div>
                <p className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                  Simulation Intelligence Platform
                </p>
                <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-900 md:text-5xl lg:text-6xl">
                  Turn EMG and ECG Simulation Into <span className="living-highlight">Provable Learning Outcomes</span>
                </h1>
                <p className="mt-5 max-w-xl text-lg text-slate-600">
                  A modern analytics platform designed for simulation-based education: measure gains, track attempts, and visualize
                  progress across the complete learning workflow.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/experiments"
                    className="rounded-xl bg-gradient-to-r from-teal-500 to-blue-500 px-6 py-3 font-semibold text-white shadow-lg transition duration-300 hover:scale-[1.03] hover:shadow-xl"
                  >
                    Try Live Demo →
                  </Link>
                  <Link href="/dashboard" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium transition hover:bg-slate-50">
                    View Analytics
                  </Link>
                </div>
              </div>

              <div className="section-card relative overflow-hidden p-6 reveal-up" data-reveal>
                <p className="text-sm font-semibold text-slate-700">Live Dashboard Snapshot</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="metric-card lively-card">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Learning Gain</p>
                    <p className="mt-2 text-2xl font-bold text-teal-600">+{learningGain}%</p>
                  </div>
                  <div className="metric-card lively-card">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Time Reduction</p>
                    <p className="mt-2 text-2xl font-bold text-cyan-600">-{timeReduction}%</p>
                  </div>
                  <div className="metric-card sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Session Completion Trend</p>
                    <div className="mt-3 grid h-28 grid-cols-10 items-end gap-2 rounded-lg bg-gradient-to-r from-teal-100 via-cyan-100 to-blue-100 px-3 pb-2">
                      <span className="live-bar" style={{ height: "24%" }} />
                      <span className="live-bar delay-1" style={{ height: "35%" }} />
                      <span className="live-bar delay-2" style={{ height: "45%" }} />
                      <span className="live-bar" style={{ height: "43%" }} />
                      <span className="live-bar delay-1" style={{ height: "60%" }} />
                      <span className="live-bar delay-2" style={{ height: "58%" }} />
                      <span className="live-bar" style={{ height: "70%" }} />
                      <span className="live-bar delay-1" style={{ height: "76%" }} />
                      <span className="live-bar delay-2" style={{ height: "84%" }} />
                      <span className="live-bar" style={{ height: "90%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm md:grid-cols-4 md:p-6 reveal-up" data-reveal>
            <div className="metric-card lively-card text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">Students Tracked</p>
              <p className="mt-2 text-3xl font-bold text-teal-600">{studentsTracked}+</p>
            </div>
            <div className="metric-card lively-card text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">Attempts Logged</p>
              <p className="mt-2 text-3xl font-bold text-cyan-600">{attemptsLogged}</p>
            </div>
            <div className="metric-card lively-card text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">Average Improvement</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">+{learningGain}%</p>
            </div>
            <div className="metric-card lively-card text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">Assessment Completion</p>
              <p className="mt-2 text-3xl font-bold text-indigo-600">95%</p>
            </div>
          </section>

          <section className="reveal-up" data-reveal>
            <h2 className="text-3xl font-bold text-slate-900">Feature Highlights</h2>
            <p className="mt-2 max-w-3xl text-slate-600">Built with the interaction and clarity expected from premium SaaS dashboards.</p>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <article className="section-card transition duration-300 hover:scale-[1.02] hover:shadow-xl">
                <p className="text-lg font-semibold">📈 Multi-Attempt Intelligence</p>
                <p className="mt-2 text-sm text-slate-600">Track each learner across repeated EMG and ECG attempts with clean progression analytics.</p>
              </article>
              <article className="section-card transition duration-300 hover:scale-[1.02] hover:shadow-xl">
                <p className="text-lg font-semibold">🧪 Research-Grade Metrics</p>
                <p className="mt-2 text-sm text-slate-600">Pre/post scoring, normalized gain, timing delta, and confidence trends in one view.</p>
              </article>
              <article className="section-card transition duration-300 hover:scale-[1.02] hover:shadow-xl">
                <p className="text-lg font-semibold">⚡ Real-Time Visual Feedback</p>
                <p className="mt-2 text-sm text-slate-600">Interactive cards and dynamic trends help evaluators feel system responsiveness instantly.</p>
              </article>
            </div>
          </section>

          <section className="section-card py-8 text-center reveal-up" data-reveal>
            <h2 className="text-2xl font-semibold">Learning Workflow</h2>
            <p className="mt-2 text-slate-600">A complete, measurable simulation journey from baseline to reflection.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-slate-700 md:text-base">
              <span className="workflow-float rounded-full border border-slate-200 bg-white px-3 py-2">1️⃣ Pre-test</span>
              <span>→</span>
              <span className="workflow-float delay-1 rounded-full border border-slate-200 bg-white px-3 py-2">2️⃣ Simulation</span>
              <span>→</span>
              <span className="workflow-float delay-2 rounded-full border border-slate-200 bg-white px-3 py-2">3️⃣ Post-test</span>
              <span>→</span>
              <span className="workflow-float rounded-full border border-slate-200 bg-white px-3 py-2">4️⃣ Survey</span>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-[1.5fr_1fr] reveal-up" data-reveal>
            <div className="section-card">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-teal-700">Analytics Preview</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">Performance Curve Across Attempts</h3>
              <p className="mt-2 text-slate-600">A quick visual of how post-test outcomes trend upward as practice continues.</p>
              <div className="mt-5 grid h-52 grid-cols-12 items-end gap-2 rounded-xl border border-cyan-100 bg-gradient-to-b from-cyan-50 to-blue-50 p-4">
                <span className="live-bar" style={{ height: "22%" }} />
                <span className="live-bar delay-1" style={{ height: "28%" }} />
                <span className="live-bar delay-2" style={{ height: "36%" }} />
                <span className="live-bar" style={{ height: "42%" }} />
                <span className="live-bar delay-1" style={{ height: "46%" }} />
                <span className="live-bar delay-2" style={{ height: "54%" }} />
                <span className="live-bar" style={{ height: "60%" }} />
                <span className="live-bar delay-1" style={{ height: "66%" }} />
                <span className="live-bar delay-2" style={{ height: "74%" }} />
                <span className="live-bar" style={{ height: "78%" }} />
                <span className="live-bar delay-1" style={{ height: "84%" }} />
                <span className="live-bar delay-2" style={{ height: "92%" }} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="metric-card transition duration-300 hover:scale-[1.02] hover:shadow-xl">
                <p className="text-xs uppercase tracking-wide text-slate-500">Avg Post-test Score</p>
                <p className="mt-2 text-3xl font-bold text-teal-600">84.2</p>
              </div>
              <div className="metric-card transition duration-300 hover:scale-[1.02] hover:shadow-xl">
                <p className="text-xs uppercase tracking-wide text-slate-500">Normalized Gain</p>
                <p className="mt-2 text-3xl font-bold text-cyan-600">0.41</p>
              </div>
              <div className="metric-card transition duration-300 hover:scale-[1.02] hover:shadow-xl">
                <p className="text-xs uppercase tracking-wide text-slate-500">Avg Completion Time</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">12m</p>
              </div>
            </div>
          </section>

          <section className="section-card reveal-up" data-reveal>
            <h2 className="text-2xl font-semibold text-slate-900">Why It&apos;s Different</h2>
            <p className="mt-2 text-slate-600">Not a static report page. A measurable product workflow that demonstrates educational impact.</p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.1em] text-rose-700">Typical Academic Demo</p>
                <ul className="mt-4 space-y-3 text-sm text-rose-900">
                  <li>• Static pages with no progression story</li>
                  <li>• Limited interaction and no live-feeling metrics</li>
                  <li>• Data shown as isolated numbers, not learning behavior</li>
                </ul>
              </div>
              <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.1em] text-teal-700">This Platform</p>
                <ul className="mt-4 space-y-3 text-sm text-teal-900">
                  <li>• End-to-end workflow from pre-test to survey</li>
                  <li>• Interactive analytics with live counters and trends</li>
                  <li>• Evaluation-ready insights for learners and instructors</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="section-card reveal-up" data-reveal>
            <h2 className="text-2xl font-semibold text-slate-900">About The Platform</h2>
            <p className="mt-3 text-slate-600">
              This Learning Analytics Platform was designed to improve simulation-based teaching for biomedical education. By combining EMG and ECG
              practical workflows with structured assessments, the system helps educators measure true learning outcomes instead of one-time scores.
            </p>
            <p className="mt-3 text-slate-600">
              The goal is clear: make evaluation transparent, help students improve faster, and provide institutions with evidence-backed impact.
            </p>
          </section>

          <section className="rounded-3xl bg-gradient-to-r from-teal-600 to-blue-600 p-8 text-white shadow-xl reveal-up md:p-10" data-reveal>
            <div className="grid items-center gap-6 md:grid-cols-[1.7fr_1fr]">
              <div>
                <h2 className="text-3xl font-bold">Ready To Experience a Real Learning Analytics Product?</h2>
                <p className="mt-3 text-teal-50">
                  Launch the workflow, run a simulation, and watch performance analytics update in real time.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link href="/experiments" className="rounded-xl bg-white px-5 py-3 font-semibold text-teal-700 transition hover:scale-[1.03]">
                  Start Demo
                </Link>
                <Link href="/login" className="rounded-xl border border-white/70 px-5 py-3 font-semibold text-white transition hover:bg-white/10">
                  Sign In
                </Link>
              </div>
            </div>
          </section>
        </section>
      </main>

      <footer className="mt-12 border-t border-slate-200/80 bg-white/80 py-8">
        <div className="layout-container grid gap-6 text-sm text-slate-600 md:grid-cols-3">
          <div>
            <p className="text-base font-semibold text-slate-900">Learning Analytics Platform</p>
            <p className="mt-2">EMG & ECG simulation-based education with measurable impact.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Navigation</p>
            <div className="mt-2 flex flex-col gap-1">
              <Link href="/" className="hover:text-teal-600">Home</Link>
              <Link href="/experiments" className="hover:text-teal-600">Experiments</Link>
              <Link href="/dashboard" className="hover:text-teal-600">Dashboard</Link>
            </div>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Contact</p>
            <p className="mt-2">Email: analytics-lab@edu.example</p>
            <p>Research Group: Biomedical Learning Systems</p>
          </div>
        </div>
      </footer>
    </>
  );
}
