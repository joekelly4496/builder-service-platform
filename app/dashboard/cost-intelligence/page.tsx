"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

function fmt(cents: number) {
  return "$" + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface TradeCost {
  tradeCategory: string;
  avgCostCents: number;
  totalCostCents: number;
  jobCount: number;
}

interface SubCost {
  subcontractorId: string;
  companyName: string;
  contactName: string;
  avgCostCents: number;
  totalCostCents: number;
  jobCount: number;
}

interface SubTradeCost {
  subcontractorId: string;
  companyName: string;
  tradeCategory: string;
  avgCostCents: number;
  jobCount: number;
}

export default function CostIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ avgCostCents: 0, totalCostCents: 0, jobCount: 0 });
  const [costByTrade, setCostByTrade] = useState<TradeCost[]>([]);
  const [costBySub, setCostBySub] = useState<SubCost[]>([]);
  const [costBySubAndTrade, setCostBySubAndTrade] = useState<SubTradeCost[]>([]);

  useEffect(() => {
    fetch("/api/builder/cost-intelligence")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setTotals(data.totals);
          setCostByTrade(data.costByTrade);
          setCostBySub(data.costBySub);
          setCostBySubAndTrade(data.costBySubAndTrade);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-semibold">Loading cost data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Cost Intelligence
              </h1>
              <p className="text-base font-medium text-slate-600 mt-1">
                Analyze job costs by trade and subcontractor
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-slate-900"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total Jobs Tracked
            </p>
            <p className="text-3xl font-bold text-slate-900">{totals.jobCount}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
              Average Job Cost
            </p>
            <p className="text-3xl font-bold text-blue-600">
              {totals.jobCount > 0 ? fmt(totals.avgCostCents) : "—"}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total Spend
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {totals.jobCount > 0 ? fmt(totals.totalCostCents) : "—"}
            </p>
          </div>
        </div>

        {totals.jobCount === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
            <p className="text-slate-500 font-semibold text-lg mb-2">
              No cost data yet
            </p>
            <p className="text-slate-400 font-medium text-sm">
              Record job costs on completed service requests to start tracking cost intelligence.
            </p>
          </div>
        ) : (
          <>
            {/* Cost by Trade */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Average Cost by Trade
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Trade
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Avg Cost
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Total Spend
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Jobs
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {costByTrade.map((row) => (
                      <tr key={row.tradeCategory} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {tradeLabels[row.tradeCategory] ?? row.tradeCategory}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600">
                          {fmt(row.avgCostCents)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-700">
                          {fmt(row.totalCostCents)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-600">
                          {row.jobCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost by Subcontractor */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Average Cost by Subcontractor
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Subcontractor
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Avg Cost
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Total Spend
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Jobs
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {costBySub.map((row) => (
                      <tr key={row.subcontractorId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{row.companyName}</p>
                          <p className="text-sm text-slate-500 font-medium">{row.contactName}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600">
                          {fmt(row.avgCostCents)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-700">
                          {fmt(row.totalCostCents)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-600">
                          {row.jobCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost by Sub + Trade Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Cost by Subcontractor & Trade
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Subcontractor
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Trade
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Avg Cost
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Jobs
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {costBySubAndTrade.map((row, i) => (
                      <tr key={`${row.subcontractorId}-${row.tradeCategory}-${i}`} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {row.companyName}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {tradeLabels[row.tradeCategory] ?? row.tradeCategory}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600">
                          {fmt(row.avgCostCents)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-600">
                          {row.jobCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
