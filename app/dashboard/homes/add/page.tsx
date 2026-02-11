"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TRADE_CATEGORIES = [
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

type Home = {
  id: string;
  address: string;
  city: string;
  state: string;
};

export default function AddSubcontractorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [homes, setHomes] = useState<Home[]>([]);
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    tradeCategories: [] as string[],
  });
  const [homeAssignments, setHomeAssignments] = useState<Record<string, string[]>>({});

  // Fetch homes on component mount
  useEffect(() => {
    async function fetchHomes() {
      try {
        const response = await fetch("/api/homes/list");
        const result = await response.json();
        if (result.success) {
          setHomes(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch homes:", err);
      }
    }
    fetchHomes();
  }, []);

  const toggleTrade = (trade: string) => {
    setFormData((prev) => ({
      ...prev,
      tradeCategories: prev.tradeCategories.includes(trade)
        ? prev.tradeCategories.filter((t) => t !== trade)
        : [...prev.tradeCategories, trade],
    }));
  };

  const toggleHomeAssignment = (homeId: string, trade: string) => {
    setHomeAssignments((prev) => {
      const current = prev[homeId] || [];
      const updated = current.includes(trade)
        ? current.filter((t) => t !== trade)
        : [...current, trade];
      
      if (updated.length === 0) {
        const { [homeId]: removed, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [homeId]: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.tradeCategories.length === 0) {
      setError("Please select at least one trade category");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/subcontractors/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          homeAssignments,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Subcontractor added successfully!");
        router.push("/dashboard/subcontractors");
      } else {
        setError(result.error || "Failed to add subcontractor");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Add New Subcontractor
            </h1>
            <Link
              href="/dashboard/subcontractors"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                placeholder="ABC Plumbing LLC"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Contact Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person *
              </label>
              <input
                type="text"
                required
                value={formData.contactName}
                onChange={(e) =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="contact@company.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="555-0123"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Trade Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Trade Categories * (select all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TRADE_CATEGORIES.map((trade) => (
                  <button
                    key={trade}
                    type="button"
                    onClick={() => toggleTrade(trade)}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors capitalize ${
                      formData.tradeCategories.includes(trade)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    {trade}
                  </button>
                ))}
              </div>
            </div>

            {/* Home Assignments */}
            {formData.tradeCategories.length > 0 && homes.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Assign to Homes (Optional)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select which homes this subcontractor will service and for which trades
                </p>
                <div className="space-y-4">
                  {homes.map((home) => (
                    <div
                      key={home.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <p className="font-medium text-gray-900 mb-2">
                        {home.address}, {home.city}, {home.state}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formData.tradeCategories.map((trade) => (
                          <button
                            key={trade}
                            type="button"
                            onClick={() => toggleHomeAssignment(home.id, trade)}
                            className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
                              homeAssignments[home.id]?.includes(trade)
                                ? "bg-green-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {trade}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push("/dashboard/subcontractors")}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? "Adding..." : "Add Subcontractor"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
