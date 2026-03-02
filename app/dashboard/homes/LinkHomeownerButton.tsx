"use client";

import { useState } from "react";

export default function LinkHomeownerButton({
  homeId,
  homeownerEmail,
}: {
  homeId: string;
  homeownerEmail: string;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState(homeownerEmail);
  const [showForm, setShowForm] = useState(false);

  const handleLink = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/homeowner/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeId, email }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setShowForm(false);
      } else {
        setError(data.error ?? "Failed to link account");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <p className="text-sm font-bold text-green-700">
        ✅ Homeowner account linked successfully!
      </p>
    );
  }

  return (
    <div>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          🔗 Link Homeowner Portal Account
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Homeowner email"
            className="px-3 py-2 border-2 border-slate-300 rounded-lg text-sm font-medium focus:border-blue-500 outline-none"
          />
          <button
            onClick={handleLink}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:bg-slate-400"
          >
            {loading ? "Linking..." : "Link Account"}
          </button>
          <button
            onClick={() => setShowForm(false)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        </div>
      )}
    </div>
  );
}