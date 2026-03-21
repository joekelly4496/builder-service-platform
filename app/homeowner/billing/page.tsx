"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = createSupabaseBrowserClient();

interface Subscription {
  id: string;
  status: string;
  monthlyPriceCents: number;
  smsAddonEnabled: boolean;
  smsAddonPriceCents: number | null;
  billingStartDate: string;
  nextBillingDate: string | null;
}

interface Invoice {
  id: string;
  status: string;
  totalCents: number;
  description: string | null;
  dueDate: string | null;
  paidAt: string | null;
  paymentUrl: string | null;
  createdAt: string;
}

export default function HomeownerBillingPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoicesList, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/homeowner/login";
      return;
    }
    await fetchBilling(session.user.id);
  };

  const fetchBilling = async (userId: string) => {
    try {
      const res = await fetch(`/api/homeowner/billing?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setSubscription(data.subscription);
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error("Failed to fetch billing:", err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <p className="text-slate-600 font-medium">Loading billing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
              <p className="text-sm font-medium text-slate-600 mt-0.5">Manage your subscription and invoices</p>
            </div>
            <a href="/homeowner/dashboard" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              &larr; Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Active Subscription */}
        {subscription ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Your Subscription</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                subscription.status === "active" ? "bg-green-100 text-green-700" :
                subscription.status === "past_due" ? "bg-red-100 text-red-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {subscription.status}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Portal Access</span>
                <span className="font-bold">{fmt(subscription.monthlyPriceCents)}/mo</span>
              </div>
              {subscription.smsAddonEnabled && subscription.smsAddonPriceCents && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">SMS Notifications</span>
                  <span className="font-bold">{fmt(subscription.smsAddonPriceCents)}/mo</span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Next billing date</span>
                <span className="font-semibold">
                  {subscription.nextBillingDate
                    ? new Date(subscription.nextBillingDate).toLocaleDateString()
                    : "Pending"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
            <p className="text-slate-500 font-medium">No active subscription.</p>
            <p className="text-sm text-slate-400 mt-1">Your builder will set up billing when your warranty period ends.</p>
          </div>
        )}

        {/* Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Invoices</h2>
          </div>
          {invoicesList.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-slate-400 font-medium">No invoices yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoicesList.map((inv) => (
                <div key={inv.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {inv.description || "Invoice"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString()}
                      {inv.dueDate && ` | Due: ${new Date(inv.dueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">{fmt(inv.totalCents)}</span>
                    {inv.status === "paid" ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Paid</span>
                    ) : inv.paymentUrl ? (
                      <a
                        href={inv.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                      >
                        Pay Now
                      </a>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {inv.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
