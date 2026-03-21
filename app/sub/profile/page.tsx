"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TRADES = [
  "plumbing",
  "electrical",
  "hvac",
  "roofing",
  "flooring",
  "painting",
  "landscaping",
  "drywall",
  "carpentry",
  "general",
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

interface PricingRange {
  trade: string;
  min: number;
  max: number;
}

export default function SubProfilePage() {
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  // Profile fields
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [slug, setSlug] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [insuranceUrl, setInsuranceUrl] = useState("");
  const [insuranceExpiresAt, setInsuranceExpiresAt] = useState("");
  const [pricingRanges, setPricingRanges] = useState<PricingRange[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingInsurance, setUploadingInsurance] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/sub/login";
        return;
      }

      setAccessToken(session.access_token);

      const res = await fetch("/api/sub/profile", {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      if (!data.success) {
        setMessage(data.error);
        setMessageType("error");
        setLoading(false);
        return;
      }

      const p = data.profile;
      setCompanyName(p.companyName ?? "");
      setContactName(p.contactName ?? "");
      setPhone(p.phone ?? "");
      setBio(p.bio ?? "");
      setServiceArea(p.serviceArea ?? "");
      setSlug(p.slug ?? "");
      setLicenseNumber(p.licenseNumber ?? "");
      setLicenseUrl(p.licenseUrl ?? "");
      setInsuranceUrl(p.insuranceUrl ?? "");
      setInsuranceExpiresAt(
        p.insuranceExpiresAt
          ? new Date(p.insuranceExpiresAt).toISOString().split("T")[0]
          : ""
      );
      setPricingRanges((p.pricingRanges as PricingRange[]) ?? []);
      setIsVerified(p.isVerified ?? false);
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/sub/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          companyName,
          contactName,
          phone,
          bio,
          serviceArea,
          slug: slug || null,
          licenseNumber,
          licenseUrl,
          insuranceUrl,
          insuranceExpiresAt: insuranceExpiresAt || null,
          pricingRanges,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Profile saved successfully!");
        setMessageType("success");
      } else {
        setMessage(data.error);
        setMessageType("error");
      }
    } catch {
      setMessage("Failed to save profile");
      setMessageType("error");
    }
    setSaving(false);
  };

  const handleFileUpload = async (
    file: File,
    type: "license" | "insurance"
  ) => {
    if (type === "license") setUploadingLicense(true);
    else setUploadingInsurance(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/sub/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        if (type === "license") setLicenseUrl(data.url);
        else setInsuranceUrl(data.url);
        setMessage(`${type === "license" ? "License" : "Insurance"} document uploaded!`);
        setMessageType("success");
      } else {
        setMessage(data.error);
        setMessageType("error");
      }
    } catch {
      setMessage("Upload failed");
      setMessageType("error");
    }

    if (type === "license") setUploadingLicense(false);
    else setUploadingInsurance(false);
  };

  const addPricingRange = () => {
    setPricingRanges([...pricingRanges, { trade: "general", min: 0, max: 0 }]);
  };

  const removePricingRange = (index: number) => {
    setPricingRanges(pricingRanges.filter((_, i) => i !== index));
  };

  const updatePricingRange = (
    index: number,
    field: keyof PricingRange,
    value: string | number
  ) => {
    const updated = [...pricingRanges];
    updated[index] = { ...updated[index], [field]: value };
    setPricingRanges(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center">
        <p className="text-slate-600 font-semibold text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Edit Profile</h1>
              <p className="text-purple-200 font-medium mt-1">
                Your public subcontractor profile
              </p>
            </div>
            <div className="flex items-center gap-3">
              {slug && (
                <Link
                  href={`/subcontractors/${slug}`}
                  target="_blank"
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-semibold text-sm transition-all"
                >
                  View Public Profile
                </Link>
              )}
              <Link
                href="/sub/dashboard"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-semibold text-sm transition-all"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Status Message */}
        {message && (
          <div
            className={`p-4 rounded-xl font-medium text-sm ${
              messageType === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Verified Badge Status */}
        {isVerified && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-emerald-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-emerald-700 font-semibold text-sm">
              Your profile is verified
            </span>
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Contact Name *
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Profile URL Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 font-medium">
                  /subcontractors/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  placeholder="my-company"
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
                />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Service Area
            </label>
            <input
              type="text"
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              placeholder="e.g. Dallas-Fort Worth metro area"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Bio / About
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell builders about your company, experience, and specialties..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium resize-none"
            />
          </div>
        </div>

        {/* License & Insurance */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            License & Insurance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* License */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  License Document
                </label>
                {licenseUrl && (
                  <a
                    href={licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:underline font-medium mb-2 block"
                  >
                    View current document
                  </a>
                )}
                <label className="block cursor-pointer">
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      uploadingLicense
                        ? "bg-slate-100 text-slate-400"
                        : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                    }`}
                  >
                    {uploadingLicense ? "Uploading..." : "Upload License"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={uploadingLicense}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "license");
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Insurance */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Insurance Expiration Date
                </label>
                <input
                  type="date"
                  value={insuranceExpiresAt}
                  onChange={(e) => setInsuranceExpiresAt(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Insurance Document
                </label>
                {insuranceUrl && (
                  <a
                    href={insuranceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:underline font-medium mb-2 block"
                  >
                    View current document
                  </a>
                )}
                <label className="block cursor-pointer">
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      uploadingInsurance
                        ? "bg-slate-100 text-slate-400"
                        : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                    }`}
                  >
                    {uploadingInsurance ? "Uploading..." : "Upload Insurance"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={uploadingInsurance}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "insurance");
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Ranges */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Pricing Ranges{" "}
              <span className="text-sm font-medium text-slate-400">
                (optional)
              </span>
            </h2>
            <button
              onClick={addPricingRange}
              className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl font-semibold text-sm hover:bg-purple-100 border border-purple-200 transition-all"
            >
              + Add Range
            </button>
          </div>
          {pricingRanges.length === 0 ? (
            <p className="text-slate-500 font-medium text-sm">
              No pricing ranges set. Add ranges to show estimated costs on your
              public profile.
            </p>
          ) : (
            <div className="space-y-3">
              {pricingRanges.map((pr, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                >
                  <select
                    value={pr.trade}
                    onChange={(e) =>
                      updatePricingRange(index, "trade", e.target.value)
                    }
                    className="px-3 py-2 border border-slate-300 rounded-lg font-medium text-sm"
                  >
                    {TRADES.map((t) => (
                      <option key={t} value={t}>
                        {tradeLabels[t]}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-slate-500 font-medium">$</span>
                  <input
                    type="number"
                    value={pr.min || ""}
                    onChange={(e) =>
                      updatePricingRange(
                        index,
                        "min",
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="Min"
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg font-medium text-sm"
                  />
                  <span className="text-sm text-slate-500 font-medium">—</span>
                  <span className="text-sm text-slate-500 font-medium">$</span>
                  <input
                    type="number"
                    value={pr.max || ""}
                    onChange={(e) =>
                      updatePricingRange(
                        index,
                        "max",
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="Max"
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg font-medium text-sm"
                  />
                  <button
                    onClick={() => removePricingRange(index)}
                    className="text-red-400 hover:text-red-600 transition-colors ml-auto"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-8 py-3 rounded-xl font-bold text-base transition-all ${
              saving
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200"
            }`}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
