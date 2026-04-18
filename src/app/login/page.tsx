"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentStaff, getStaffDashboardPath, setCurrentStudent } from "@/lib/storage";
import { AppHeader } from "@/components/app-header";

export default function LoginPage() {
  const [mode, setMode] = useState<"existing" | "new">("existing");

  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState(18);
  const [gender, setGender] = useState("prefer_not_to_say");
  const [program, setProgram] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [institution, setInstitution] = useState("");
  const [priorLabExperience, setPriorLabExperience] = useState<"yes" | "no" | "">("");
  const [cohort, setCohort] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const staff = getCurrentStaff();
    if (staff?.role) {
      router.replace(getStaffDashboardPath(staff.role));
    }
  }, [router]);

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          rollNumber,
          email,
          age,
          gender,
          program,
          yearOfStudy,
          institution,
          priorLabExperience: priorLabExperience === "yes",
          cohort,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to create student record");
      }

      const payload = await response.json();
      setCurrentStudent(payload.student);
      router.push("/experiments");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function onExistingLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/students/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber, email }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to login student");
      }

      const payload = await response.json();
      setCurrentStudent(payload.student);
      router.push("/experiments");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="min-h-[calc(100vh-72px)] bg-gradient-to-br from-blue-50 to-teal-100 px-4 py-10">
        <div className="mx-auto flex min-h-[80vh] w-full items-center justify-center">
          <section className="w-full max-w-md rounded-2xl border border-white/30 bg-white/80 p-8 shadow-xl backdrop-blur-md">
            <h1 className="mb-2 text-center text-2xl font-semibold text-slate-900">Student Access</h1>
            <p className="mb-6 text-center text-sm text-slate-500">Sign in or register to track your learning analytics</p>

            <div className="mb-5 grid gap-2 sm:grid-cols-2">
              <Link href="/teacher-login" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700">
                Teacher Login
              </Link>
              <Link href="/admin-login" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700">
                Admin Login
              </Link>
            </div>

            <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                  mode === "existing" ? "bg-white text-slate-900 shadow" : "text-gray-500"
                }`}
                onClick={() => {
                  setMode("existing");
                  setError(null);
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                  mode === "new" ? "bg-white text-slate-900 shadow" : "text-gray-500"
                }`}
                onClick={() => {
                  setMode("new");
                  setError(null);
                }}
              >
                Register
              </button>
            </div>

            {mode === "existing" ? (
              <form onSubmit={onExistingLogin} className="space-y-4">
                <div>
                  <label className="label">Roll Number</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:ring-2 focus:ring-teal-500"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Roll Number"
                  />
                </div>

                <div>
                  <label className="label">Email (optional)</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:ring-2 focus:ring-teal-500"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (optional)"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  className="mt-2 w-full rounded-lg bg-teal-600 py-3 font-medium text-white transition hover:bg-teal-700"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? "Please wait..." : "Login"}
                </button>
              </form>
            ) : (
              <form onSubmit={onRegister} className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:ring-2 focus:ring-teal-500"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label className="label">Roll Number</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:ring-2 focus:ring-teal-500"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Roll Number"
                  />
                </div>

                <div>
                  <label className="label">Email (optional)</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:ring-2 focus:ring-teal-500"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (optional)"
                  />
                </div>

                <div>
                  <label className="label">Age</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:ring-2 focus:ring-teal-500"
                    type="number"
                    min={10}
                    max={100}
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value || 0))}
                  />
                </div>

                <div>
                  <label className="label">Gender</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:ring-2 focus:ring-teal-500"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="label">Program / Degree</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:ring-2 focus:ring-teal-500"
                    required
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    placeholder="e.g., B.Tech Biomedical Engineering"
                  />
                </div>

                <div>
                  <label className="label">Year of Study</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:ring-2 focus:ring-teal-500"
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(Number(e.target.value || 1))}
                  />
                </div>

                <div>
                  <label className="label">Institution (optional)</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:ring-2 focus:ring-teal-500"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Cohort / Section (optional)</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:ring-2 focus:ring-teal-500"
                    value={cohort}
                    onChange={(e) => setCohort(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Prior EMG/ECG Lab or Simulation Experience</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:ring-2 focus:ring-teal-500"
                    required
                    value={priorLabExperience}
                    onChange={(e) => setPriorLabExperience(e.target.value as "yes" | "no" | "")}
                  >
                    <option value="" disabled>
                      Select an option
                    </option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  className="mt-2 w-full rounded-lg bg-teal-600 py-3 font-medium text-white transition hover:bg-teal-700"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? "Please wait..." : "Register and Continue"}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
