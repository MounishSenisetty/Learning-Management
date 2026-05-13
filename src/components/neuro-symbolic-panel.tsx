"use client";

import { NeuroSymbolicInsight } from "@/lib/analytics";

interface NeuroSymbolicPanelProps {
  insights: NeuroSymbolicInsight | null;
  loading?: boolean;
}

export function NeuroSymbolicPanel({ insights, loading = false }: NeuroSymbolicPanelProps) {
  if (loading) {
    return (
      <section className="section-card">
        <h2 className="text-xl font-semibold">Neuro-Symbolic Analysis</h2>
        <div className="mt-4 flex items-center justify-center py-8">
          <p className="text-slate-500">Loading symbolic insights...</p>
        </div>
      </section>
    );
  }

  if (!insights) {
    return (
      <section className="section-card">
        <h2 className="text-xl font-semibold">Neuro-Symbolic Analysis</h2>
        <p className="mt-2 text-sm text-slate-600">
          AI-driven interpretation of learning patterns and behavioral clusters.
        </p>
        <div className="mt-4 flex items-center justify-center py-8">
          <p className="text-slate-500">No data available yet</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <section className="section-card">
        <h2 className="text-xl font-semibold">Neuro-Symbolic Analysis</h2>
        <p className="mt-2 text-sm text-slate-600">
          AI-driven symbolic reasoning about learning patterns and student clusters.
        </p>

        {/* Key Findings */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-800">Key Findings</h3>
          <ul className="mt-3 space-y-2">
            {insights.overallFindings.map((finding, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-slate-700">
                <span className="text-teal-600">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Learning Patterns */}
      <section className="section-card">
        <h3 className="text-lg font-semibold text-slate-800">Learning Pattern Classification</h3>
        <p className="mt-2 text-sm text-slate-600">
          Symbolic classification of individual student learning behaviors based on neural metrics.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(
            insights.learningPatterns.reduce(
              (acc, pattern) => {
                acc[pattern.patternType] = (acc[pattern.patternType] ?? 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            ),
          ).map(([type, count]) => (
            <div
              key={type}
              className="rounded-lg border border-slate-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-4"
            >
              <p className="text-sm font-medium capitalize text-slate-700">{type}</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">{count}</p>
              <p className="mt-1 text-xs text-slate-500">student(s)</p>
            </div>
          ))}
        </div>

        <div className="mt-6 max-h-96 overflow-y-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Pattern</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Avg Gain</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {insights.learningPatterns.slice(0, 20).map((pattern) => (
                <tr key={pattern.studentId} className="border-t border-slate-100 hover:bg-cyan-50/40">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{pattern.studentId.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                        pattern.patternType === "efficient"
                          ? "bg-green-100 text-green-800"
                          : pattern.patternType === "improving"
                            ? "bg-blue-100 text-blue-800"
                            : pattern.patternType === "struggling"
                              ? "bg-red-100 text-red-800"
                              : pattern.patternType === "plateau"
                                ? "bg-yellow-100 text-yellow-800"
                                : pattern.patternType === "engaged"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {pattern.patternType}
                    </span>
                  </td>
                  <td className="px-4 py-3">{(pattern.confidence * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {pattern.metrics.avgGain.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{pattern.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Behavioral Clusters */}
      <section className="section-card">
        <h3 className="text-lg font-semibold text-slate-800">Behavioral Clusters</h3>
        <p className="mt-2 text-sm text-slate-600">
          Symbolic grouping of students by behavioral and learning characteristics.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {insights.behavioralClusters.map((cluster) => (
            <div
              key={cluster.clusterId}
              className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">{cluster.label}</h4>
                  <p className="mt-1 text-lg font-bold text-teal-700">{cluster.size} students</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Characteristics:</p>
                <div className="flex flex-wrap gap-2">
                  {cluster.characteristics.map((char, idx) => (
                    <span
                      key={idx}
                      className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-white/60 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Intervention:</p>
                <p className="mt-1 text-sm text-slate-700">{cluster.interventionSuggestion}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Priority Interventions */}
      <section className="section-card">
        <h3 className="text-lg font-semibold text-slate-800">Priority Interventions</h3>
        <p className="mt-2 text-sm text-slate-600">
          Recommended actions based on symbolic reasoning about learning patterns.
        </p>

        <div className="mt-4 space-y-3">
          {insights.priorityInterventions.map((intervention, idx) => (
            <div
              key={idx}
              className={`rounded-lg p-4 ${
                intervention.priority === "high"
                  ? "border-l-4 border-red-500 bg-red-50"
                  : intervention.priority === "medium"
                    ? "border-l-4 border-yellow-500 bg-yellow-50"
                    : "border-l-4 border-green-500 bg-green-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{intervention.intervention}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Affects <span className="font-semibold">{intervention.affectedStudents}</span> student(s)
                  </p>
                </div>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase ${
                    intervention.priority === "high"
                      ? "bg-red-200 text-red-800"
                      : intervention.priority === "medium"
                        ? "bg-yellow-200 text-yellow-800"
                        : "bg-green-200 text-green-800"
                  }`}
                >
                  {intervention.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
