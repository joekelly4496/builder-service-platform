"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const statusStyles: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  acknowledged: "bg-purple-100 text-purple-700",
  scheduled: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  escalated: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-700",
  closed: "bg-slate-100 text-slate-700",
};

const priorityStyles: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  normal: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};

export default function SubDashboardPage() {
  const [subcontractor, setSubcontractor] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/sub/login";
        return;
      }

      const res = await fetch("/api/sub/dashboard", {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setSubcontractor(data.subcontractor);
      setRequests(data.requests);
      setLoading(false);
    };

    load();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/sub/login";
  };

  const activeRequests = requests.filter(({ request }) =>
    !["completed", "cancelled", "closed"].includes(request.status)
  );
  const completedRequests = requests.filter(({ request }) =>
    ["completed", "cancelled", "closed"].includes(request.status)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center">
        <p className="text-slate-600 font-semibold text-lg">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Account Not Linked</h1>
          <p className="text-slate-600 font-medium">{error}</p>
          <button
            onClick={handleSignOut}
            className="mt-6 px-6 py-2 bg-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-300"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {subcontractor?.contactName}!</h1>
              <p className="text-purple-200 font-medium mt-1">{subcontractor?.companyName}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-semibold text-sm transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 text-center">
            <p className="text-3xl font-bold text-slate-900">{requests.length}</p>
            <p className="text-sm font-semibold text-slate-500 mt-1">Total Requests</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 text-center">
            <p className="text-3xl font-bold text-purple-600">{activeRequests.length}</p>
            <p className="text-sm font-semibold text-slate-500 mt-1">Active</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 text-center">
            <p className="text-3xl font-bold text-emerald-600">{completedRequests.length}</p>
            <p className="text-sm font-semibold text-slate-500 mt-1">Completed</p>
          </div>
        </div>

        {/* Active Requests */}
        <h2 className="text-xl font-bold text-slate-900 mb-4">Active Requests</h2>
        <div className="space-y-4 mb-8">
          {activeRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/60">
              <p className="text-slate-500 font-medium">No active requests</p>
            </div>
          ) : (
            activeRequests.map(({ request, home, builder }) => (
              <Link
                key={request.id}
                href={`/sub/requests/${request.id}`}
                className="block bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:border-purple-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 capitalize">
                      {request.tradeCategory} — {home.address}
                    </h3>
                    <p className="text-slate-600 font-medium mt-1">{home.city}, {home.state}</p>
                    {builder?.companyName && (
                      <p className="text-purple-600 text-xs font-bold mt-1">Builder: {builder.companyName}</p>
                    )}
                    <p className="text-slate-500 text-sm mt-1">{request.homeownerDescription}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${statusStyles[request.status]}`}>
                      {request.status.replace("_", " ").toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${priorityStyles[request.priority]}`}>
                      {request.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
                {request.scheduledFor && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-sm font-semibold text-indigo-600">
                      📅 Scheduled: {new Date(request.scheduledFor).toLocaleDateString("en-US", {
                        weekday: "long", month: "long", day: "numeric"
                      })}
                      {(() => {
                        const hour = new Date(request.scheduledFor).getHours();
                        if (hour === 8) return " — Morning (8 AM – 12 PM)";
                        if (hour === 12) return " — Afternoon (12 PM – 4 PM)";
                        return " — All Day (8 AM – 4 PM)";
                      })()}
                    </p>
                  </div>
                )}
              </Link>
            ))
          )}
        </div>

        {/* Completed Requests */}
        {completedRequests.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Completed Requests</h2>
            <div className="space-y-3 opacity-70">
              {completedRequests.map(({ request, home, builder }) => (
                <Link
                  key={request.id}
                  href={`/sub/requests/${request.id}`}
                  className="block bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 hover:border-purple-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 capitalize">
                        {request.tradeCategory} — {home.address}
                      </h3>
                      <p className="text-slate-500 text-sm mt-0.5">{home.city}, {home.state}</p>
                      {builder?.companyName && (
                        <p className="text-purple-600 text-xs font-bold mt-0.5">Builder: {builder.companyName}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${statusStyles[request.status]}`}>
                      {request.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}