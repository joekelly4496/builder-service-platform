"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

// This is the test home ID from our setup
const TEST_HOME_ID = "36defc61-f273-47b9-8606-33a99fb76e2d";

export default function DemoRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    tradeCategory: "",
    priority: "normal",
    description: "",
    homeownerEmail: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/submit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeId: TEST_HOME_ID,
          ...formData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(
          `✅ Request Submitted Successfully!\n\nRequest ID: ${result.data.requestId}\nStatus: ${result.data.status}\n\nCheck your Supabase database to see the new service_requests record!`
        );
        router.push("/");
      } else {
        setError(result.error || "Failed to submit request");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Submit Service Request
          </h1>
          <p className="text-gray-600 mb-8">
            This will create a real service request in your database!
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Trade Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What type of service do you need? *
              </label>
              <select
                required
                value={formData.tradeCategory}
                onChange={(e) =>
                  setFormData({ ...formData, tradeCategory: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category...</option>
                {TRADE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level *
              </label>
              <select
                required
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="urgent">🔴 Urgent (2 hour response)</option>
                <option value="normal">🟡 Normal (48 hour response)</option>
                <option value="low">🟢 Low (5 day response)</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe the issue *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                placeholder="Please provide details about the issue..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Email *
              </label>
              <input
                type="email"
                required
                value={formData.homeownerEmail}
                onChange={(e) =>
                  setFormData({ ...formData, homeownerEmail: e.target.value })
                }
                placeholder="your.email@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
