"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useBuilderId } from "@/lib/utils/use-builder-id";

interface PricingData {
  portalAccessMonthlyPrice: number;
  smsAddonMonthlyPrice: number;
  perMessagePrice: number;
}

export default function PricingSettingsPage() {
  const { builderId } = useBuilderId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<PricingData>({
    portalAccessMonthlyPrice: 1500,
    smsAddonMonthlyPrice: 1000,
    perMessagePrice: 5,
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const res = await fetch(`/api/builder/pricing?builderId=${builderId}`);
      const data = await res.json();
      if (data.success && data.pricing) {
        setPricing({
          portalAccessMonthlyPrice: data.pricing.portalAccessMonthlyPrice,
          smsAddonMonthlyPrice: data.pricing.smsAddonMonthlyPrice,
          perMessagePrice: data.pricing.perMessagePrice,
        });
      }
    } catch (err) {
      console.error("Failed to fetch pricing:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/builder/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ builderId: builderId, ...pricing }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Pricing saved successfully!");
      } else {
        setMessage("Failed to save pricing.");
      }
    } catch {
      setMessage("Failed to save pricing.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const centsToDisplay = (cents: number) => (cents / 100).toFixed(2);
  const displayToCents = (val: string) => Math.round(parseFloat(val || "0") * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <p className="text-slate-600 font-medium">Loading pricing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Pricing</h1>
              <p className="text-base font-medium text-slate-600 mt-1">Set the prices you charge homeowners</p>
            </div>
            <Link href="/dashboard" className="px-5 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold text-sm text-slate-700">
              &larr; Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Wholesale vs Retail explanation */}
        <div className="bg-blue-50 rounded-2xl border border-blue-200/60 p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-2">How Pricing Works</h2>
          <p className="text-sm text-blue-800">
            You set your own retail prices below. Homefront charges you a fixed wholesale rate
            ($5/home/month for SMS, $0.02/message). Everything above that is your margin.
            Stripe Connect handles the split automatically: 90% to you, 10% platform fee on every homeowner transaction.
          </p>
        </div>

        {/* Portal Access Price */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Portal Access</h2>
          <p className="text-sm text-slate-500 mb-4">Monthly fee homeowners pay for access to the homeowner portal after their warranty period.</p>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-slate-700">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={centsToDisplay(pricing.portalAccessMonthlyPrice)}
              onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d{0,2}$/.test(v) || v === "") setPricing(p => ({ ...p, portalAccessMonthlyPrice: displayToCents(v) })); }}
              className="w-32 px-4 py-2.5 border border-slate-300 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-slate-500 font-medium">/ month per homeowner</span>
          </div>
        </div>

        {/* SMS Add-on Price */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">SMS Add-on</h2>
          <p className="text-sm text-slate-500 mb-4">Monthly fee homeowners pay to receive SMS notifications. Your wholesale cost is $5/home/month.</p>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-slate-700">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={centsToDisplay(pricing.smsAddonMonthlyPrice)}
              onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d{0,2}$/.test(v) || v === "") setPricing(p => ({ ...p, smsAddonMonthlyPrice: displayToCents(v) })); }}
              className="w-32 px-4 py-2.5 border border-slate-300 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-slate-500 font-medium">/ month per homeowner</span>
          </div>
        </div>

        {/* Per-Message Price */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Per-Message Rate</h2>
          <p className="text-sm text-slate-500 mb-4">Charge per SMS message sent to a homeowner. Your wholesale cost is $0.02/message.</p>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-slate-700">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={centsToDisplay(pricing.perMessagePrice)}
              onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d{0,2}$/.test(v) || v === "") setPricing(p => ({ ...p, perMessagePrice: displayToCents(v) })); }}
              className="w-32 px-4 py-2.5 border border-slate-300 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-slate-500 font-medium">/ message</span>
          </div>
        </div>

        {/* Margin Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Your Margin Summary</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
              <div>Item</div>
              <div className="text-right">Your Price</div>
              <div className="text-right">Wholesale Cost</div>
              <div className="text-right">Your Margin</div>
            </div>
            <div className="grid grid-cols-4 gap-4 py-2 border-t border-slate-100">
              <div className="text-slate-700 font-medium">Portal Access</div>
              <div className="text-right font-bold">${centsToDisplay(pricing.portalAccessMonthlyPrice)}/mo</div>
              <div className="text-right text-slate-500">$0.00/mo</div>
              <div className="text-right font-bold text-green-600">
                ${centsToDisplay(Math.round(pricing.portalAccessMonthlyPrice * 0.9))}/mo
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 py-2 border-t border-slate-100">
              <div className="text-slate-700 font-medium">SMS Add-on</div>
              <div className="text-right font-bold">${centsToDisplay(pricing.smsAddonMonthlyPrice)}/mo</div>
              <div className="text-right text-slate-500">$5.00/mo</div>
              <div className="text-right font-bold text-green-600">
                ${centsToDisplay(Math.round(pricing.smsAddonMonthlyPrice * 0.9) - 500)}/mo
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 py-2 border-t border-slate-100">
              <div className="text-slate-700 font-medium">Per Message</div>
              <div className="text-right font-bold">${centsToDisplay(pricing.perMessagePrice)}/msg</div>
              <div className="text-right text-slate-500">$0.02/msg</div>
              <div className="text-right font-bold text-green-600">
                ${centsToDisplay(Math.round(pricing.perMessagePrice * 0.9) - 2)}/msg
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">* 10% platform fee is deducted from your retail price on every transaction via Stripe Connect.</p>
        </div>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Pricing"}
          </button>
          {message && (
            <p className={`text-sm font-semibold ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
