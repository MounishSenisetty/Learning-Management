import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="content-card">
        <h1 className="text-3xl font-bold">Learning Analytics Platform</h1>
        <p className="mt-3 text-slate-700">
          Track EMG and ECG student progress across repeated simulation attempts with research-grade metrics.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/login" className="btn btn-primary">
            Student Login
          </Link>
          <Link href="/dashboard" className="btn btn-secondary">
            Open Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
