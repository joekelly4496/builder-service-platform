"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  status: string;
};

export default function ActionsPanel({ id, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "ack" | "schedule" | "complete">(null);
  const [err, setErr] = useState<string>("");
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [completionNotes, setCompletionNotes] = useState<string>("");

  const canAcknowledge = useMemo(
    () => ["submitted", "escalated"].includes(status),
    [status]
  );
  const canSchedule = useMemo(
    () => ["acknowledged", "submitted", "escalated"].includes(status),
    [status]
  );
  const canComplete = useMemo(
    () => ["scheduled", "in_progress", "acknowledged"].includes(status),
    [status]
  );

  async function post(url: string, body?: any) {
    setErr("");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
  }

  async function acknowledge() {
    setBusy("ack");
    try {
      await post(`/api/requests/${id}/acknowledge`);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to acknowledge");
    } finally {
      setBusy(null);
    }
  }

  async function schedule() {
    setBusy("schedule");
    try {
      if (!scheduledFor) throw new Error("Pick a scheduled date/time first.");
      await post(`/api/requests/${id}/schedule`, { scheduledFor });
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to schedule");
    } finally {
      setBusy(null);
    }
  }

  async function complete() {
    setBusy("complete");
    try {
      await post(`/api/requests/${id}/complete`, { completionNotes });
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to complete");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Actions</h3>

      {err && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 font-medium text-sm">
          {err}
        </div>
      )}

      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-900">Acknowledge</p>
            <p className="text-sm text-slate-700 font-medium">
              Confirms you’ve seen the request and stops SLA counting.
            </p>
          </div>
          <button
            onClick={acknowledge}
            disabled={!canAcknowledge || !!busy}
            className="px-4 py-2 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {busy === "ack" ? "Working..." : "Acknowledge"}
          </button>
        </div>

        <div className="border-t border-slate-200/60 pt-5">
          <p className="font-semibold text-slate-900 mb-1">Schedule</p>
          <p className="text-sm text-slate-700 font-medium mb-3">
            Set the scheduled date/time.
          </p>

          <div className="flex items-center gap-3">
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium"
            />
            <button
              onClick={schedule}
              disabled={!canSchedule || !!busy}
              className="px-4 py-2 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {busy === "schedule" ? "Working..." : "Schedule"}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200/60 pt-5">
          <p className="font-semibold text-slate-900 mb-1">Complete</p>
          <p className="text-sm text-slate-700 font-medium mb-3">
            Mark the job done and store completion notes.
          </p>

          <textarea
            rows={3}
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder="Optional completion notes..."
            className="w-full px-4 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium mb-3"
          />

          <button
            onClick={complete}
            disabled={!canComplete || !!busy}
            className="w-full px-4 py-2 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {busy === "complete" ? "Working..." : "Mark Completed"}
          </button>
        </div>
      </div>
    </div>
  );
}


