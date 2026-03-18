"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import NotificationBell from "../components/NotificationBell";

const supabase = createSupabaseBrowserClient();
interface ServiceRequest {
  id: string;
  tradeCategory: string;
  priority: string;
  status: string;
  homeownerDescription: string;
  createdAt: string;
  scheduledFor: string | null;
  completedAt: string | null;
  slaAcknowledgeDeadline: string;
}
interface HomeData {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  homeownerName: string;
}
export default function HomeownerDashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [home, setHome] = useState<HomeData | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/homeowner/login";
      return;
    }
    setUser(session.user);
    await fetchData(session.user.id);
  };
  const fetchData = async (userId: string) => {
    try {
      const res = await fetch(`/api/homeowner/dashboard?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setHome(data.home);
        setRequests(data.requests);
      } else {
        setError(data.error ?? "Failed to load data");
      }
    } catch (err) {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/homeowner/login";
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <p className="text-sm text-slate-500 mb-4">
            Your account may not be linked to a home yet. Please contact your builder.
          </p>
          <button
            onClick={handleSignOut}
            className="px-6 py-3 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }
  const activeRequests = requests.filter(
    (r) => !["completed", "cancelled", "closed"].includes(r.status)
  );
  const completedRequests = requests.filter((r) =>
    ["completed", "closed"].includes(r.status)
  );
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                🏠 {home?.homeownerName ?? "My Home"}
              </h1>
              <p className="text-sm font-medium text-slate-600 mt-0.5">
                {home?.address}, {home?.city}, {home?.state} {home?.zipCode}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/homeowner/maintenance"
                className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-all"
              >
                🔧 Maintenance
              </a>
              {user && <NotificationBell userId={user.id} />}
              <a
                href="/homeowner/settings"
                className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                aria-label="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              </a>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-blue-600">{requests.length}</p>
            <p className="text-sm font-semibold text-slate-600 mt-1">Total Requests</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-amber-600">{activeRequests.length}</p>
            <p className="text-sm font-semibold text-slate-600 mt-1">Active</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-green-600">{completedRequests.length}</p>
            <p className="text-sm font-semibold text-slate-600 mt-1">Completed</p>
          </div>
        </div>
        {/* Active Requests */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Active Requests</h2>
          {activeRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
              <p className="text-slate-500 font-medium">No active requests. All caught up! ✅</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRequests.map((req) => (
                <a
                  key={req.id}
                  href={`/homeowner/requests/${req.id}`}
                  className="block bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 capitalize text-lg">
                        {req.tradeCategory} Service
                      </p>
                      <p className="text-slate-600 font-medium text-sm mt-1">
                        {req.homeownerDescription ?? "No description provided"}
                      </p>
                      <p className="text-slate-400 text-xs mt-2">
                        Submitted {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <StatusBadge status={req.status} />
                      <PriorityBadge priority={req.priority} />
                    </div>
                  </div>
                  {req.scheduledFor && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-sm font-semibold text-blue-700">
                        📅 Scheduled: {new Date(req.scheduledFor).toLocaleString()}
                      </p>
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
        {/* Completed Requests */}
        {completedRequests.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Completed Requests</h2>
            <div className="space-y-3">
              {completedRequests.map((req) => (
                <a
                  key={req.id}
                  href={`/homeowner/requests/${req.id}`}
                  className="block bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all opacity-75 hover:opacity-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 capitalize">
                        {req.tradeCategory} Service
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        Completed {req.completedAt ? new Date(req.completedAt).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-700",
    acknowledged: "bg-purple-100 text-purple-700",
    scheduled: "bg-indigo-100 text-indigo-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    escalated: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-700",
    closed: "bg-slate-100 text-slate-700",
  };
  const cls = styles[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}
function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    urgent: "bg-red-100 text-red-700",
    normal: "bg-amber-100 text-amber-700",
    low: "bg-green-100 text-green-700",
  };
  const cls = styles[priority] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${cls}`}>
      {priority}
    </span>
  );
}
