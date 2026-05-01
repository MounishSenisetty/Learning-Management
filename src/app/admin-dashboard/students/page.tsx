"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getCurrentStaff, clearCurrentStaff } from "@/lib/storage";
import { Student } from "@/types/domain";

interface StudentResponse {
  student?: Student;
  error?: string;
}

interface BulkImportResponse {
  imported: number;
  failed: number;
  total: number;
  errors?: Array<{ index: number; error: string }>;
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [importMode, setImportMode] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [_formData, setFormData] = useState({
    fullName: "",
    rollNumber: "",
    pin: "",
    email: "",
    program: "",
    cohort: "",
  });

  useEffect(() => {
    const staff = getCurrentStaff();
    if (!staff || staff.role !== "admin") {
      router.replace("/admin-login");
      return;
    }

    loadStudents();
  }, [router]);

  async function loadStudents() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/students");

      if (!response.ok) {
        throw new Error("Failed to load students");
      }

      const data = await response.json();
      setStudents(data.students ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkImport() {
    if (!csvContent.trim()) {
      alert("Please paste CSV content");
      return;
    }

    try {
      const lines = csvContent.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const students = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        return {
          fullName: values[headers.indexOf("fullname")] || "",
          rollNumber: values[headers.indexOf("rollnumber")] || "",
          pin: values[headers.indexOf("pin")] || "",
          email: values[headers.indexOf("email")] || "",
          program: values[headers.indexOf("program")] || "",
          cohort: values[headers.indexOf("cohort")] || "",
        };
      });

      const response = await fetch("/api/students/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students }),
      });

      const result = (await response.json()) as BulkImportResponse & { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Bulk import failed");
      }

      alert(`Successfully imported ${result.imported} students. ${result.failed ? `${result.failed} failed.` : ""}`);
      setCsvContent("");
      setImportMode(false);
      loadStudents();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Import failed");
    }
  }

  async function deleteStudent(studentId: string) {
    if (!confirm("Delete this student? This action cannot be undone.")) return;

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete student");

      alert("Student deleted successfully");
      loadStudents();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function exportData(type: string) {
    try {
      const response = await fetch(`/api/analytics/export?type=${type}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    }
  }

  function onLogout() {
    clearCurrentStaff();
    router.push("/admin-login");
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="layout-container space-y-6">
          <section className="section-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-indigo-700">Admin Student Management</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">Manage Students</h1>
                <p className="mt-1 text-sm text-slate-600">Create, edit, delete, or bulk import students.</p>
              </div>
              <button onClick={onLogout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          </section>

          <section className="section-card">
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
                {showForm ? "Cancel" : "Add Student"}
              </button>
              <button onClick={() => setImportMode(!importMode)} className="btn btn-secondary">
                {importMode ? "Cancel Import" : "Bulk Import"}
              </button>
              <button onClick={() => exportData("students")} className="btn btn-outline">
                Export Students
              </button>
              <button onClick={() => exportData("attempts")} className="btn btn-outline">
                Export Attempts
              </button>
              <Link href="/admin-dashboard" className="btn btn-outline">
                Back to Dashboard
              </Link>
            </div>
          </section>

          {importMode && (
            <section className="section-card bg-blue-50 border border-blue-200">
              <h2 className="text-lg font-semibold mb-3">Bulk Import Students</h2>
              <p className="text-sm text-slate-600 mb-3">
                Paste CSV data with headers: fullName, rollNumber, pin, email, program, cohort
              </p>
              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                rows={6}
                className="input w-full font-mono text-sm"
                placeholder="fullName,rollNumber,pin,email,program,cohort&#10;John Doe,A001,1234,john@example.com,B.Tech,2024&#10;Jane Smith,A002,5678,jane@example.com,B.Tech,2024"
              />
              <button onClick={handleBulkImport} className="btn btn-primary mt-3">
                Import Students
              </button>
            </section>
          )}

          {error && <p className="text-red-600 p-3 bg-red-50 rounded border border-red-200">{error}</p>}

          {loading ? (
            <p className="text-center text-slate-600">Loading students...</p>
          ) : (
            <section className="section-card">
              <h2 className="text-lg font-semibold mb-3">All Students ({students.length})</h2>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left">Name</th>
                      <th className="px-3 py-3 text-left">Roll No</th>
                      <th className="px-3 py-3 text-left">Code</th>
                      <th className="px-3 py-3 text-left">Email</th>
                      <th className="px-3 py-3 text-left">Program</th>
                      <th className="px-3 py-3 text-left">Cohort</th>
                      <th className="px-3 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-t border-slate-100 hover:bg-blue-50/30">
                        <td className="px-3 py-3 font-medium">{student.full_name}</td>
                        <td className="px-3 py-3">{student.roll_number}</td>
                        <td className="px-3 py-3">{student.student_code || "-"}</td>
                        <td className="px-3 py-3">{student.email || "-"}</td>
                        <td className="px-3 py-3">{student.program || "-"}</td>
                        <td className="px-3 py-3">{student.cohort || "-"}</td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => deleteStudent(student.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-media"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </section>
      </main>
    </>
  );
}
