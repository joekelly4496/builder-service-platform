"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format, differenceInDays, isPast } from "date-fns";

type Reminder = {
  id: string;
  title: string;
  description: string | null;
  intervalDays: number;
  nextDueDate: string;
  lastReminderSentAt: string | null;
  isActive: boolean;
};

type MaintenanceItem = {
  id: string;
  name: string;
  description: string | null;
  tradeCategory: string;
  installedAt: string | null;
  installNotes: string | null;
  createdAt: string;
  reminders: Reminder[];
};

const TRADE_CATEGORIES = [
  "hvac", "plumbing", "electrical", "roofing", "flooring",
  "painting", "landscaping", "drywall", "carpentry", "general",
];

const INTERVAL_PRESETS = [
  { label: "30 days (monthly)", value: 30 },
  { label: "60 days (bi-monthly)", value: 60 },
  { label: "90 days (quarterly)", value: 90 },
  { label: "180 days (semi-annual)", value: 180 },
  { label: "365 days (annual)", value: 365 },
  { label: "Custom", value: 0 },
];

const categoryIcons: Record<string, string> = {
  hvac: "❄️", plumbing: "🔧", electrical: "⚡", roofing: "🏠",
  flooring: "🪵", painting: "🎨", landscaping: "🌿", drywall: "🧱",
  carpentry: "🪚", general: "🔨",
};

function getReminderStatus(nextDueDate: string) {
  const date = new Date(nextDueDate);
  const daysUntil = differenceInDays(date, new Date());
  if (isPast(date)) return { label: "Overdue", color: "bg-red-100 text-red-700 border-red-200" };
  if (daysUntil <= 7) return { label: `Due in ${daysUntil}d`, color: "bg-amber-100 text-amber-700 border-amber-200" };
  if (daysUntil <= 30) return { label: `In ${daysUntil}d`, color: "bg-blue-100 text-blue-700 border-blue-200" };
  return { label: `In ${daysUntil}d`, color: "bg-gray-100 text-gray-600 border-gray-200" };
}

export default function BuilderMaintenancePage() {
  const params = useParams();
  const homeId = params.homeid as string;

  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    tradeCategory: "hvac",
    installedAt: "",
    installNotes: "",
    reminderTitle: "",
    reminderDescription: "",
    intervalPreset: 90,
    customIntervalDays: "",
  });

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/maintenance-items?homeId=${homeId}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setError("Could not load maintenance items. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [homeId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    if (name === "name" && !form.reminderTitle) {
      setForm((prev) => ({ ...prev, name: value, reminderTitle: value ? `Replace/Service ${value}` : "" }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);

    const intervalDays = form.intervalPreset === 0
      ? parseInt(form.customIntervalDays, 10)
      : form.intervalPreset;

    if (!intervalDays || intervalDays < 1) {
      setError("Please enter a valid reminder interval (at least 1 day).");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/maintenance-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeId,
          name: form.name,
          description: form.description || undefined,
          tradeCategory: form.tradeCategory,
          installedAt: form.installedAt || undefined,
          installNotes: form.installNotes || undefined,
          reminder: {
            title: form.reminderTitle,
            description: form.reminderDescription || undefined,
            intervalDays,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create maintenance item");
      }

      setSuccessMsg(`✅ "${form.name}" added successfully.`);
      setShowForm(false);
      setForm({
        name: "", description: "", tradeCategory: "hvac", installedAt: "",
        installNotes: "", reminderTitle: "", reminderDescription: "",
        intervalPreset: 90, customIntervalDays: "",
      });
      await loadItems();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(itemId: string, itemName: string) {
    if (!confirm(`Deactivate maintenance reminders for "${itemName}"? The homeowner will no longer receive emails for this item.`)) return;
    setDeletingId(itemId);
    try {
      const res = await fetch(`/api/maintenance-items?itemId=${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to deactivate");
      await loadItems();
      setSuccessMsg(`Reminders for "${itemName}" have been deactivated.`);
    } catch {
      setError("Could not deactivate. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Home Management</p>
              <h1 className="text-2xl font-bold text-gray-900">Maintenance Items</h1>
              <p className="mt-1 text-sm text-gray-500">
                Add items and schedule automated email reminders for the homeowner
              </p>
            </div>
            <a href="/dashboard/homes" className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-1">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">{successMsg}</div>
        )}

        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setError(""); setSuccessMsg(""); }}
            className="mb-8 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl hover:bg-gray-700 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Add Maintenance Item
          </button>
        )}

        {showForm && (
          <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">New Maintenance Item</h2>
              <button onClick={() => { setShowForm(false); setError(""); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name" value={form.name} onChange={handleFormChange}
                    placeholder="e.g. HVAC Filter, Water Heater" required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Trade Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="tradeCategory" value={form.tradeCategory} onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                  >
                    {TRADE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Item Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  name="description" value={form.description} onChange={handleFormChange}
                  placeholder="e.g. 20x25x1 pleated air filter"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Install Date <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    name="installedAt" type="date" value={form.installedAt} onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">First reminder = install date + interval</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Install Notes <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    name="installNotes" value={form.installNotes} onChange={handleFormChange}
                    placeholder="e.g. Brand: Honeywell, Model: CF100A"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">Reminder Schedule</p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Subject / Reminder Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="reminderTitle" value={form.reminderTitle} onChange={handleFormChange}
                    placeholder="e.g. Replace HVAC Filter" required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Message <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    name="reminderDescription" value={form.reminderDescription} onChange={handleFormChange}
                    rows={2}
                    placeholder="e.g. It's time to replace your HVAC filter. Use a 20x25x1 pleated filter, MERV 8 or higher."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Reminder Interval <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.intervalPreset}
                      onChange={(e) => setForm((prev) => ({ ...prev, intervalPreset: parseInt(e.target.value, 10) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                    >
                      {INTERVAL_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  {form.intervalPreset === 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Custom Interval (days) <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="customIntervalDays" type="number" min={1}
                        value={form.customIntervalDays} onChange={handleFormChange}
                        placeholder="e.g. 120"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit" disabled={submitting}
                  className="bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? "Saving…" : "Save Maintenance Item"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading maintenance items…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔧</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No maintenance items yet</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Add maintenance items to set up automated email reminders for the homeowner.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const activeReminders = item.reminders.filter((r) => r.isActive);
              const icon = categoryIcons[item.tradeCategory] || categoryIcons["general"];
              return (
                <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center text-xl">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-500 capitalize">
                            {item.tradeCategory.replace(/_/g, " ")}
                            {item.installedAt && ` · Installed ${format(new Date(item.installedAt), "MMM d, yyyy")}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeactivate(item.id, item.name)}
                          disabled={deletingId === item.id}
                          className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          {deletingId === item.id ? "Removing…" : "Deactivate Reminders"}
                        </button>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                      {activeReminders.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {activeReminders.map((r) => {
                            const status = getReminderStatus(r.nextDueDate);
                            return (
                              <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                                <div>
                                  <span className="font-medium text-gray-800">{r.title}</span>
                                  <span className="text-gray-400 mx-2">·</span>
                                  <span className="text-gray-500">Every {r.intervalDays}d</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 text-xs">
                                    Next: {format(new Date(r.nextDueDate), "MMM d, yyyy")}
                                  </span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${status.color}`}>
                                    {status.label}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-gray-400 italic">No active reminders</p>
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
