"use client";

import { useState } from "react";

export default function CalendarFeedButton({
  builderId,
  entityType,
}: {
  builderId: string;
  entityType: "builder" | "subcontractor" | "home";
}) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const generateToken = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId: builderId }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
      } else {
        alert("Failed to generate token");
      }
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  const feedUrl = token
    ? `${window.location.origin}/api/ical/${entityType}/${builderId}?token=${token}`
    : "";

  const copyToClipboard = () => {
    if (feedUrl) {
      navigator.clipboard.writeText(feedUrl);
      alert("✅ Calendar feed URL copied to clipboard!");
    }
  };

  return (
    <div className="space-y-4">
      {!token ? (
        <button
          onClick={generateToken}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold disabled:bg-slate-400"
        >
          {loading ? "Generating..." : "Generate Calendar Feed"}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-sm font-bold text-slate-700 mb-2">Your Calendar Feed URL:</p>
            <code className="text-xs bg-white p-3 rounded-lg block overflow-x-auto border border-slate-200 font-mono">
              {feedUrl}
            </code>
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyToClipboard}
              className="px-6 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-all duration-200 font-semibold"
            >
              📋 Copy Feed URL
            </button>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold"
            >
              {showInstructions ? "Hide" : "Show"} Instructions
            </button>
          </div>

          {showInstructions && (
            <div className="p-4 bg-blue-50 rounded-xl space-y-3 text-sm">
              <div>
                <p className="font-bold text-blue-900 mb-2">📱 For Apple Calendar (iPhone/Mac):</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Open Calendar app</li>
                  <li>Tap "Calendars" at bottom</li>
                  <li>Tap "Add Subscription Calendar"</li>
                  <li>Paste the feed URL above</li>
                  <li>Tap "Subscribe"</li>
                </ol>
              </div>
              <div>
                <p className="font-bold text-blue-900 mb-2">🗓️ For Google Calendar:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Open Google Calendar on desktop</li>
                  <li>Click the "+" next to "Other calendars"</li>
                  <li>Select "From URL"</li>
                  <li>Paste the feed URL above</li>
                  <li>Click "Add calendar"</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
