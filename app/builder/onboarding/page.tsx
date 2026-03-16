"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = createSupabaseBrowserClient();

const TRADE_OPTIONS = [
  "plumbing", "electrical", "hvac", "roofing", "flooring",
  "painting", "landscaping", "drywall", "carpentry", "general",
];

type HomeForm = {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  homeownerName: string;
  homeownerEmail: string;
  homeownerPhone: string;
};

type SubForm = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  tradeCategories: string[];
};

const emptyHome: HomeForm = {
  address: "", city: "", state: "", zipCode: "",
  homeownerName: "", homeownerEmail: "", homeownerPhone: "",
};

const emptySub: SubForm = {
  companyName: "", contactName: "", email: "", phone: "", tradeCategories: [],
};

export default function BuilderOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Company Info
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: Homes
  const [homes, setHomes] = useState<HomeForm[]>([{ ...emptyHome }]);

  // Step 3: Subcontractors
  const [subs, setSubs] = useState<SubForm[]>([{ ...emptySub }]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/builder/login";
      return;
    }

    try {
      const res = await fetch("/api/builder/auth/check", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();

      if (result.hasAccount) {
        setBuilderId(result.builderId);
        if (result.onboardingStatus === "completed") {
          window.location.href = "/dashboard";
          return;
        }
        // Resume from where they left off
        const stepMap: Record<string, number> = {
          company_info: 0,
          add_homes: 1,
          add_subcontractors: 2,
        };
        setCurrentStep(stepMap[result.onboardingStatus] ?? 0);
      }
    } catch {
      // No account yet, start from beginning
    }

    setLoading(false);
  }

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async function handleCompanyInfo() {
    if (!companyName.trim() || !contactName.trim()) {
      setError("Company name and contact name are required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const token = await getToken();
      const res = await fetch("/api/builder/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          step: "company_info",
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setBuilderId(result.builderId);
      setCurrentStep(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHomes() {
    setSubmitting(true);
    setError("");

    try {
      const validHomes = homes.filter(
        (h) => h.address.trim() && h.city.trim() && h.state.trim() && h.zipCode.trim() && h.homeownerName.trim() && h.homeownerEmail.trim()
      );

      const token = await getToken();
      const res = await fetch("/api/builder/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          step: "add_homes",
          builderId,
          homes: validHomes,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubcontractors() {
    setSubmitting(true);
    setError("");

    try {
      const validSubs = subs.filter(
        (s) => s.companyName.trim() && s.contactName.trim() && s.email.trim()
      );

      const token = await getToken();
      const res = await fetch("/api/builder/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          step: "add_subcontractors",
          builderId,
          subcontractors: validSubs.map((s) => ({
            ...s,
            tradeCategories: s.tradeCategories.length > 0 ? s.tradeCategories : ["general"],
          })),
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function updateHome(index: number, field: keyof HomeForm, value: string) {
    const updated = [...homes];
    updated[index] = { ...updated[index], [field]: value };
    setHomes(updated);
  }

  function updateSub(index: number, field: keyof SubForm, value: string | string[]) {
    const updated = [...subs];
    updated[index] = { ...updated[index], [field]: value };
    setSubs(updated);
  }

  function toggleSubTrade(index: number, trade: string) {
    const updated = [...subs];
    const current = updated[index].tradeCategories;
    updated[index] = {
      ...updated[index],
      tradeCategories: current.includes(trade)
        ? current.filter((t) => t !== trade)
        : [...current, trade],
    };
    setSubs(updated);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-lg font-semibold text-slate-600">Loading...</div>
      </div>
    );
  }

  const steps = ["Company Info", "Add Homes", "Add Subcontractors"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏗️</div>
          <h1 className="text-3xl font-bold text-slate-900">Set Up Your Account</h1>
          <p className="text-slate-600 mt-2 font-medium">
            Let&apos;s get your builder dashboard ready
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-10">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    i < currentStep
                      ? "bg-green-600 text-white"
                      : i === currentStep
                      ? "bg-green-600 text-white ring-4 ring-green-200"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {i < currentStep ? "✓" : i + 1}
                </div>
                <span className="text-xs font-semibold text-slate-600 mt-2">{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 mb-6 ${
                    i < currentStep ? "bg-green-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Company Info */}
        {currentStep === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Company Information</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="ABC Construction"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="555-123-4567"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleCompanyInfo}
              disabled={submitting}
              className="mt-8 w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all duration-200 disabled:bg-slate-400"
            >
              {submitting ? "Saving..." : "Continue"}
            </button>
          </div>
        )}

        {/* Step 2: Add Homes */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Add Your Homes</h2>
            <p className="text-slate-600 text-sm font-medium mb-6">
              Add the homes you manage. You can always add more later.
            </p>

            {homes.map((home, i) => (
              <div key={i} className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800">Home {i + 1}</h3>
                  {homes.length > 1 && (
                    <button
                      onClick={() => setHomes(homes.filter((_, idx) => idx !== i))}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={home.address}
                      onChange={(e) => updateHome(i, "address", e.target.value)}
                      placeholder="Street Address *"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-green-500 outline-none text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    value={home.city}
                    onChange={(e) => updateHome(i, "city", e.target.value)}
                    placeholder="City *"
                    className="px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-green-500 outline-none text-sm"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={home.state}
                      onChange={(e) => updateHome(i, "state", e.target.value)}
                      placeholder="State *"
                      className="px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-green-500 outline-none text-sm"
                    />
                    <input
                      type="text"
                      value={home.zipCode}
                      onChange={(e) => updateHome(i, "zipCode", e.target.value)}
                      placeholder="ZIP *"
                      className="px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-green-500 outline-none text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    value={home.homeownerName}
                    onChange={(e) => updateHome(i, "homeownerName", e.target.value)}
                    placeholder="Homeowner Name *"
                    className="px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-green-500 outline-none text-sm"
                  />
                  <input
                    type="email"
                    value={home.homeownerEmail}
                    onChange={(e) => updateHome(i, "homeownerEmail", e.target.value)}
                    placeholder="Homeowner Email *"
                    className="px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-green-500 outline-none text-sm"
                  />
                  <input
                    type="tel"
                    value={home.homeownerPhone}
                    onChange={(e) => updateHome(i, "homeownerPhone", e.target.value)}
                    placeholder="Homeowner Phone"
                    className="px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-green-500 outline-none text-sm"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={() => setHomes([...homes, { ...emptyHome }])}
              className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-semibold hover:border-green-400 hover:text-green-600 transition-all duration-200 text-sm"
            >
              + Add Another Home
            </button>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleHomes}
                disabled={submitting}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all duration-200 disabled:bg-slate-400"
              >
                {submitting ? "Saving..." : "Continue"}
              </button>
              <button
                onClick={() => {
                  setHomes([{ ...emptyHome }]);
                  handleHomes();
                }}
                disabled={submitting}
                className="py-3 px-6 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all duration-200 text-sm"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Add Subcontractors */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Add Your Subcontractors</h2>
            <p className="text-slate-600 text-sm font-medium mb-6">
              Add the trade partners who handle your service requests. You can add more later.
            </p>

            {subs.map((sub, i) => (
              <div key={i} className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800">Subcontractor {i + 1}</h3>
                  {subs.length > 1 && (
                    <button
                      onClick={() => setSubs(subs.filter((_, idx) => idx !== i))}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    value={sub.companyName}
                    onChange={(e) => updateSub(i, "companyName", e.target.value)}
                    placeholder="Company Name *"
                    className="px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-green-500 outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={sub.contactName}
                    onChange={(e) => updateSub(i, "contactName", e.target.value)}
                    placeholder="Contact Name *"
                    className="px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-green-500 outline-none text-sm"
                  />
                  <input
                    type="email"
                    value={sub.email}
                    onChange={(e) => updateSub(i, "email", e.target.value)}
                    placeholder="Email *"
                    className="px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-green-500 outline-none text-sm"
                  />
                  <input
                    type="tel"
                    value={sub.phone}
                    onChange={(e) => updateSub(i, "phone", e.target.value)}
                    placeholder="Phone"
                    className="px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-900 focus:border-green-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Trade Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TRADE_OPTIONS.map((trade) => (
                      <button
                        key={trade}
                        onClick={() => toggleSubTrade(i, trade)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                          sub.tradeCategories.includes(trade)
                            ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {trade}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setSubs([...subs, { ...emptySub }])}
              className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-semibold hover:border-green-400 hover:text-green-600 transition-all duration-200 text-sm"
            >
              + Add Another Subcontractor
            </button>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSubcontractors}
                disabled={submitting}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all duration-200 disabled:bg-slate-400"
              >
                {submitting ? "Finishing..." : "Complete Setup"}
              </button>
              <button
                onClick={() => {
                  setSubs([{ ...emptySub }]);
                  handleSubcontractors();
                }}
                disabled={submitting}
                className="py-3 px-6 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all duration-200 text-sm"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
