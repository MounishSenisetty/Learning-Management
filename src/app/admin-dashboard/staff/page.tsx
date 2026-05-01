"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getCurrentStaff, clearCurrentStaff } from "@/lib/storage";

interface Staff {
  id: string;
  username: string;
  role: "admin" | "teacher";
  full_name?: string;
  email?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

interface StaffResponse {
  staff?: Staff[];
  error?: string;
}

export default function AdminStaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "teacher" as "admin" | "teacher",
    fullName: "",
    email: "",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const currentStaff = getCurrentStaff();
    if (!currentStaff || currentStaff.role !== "admin") {
      router.replace("/admin-login");
      return;
    }

    loadStaff();
  }, [router]);

  async function loadStaff() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/staff");

      if (!response.ok) {
        throw new Error("Failed to load staff");
      }

      const data = (await response.json()) as StaffResponse;
      setStaff(data.staff ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.username || !formData.password || !formData.role) {
      setSubmitError("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to add staff");
      }

      alert("Staff member added successfully!");
      setFormData({
        username: "",
        password: "",
        role: "teacher",
        fullName: "",
        email: "",
      });
      setShowForm(false);
      loadStaff();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to add staff");
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
                <p className="text-xs uppercase tracking-[0.12em] text-indigo-700">Admin Staff Management</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">Manage Staff Accounts</h1>
                <p className="mt-1 text-sm text-slate-600">Create and manage admin and teacher accounts with credentials.</p>
              </div>
              <button onClick={onLogout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          </section>

          <section className="section-card">
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
                {showForm ? "Cancel" : "Add Staff Member"}
              </button>
              <Link href="/admin-dashboard" className="btn btn-outline">
                Back to Dashboard
              </Link>
            </div>
          </section>

          {showForm && (
            <section className="section-card bg-blue-50 border border-blue-200">
              <h2 className="text-lg font-semibold mb-4">Add New Staff Member</h2>
              <form onSubmit={handleAddStaff} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">Username *</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="e.g., teacher01"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Password *</label>
                    <input
                      type="password"
                      className="input"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">Full Name</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      className="input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Role *</label>
                  <select
                    className="input"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "teacher" })}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {submitError && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{submitError}</p>}

                <button type="submit" className="btn btn-primary">
                  Add Staff Member
                </button>
              </form>
            </section>
          )}

          {error && <p className="text-red-600 p-3 bg-red-50 rounded border border-red-200">{error}</p>}

          {loading ? (
            <p className="text-center text-slate-600">Loading staff members...</p>
          ) : (
            <section className="section-card">
              <h2 className="text-lg font-semibold mb-3">Staff Members ({staff.length})</h2>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left">Username</th>
                      <th className="px-3 py-3 text-left">Role</th>
                      <th className="px-3 py-3 text-left">Full Name</th>
                      <th className="px-3 py-3 text-left">Email</th>
                      <th className="px-3 py-3 text-left">Status</th>
                      <th className="px-3 py-3 text-left">Last Login</th>
                      <th className="px-3 py-3 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((member) => (
                      <tr key={member.id} className="border-t border-slate-100 hover:bg-blue-50/30">
                        <td className="px-3 py-3 font-medium">{member.username}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${member.role === "admin" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="px-3 py-3">{member.full_name || "-"}</td>
                        <td className="px-3 py-3">{member.email || "-"}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${member.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                            {member.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {member.last_login ? new Date(member.last_login).toLocaleDateString() : "Never"}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {new Date(member.created_at).toLocaleDateString()}
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
