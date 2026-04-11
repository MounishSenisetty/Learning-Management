"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { setCurrentStudent } from "@/lib/storage";

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
  const [priorLabExperience, setPriorLabExperience] = useState(false);
  const [cohort, setCohort] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
          priorLabExperience,
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
    <main className="page-shell">
      <section className="content-card max-w-xl">
        <h1 className="text-2xl font-bold">Student Login</h1>
        <p className="mt-2 text-slate-600">Existing students can login with roll number. New students can register once and all future recordings stay under the same profile.</p>

        <div className="mt-5 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "existing" ? "bg-white shadow" : "text-slate-600"}`}
            onClick={() => {
              setMode("existing");
              setError(null);
            }}
          >
            Already Registered
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "new" ? "bg-white shadow" : "text-slate-600"}`}
            onClick={() => {
              setMode("new");
              setError(null);
            }}
          >
            New Registration
          </button>
        </div>

        {mode === "existing" ? (
          <form onSubmit={onExistingLogin} className="mt-6 space-y-4">
            <div>
              <label className="label">Roll Number</label>
              <input className="input" required value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
            </div>

            <div>
              <label className="label">Email (optional verification)</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button className="btn btn-primary w-full" disabled={loading} type="submit">
              {loading ? "Please wait..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={onRegister} className="mt-6 space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div>
              <label className="label">Roll Number</label>
              <input className="input" required value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
            </div>

            <div>
              <label className="label">Email (optional)</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="label">Age</label>
              <input
                className="input"
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
              <select className="select" value={gender} onChange={(e) => setGender(e.target.value)} required>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="label">Program / Degree</label>
              <input
                className="input"
                required
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="e.g., B.Tech Biomedical Engineering"
              />
            </div>

            <div>
              <label className="label">Year of Study</label>
              <input
                className="input"
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
              <input className="input" value={institution} onChange={(e) => setInstitution(e.target.value)} />
            </div>

            <div>
              <label className="label">Cohort / Section (optional)</label>
              <input className="input" value={cohort} onChange={(e) => setCohort(e.target.value)} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={priorLabExperience}
                onChange={(e) => setPriorLabExperience(e.target.checked)}
              />
              <span>I have prior EMG/ECG lab or simulation experience</span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button className="btn btn-primary w-full" disabled={loading} type="submit">
              {loading ? "Please wait..." : "Register and Continue"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
