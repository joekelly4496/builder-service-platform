"use client";

import { useState } from "react";

export default function LinkSubcontractorButton({
  subcontractorId,
  subcontractorEmail,
}: {
  subcontractorId: string;
  subcontractorEmail: string;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState(subcontractorEmail);
  const [showForm, setShowForm] = useState(false);

  const handleLink = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sub/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subcontractorId, email }),
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
      <p className="text-xs font-bold text-green-700">✅ Linked!</p>
    );
  }

  return (
    <div>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="text-xs font-semibold text-purple-600 hover:text-purple-700"
        >
          🔗 Link Portal Account
        </button>
      ) : (
        <div className="flex flex-col gap-2 mt-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="px-2 py-1 border-2 border-slate-300 rounded-lg text-xs font-medium focus:border-purple-500 outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleLink}
              disabled={loading}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 disabled:bg-slate-400"
            >
              {loading ? "Linking..." : "Link"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
      )}
    </div>
  );
}