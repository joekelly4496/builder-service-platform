"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useBuilderId } from "@/lib/utils/use-builder-id";

interface HomeownerBreakdown {
  homeId: string;
  address: string;
  homeownerName: string;
  monthlyPriceCents: number;
  smsAddonEnabled: boolean;
  smsAddonPriceCents: number | null;
  status: string;
  nextBillingDate: string | null;
  billingAnchorDay: number;
}

interface BillingSummary {
  activeSubscriptions: number;
  mrrCents: number;
  invoicesSent: number;
  invoicesPaid: number;
  totalCollectedCents: number;
  netRevenueCents: number;
  homefrontSmsCostCents: number;
  smsHomeCount: number;
  messageCount: number;
  homeownerBreakdown: HomeownerBreakdown[];
}

interface ConnectStatus {
  connected: boolean;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

type TabKey = "homefront-bill" | "homeowner-revenue" | "revenue-summary";

export default function BillingDashboard() {
  const { builderId } = useBuilderId();
  const [activeTab, setActiveTab] = useState<TabKey>("revenue-summary");
  const [loading, setLoading] = useState(true);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [connectRes, summaryRes] = await Promise.all([
        fetch(`/api/builder/stripe/connect-status?builderId=${builderId}`),
        fetch(`/api/builder/billing/summary?builderId=${builderId}`),
      ]);
      const connectData = await connectRes.json();
      const summaryData = await summaryRes.json();
      if (connectData.success) setConnectStatus(connectData);
      if (summaryData.success) setSummary(summaryData);
    } catch (err) {
      console.error("Failed to load billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/builder/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ builderId: builderId }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Connect error:", err);
    } finally {
      setConnecting(false);
    }
  };

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "revenue-summary", label: "Revenue Summary" },
    { key: "homeowner-revenue", label: "My Homeowner Revenue" },
    { key: "homefront-bill", label: "My Homefront Bill" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <p className="text-slate-600 font-medium">Loading billing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Billing &amp; Revenue</h1>
              <p className="text-base font-medium text-slate-600 mt-1">Manage homeowner billing and track your revenue</p>
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard/pricing" className="px-4 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-slate-700">
                My Pricing
              </Link>
              <Link href="/dashboard" className="px-4 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-slate-700">
                &larr; Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stripe Connect Status */}
        {!connectStatus?.onboardingComplete && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-amber-900">Connect Your Bank Account</h2>
                <p className="text-sm text-amber-800 mt-1">
                  Connect via Stripe Express to receive payments from homeowners. No platform fees — only standard Stripe processing fees apply.
                </p>
              </div>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="px-5 py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all disabled:opacity-50"
              >
                {connecting ? "Redirecting..." : connectStatus?.connected ? "Complete Setup" : "Connect Stripe"}
              </button>
            </div>
          </div>
        )}

        {connectStatus?.onboardingComplete && (
          <div className="bg-green-50 rounded-2xl border border-green-200 p-4 mb-8 flex items-center gap-3">
            <span className="text-green-600 font-bold">Stripe Connected</span>
            <span className="text-sm text-green-700">
              Charges: {connectStatus.chargesEnabled ? "Enabled" : "Pending"} |
              Payouts: {connectStatus.payoutsEnabled ? "Enabled" : "Pending"}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "revenue-summary" && summary && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Active Subscriptions" value={String(summary.activeSubscriptions)} color="blue" />
              <StatCard label="Monthly Recurring Revenue" value={fmt(summary.mrrCents)} color="green" />
              <StatCard label="Invoices Paid (This Month)" value={`${summary.invoicesPaid}/${summary.invoicesSent}`} color="purple" />
              <StatCard label="Net Revenue (After Fees)" value={fmt(summary.netRevenueCents)} color="emerald" />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Revenue Breakdown</h2>
              <div className="space-y-3">
                <Row label="Gross MRR from Homeowners" value={fmt(summary.mrrCents)} />
                <Row label="Homefront SMS Costs" value={summary.homefrontSmsCostCents > 0 ? `-${fmt(summary.homefrontSmsCostCents)}` : "$0.00"} negative={summary.homefrontSmsCostCents > 0} />
                <Row label="One-Time Invoice Revenue" value={fmt(summary.totalCollectedCents)} />
                <div className="border-t-2 border-slate-200 pt-3">
                  <Row label="Net Revenue" value={fmt(summary.netRevenueCents)} bold />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "homeowner-revenue" && summary && (
          <div className="space-y-6">
            {summary.homeownerBreakdown.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
                <p className="text-slate-500 font-medium">No active homeowner subscriptions yet.</p>
                <p className="text-sm text-slate-400 mt-1">Set up billing for a home from the home detail page.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200/60">
                  <h2 className="text-lg font-bold text-slate-900">Per-Homeowner Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Homeowner</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Address</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Portal</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">SMS Add-on</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total/Mo</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Next Billing</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.homeownerBreakdown.map((ho) => {
                        const total = ho.monthlyPriceCents + (ho.smsAddonPriceCents ?? 0);
                        return (
                          <tr key={ho.homeId} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{ho.homeownerName}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{ho.address}</td>
                            <td className="px-6 py-4 text-sm text-right font-medium">{fmt(ho.monthlyPriceCents)}</td>
                            <td className="px-6 py-4 text-sm text-right font-medium">
                              {ho.smsAddonEnabled ? fmt(ho.smsAddonPriceCents ?? 0) : "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-right font-bold text-slate-900">{fmt(total)}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {ho.nextBillingDate ? new Date(ho.nextBillingDate).toLocaleDateString() : "-"}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                ho.status === "active" ? "bg-green-100 text-green-700" :
                                ho.status === "past_due" ? "bg-red-100 text-red-700" :
                                "bg-slate-100 text-slate-600"
                              }`}>
                                {ho.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "homefront-bill" && summary && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="SMS Homes Active" value={String(summary.smsHomeCount)} color="blue" />
              <StatCard label="Messages This Month" value={String(summary.messageCount)} color="purple" />
              <StatCard label="Your Homefront Bill" value={fmt(summary.homefrontSmsCostCents)} color="amber" />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Homefront Charges (This Month)</h2>
              <p className="text-sm text-slate-500 mb-4">These are the wholesale costs Homefront charges you. You set your own retail prices to homeowners.</p>
              <div className="space-y-3">
                <Row label={`SMS Homes (${summary.smsHomeCount} x $5.00/mo)`} value={fmt(summary.smsHomeCount * 500)} />
                <Row label={`SMS Messages (${summary.messageCount} x $0.02)`} value={fmt(summary.messageCount * 2)} />
                <div className="border-t-2 border-slate-200 pt-3">
                  <Row label="Total Homefront Bill" value={fmt(summary.homefrontSmsCostCents)} bold />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "from-blue-50 to-blue-100/50 text-blue-700 border-blue-200/60",
    green: "from-green-50 to-green-100/50 text-green-700 border-green-200/60",
    purple: "from-purple-50 to-purple-100/50 text-purple-700 border-purple-200/60",
    emerald: "from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-200/60",
    amber: "from-amber-50 to-amber-100/50 text-amber-700 border-amber-200/60",
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.blue} p-5 rounded-2xl shadow-sm border`}>
      <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function Row({ label, value, negative, bold }: { label: string; value: string; negative?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-slate-700 ${bold ? "font-bold" : "font-medium"}`}>{label}</span>
      <span className={`${bold ? "font-bold text-lg" : "font-semibold"} ${negative ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}
