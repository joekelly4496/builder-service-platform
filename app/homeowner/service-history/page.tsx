"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

const supabase = createSupabaseBrowserClient();

const tradeLabels: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  roofing: "Roofing",
  flooring: "Flooring",
  painting: "Painting",
  landscaping: "Landscaping",
  drywall: "Drywall",
  carpentry: "Carpentry",
  general: "General",
};

interface HistoryItem {
  id: string;
  tradeCategory: string;
  status: string;
  homeownerDescription: string | null;
  completionNotes: string | null;
  completionPhotos: string[] | null;
  photoUrls: string[] | null;
  jobCostCents: number | null;
  createdAt: string;
  completedAt: string | null;
  subCompanyName: string | null;
  subContactName: string | null;
  subId: string | null;
}

export default function ServiceHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/homeowner/login";
        return;
      }

      try {
        const res = await fetch(
          `/api/homeowner/service-history?userId=${session.user.id}`
        );
        const data = await res.json();
        if (data.success) {
          setHistory(data.history);
        } else {
          setError(data.error);
        }
      } catch {
        setError("Failed to load service history");
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Loading service history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Service History</h1>
              <p className="text-emerald-200 font-medium mt-1">
                Your completed service requests
              </p>
            </div>
            <Link
              href="/homeowner/dashboard"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-semibold text-sm transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium">
            {error}
          </div>
        )}

        {history.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
            <p className="text-slate-500 font-semibold text-lg mb-2">
              No completed services yet
            </p>
            <p className="text-slate-400 font-medium text-sm">
              Your completed service requests will appear here.
            </p>
          </div>
        ) : (
          history.map((item) => {
            const completionPhotos = (item.completionPhotos ?? []).filter(Boolean);
            const submittedPhotos = (item.photoUrls ?? []).filter(Boolean);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 capitalize">
                      {tradeLabels[item.tradeCategory] ?? item.tradeCategory} Service
                    </h3>
                    {item.subCompanyName && (
                      <p className="text-sm text-slate-500 font-medium">
                        By {item.subCompanyName}
                        {item.subContactName ? ` (${item.subContactName})` : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                      Completed
                    </span>
                    {item.completedAt && (
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {new Date(item.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {item.homeownerDescription && (
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                      Description
                    </p>
                    <p className="text-sm text-slate-700 font-medium">
                      {item.homeownerDescription}
                    </p>
                  </div>
                )}

                {item.completionNotes && (
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                      Completion Notes
                    </p>
                    <p className="text-sm text-slate-700 font-medium">
                      {item.completionNotes}
                    </p>
                  </div>
                )}

                {item.jobCostCents != null && (
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                      Service Cost
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      ${(item.jobCostCents / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}

                {/* Photos */}
                {(submittedPhotos.length > 0 || completionPhotos.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {submittedPhotos.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                          Submitted Photos
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {submittedPhotos.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="overflow-hidden rounded-lg border border-slate-200 hover:border-emerald-500 transition-all"
                            >
                              <img
                                src={url}
                                alt={`Photo ${i + 1}`}
                                className="w-full h-20 object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {completionPhotos.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                          Completion Photos
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {completionPhotos.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="overflow-hidden rounded-lg border border-slate-200 hover:border-emerald-500 transition-all"
                            >
                              <img
                                src={url}
                                alt={`Completion ${i + 1}`}
                                className="w-full h-20 object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <p className="text-xs text-slate-400 font-medium">
                    Submitted {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  <Link
                    href={`/homeowner/requests/${item.id}`}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
