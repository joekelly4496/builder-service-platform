"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const TRADES = [
  { value: "", label: "All Trades" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "roofing", label: "Roofing" },
  { value: "flooring", label: "Flooring" },
  { value: "painting", label: "Painting" },
  { value: "landscaping", label: "Landscaping" },
  { value: "drywall", label: "Drywall" },
  { value: "carpentry", label: "Carpentry" },
  { value: "general", label: "General" },
];

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

interface SubResult {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  tradeCategories: string[];
  slug: string | null;
  bio: string | null;
  serviceArea: string | null;
  licenseNumber: string | null;
  insuranceExpiresAt: string | null;
  isVerified: boolean;
  pricingRanges: { trade: string; min: number; max: number }[] | null;
}

export default function SearchSubsPage() {
  const [results, setResults] = useState<SubResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [trade, setTrade] = useState("");
  const [area, setArea] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (trade) params.set("trade", trade);
    if (area) params.set("area", area);
    if (verifiedOnly) params.set("verified", "true");

    try {
      const res = await fetch(`/api/builder/search-subs?${params}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.subcontractors);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [query, trade, area, verifiedOnly]);

  useEffect(() => {
    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Find Subcontractors
              </h1>
              <p className="text-base font-medium text-slate-600 mt-1">
                Search the Homefront subcontractor directory
              </p>
            </div>
            <Link
              href="/dashboard/subcontractors"
              className="px-5 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold text-sm text-slate-900"
            >
              Back to My Subs
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Company or contact name..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Trade
              </label>
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              >
                {TRADES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Service Area
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Dallas"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Verified only
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500 font-semibold">Searching...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
            <p className="text-slate-500 font-semibold text-lg">
              No subcontractors found
            </p>
            <p className="text-slate-400 font-medium text-sm mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((sub) => {
              const hasInsurance =
                !!sub.insuranceExpiresAt &&
                new Date(sub.insuranceExpiresAt) > new Date();

              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {sub.companyName}
                        </h3>
                        {sub.isVerified && (
                          <svg
                            className="w-5 h-5 text-emerald-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 font-medium">
                        {sub.contactName}
                      </p>
                    </div>
                  </div>

                  {/* Trades */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(sub.tradeCategories as string[]).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold"
                      >
                        {tradeLabels[t] ?? t}
                      </span>
                    ))}
                  </div>

                  {sub.serviceArea && (
                    <p className="text-xs text-slate-500 font-medium mb-2">
                      Area: {sub.serviceArea}
                    </p>
                  )}

                  {sub.bio && (
                    <p className="text-sm text-slate-600 font-medium mb-3 line-clamp-2">
                      {sub.bio}
                    </p>
                  )}

                  {/* Credentials */}
                  <div className="flex gap-3 mb-4 text-xs font-medium">
                    <span
                      className={
                        sub.licenseNumber
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }
                    >
                      {sub.licenseNumber ? "Licensed" : "No license"}
                    </span>
                    <span
                      className={
                        hasInsurance ? "text-emerald-600" : "text-slate-400"
                      }
                    >
                      {hasInsurance ? "Insured" : "No insurance"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {sub.slug && (
                      <Link
                        href={`/subcontractors/${sub.slug}`}
                        target="_blank"
                        className="flex-1 text-center px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                      >
                        View Profile
                      </Link>
                    )}
                    <a
                      href={`mailto:${sub.email}`}
                      className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all"
                    >
                      Contact
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
