"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { format, differenceInDays, isPast } from "date-fns";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  nextDueDate: string;
  intervalDays: number;
  lastReminderSentAt: string | null;
  isActive: boolean;
}

interface MaintenanceItem {
  id: string;
  name: string;
  description: string | null;
  tradeCategory: string;
  installedAt: string | null;
  installNotes: string | null;
  reminders: Reminder[];
}

function getReminderStatus(nextDueDate: Date) {
  const daysUntilDue = differenceInDays(nextDueDate, new Date());
  if (isPast(nextDueDate))
    return { label: "Overdue", color: "bg-red-100 text-red-700 border-red-200" };
  if (daysUntilDue <= 7)
    return { label: `Due in ${daysUntilDue}d`, color: "bg-amber-100 text-amber-700 border-amber-200" };
  if (daysUntilDue <= 30)
    return { label: `Due in ${daysUntilDue}d`, color: "bg-blue-100 text-blue-700 border-blue-200" };
  return { label: `Due in ${daysUntilDue}d`, color: "bg-gray-100 text-gray-600 border-gray-200" };
}

const categoryIcons: Record<string, string> = {
  hvac: "❄️", plumbing: "🔧", electrical: "⚡", roofing: "🏠",
  flooring: "🪵", painting: "🎨", landscaping: "🌿", drywall: "🧱",
  carpentry: "🪚", general: "🔨",
};

export default function HomeownerMaintenancePage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/homeowner/login";
      return;
    }

    try {
      // Look up the homeowner's home via their profile/homes
      const { data: homes } = await supabase
        .from("homes")
        .select("id, address, city, state")
        .eq("homeowner_id", session.user.id)
        .limit(1);

      if (!homes || homes.length === 0) {
        setError("No home found for your account");
        setLoading(false);
        return;
      }

      const home = homes[0];
      const res = await fetch(`/api/maintenance-items?homeId=${home.id}`);
      const data = await res.json();

      if (data.items) {
        setItems(data.items);
      } else {
        setError(data.error ?? "Failed to load data");
      }
    } catch {
      setError("Failed to load maintenance data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-600 font-medium">Loading maintenance schedule...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <a href="/homeowner/dashboard" className="px-6 py-3 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-all inline-block">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Flatten all reminders for stats
  const allReminders = items.flatMap((item) =>
    item.reminders.filter((r) => r.isActive)
  );
  const overdueCount = allReminders.filter((r) => isPast(new Date(r.nextDueDate))).length;
  const upcomingCount = allReminders.filter((r) => {
    const days = differenceInDays(new Date(r.nextDueDate), new Date());
    return days >= 0 && days <= 30;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Maintenance Schedule</h1>
              <p className="mt-1 text-sm text-gray-500">
                Upcoming maintenance reminders for your home
              </p>
            </div>
            <a href="/homeowner/dashboard" className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-1">
              ← Back to Dashboard
            </a>
          </div>
          {allReminders.length > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-2xl font-bold text-gray-900">{allReminders.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Active Reminders</p>
              </div>
              <div className={`rounded-xl p-4 border ${overdueCount > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-gray-900"}`}>{overdueCount}</p>
                <p className={`text-xs mt-0.5 ${overdueCount > 0 ? "text-red-500" : "text-gray-500"}`}>Overdue</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-2xl font-bold text-blue-700">{upcomingCount}</p>
                <p className="text-xs text-blue-500 mt-0.5">Due This Month</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏠</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No maintenance items yet</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Your builder will add maintenance items and schedule reminders here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const icon = categoryIcons[item.tradeCategory] || categoryIcons["general"];
              const activeReminders = item.reminders.filter((r) => r.isActive);
              const hasOverdue = activeReminders.some((r) => isPast(new Date(r.nextDueDate)));

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border p-5 transition-shadow hover:shadow-md ${hasOverdue ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl ${hasOverdue ? "bg-red-100" : "bg-gray-100"}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base">{item.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5 capitalize">
                        {item.tradeCategory.replace(/_/g, " ")}
                      </p>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                      )}
                      {activeReminders.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {activeReminders.map((reminder) => {
                            const status = getReminderStatus(new Date(reminder.nextDueDate));
                            return (
                              <div key={reminder.id} className="flex items-center justify-between gap-3 text-sm">
                                <div className="flex items-center gap-3 text-gray-600">
                                  <span>{reminder.title}</span>
                                  <span className="text-xs text-gray-400">
                                    📅 {format(new Date(reminder.nextDueDate), "MMM d, yyyy")} · 🔁 Every {reminder.intervalDays} days
                                  </span>
                                </div>
                                <span className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full border ${status.color}`}>
                                  {status.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
