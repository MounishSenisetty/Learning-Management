"use client";

import React, { useEffect, useState } from "react";

export function RecommendationsTable() {
  const [data, setData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/recommendations")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load recommendations");
        return res.json();
      })
      .then((json) => setData(json ?? []))
      .catch((e) => setError(String(e.message || e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="mt-4 text-slate-600">Loading recommendations...</p>;
  if (error) return <p className="mt-4 text-red-600">Error: {error}</p>;
  if (!data.length) return <p className="mt-4 text-slate-600">No recommendations available.</p>;

  const headers = Object.keys(data[0]);

  return (
    <div>
      <h2 className="text-xl font-semibold">Personalised Recommendations</h2>
      <p className="mt-2 text-sm text-slate-600">Imported from Results/personalised_recommendations.csv</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-3 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-t border-slate-100 hover:bg-cyan-50/40">
                {headers.map((h) => (
                  <td key={h} className="px-3 py-3">
                    {row[h]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecommendationsTable;
