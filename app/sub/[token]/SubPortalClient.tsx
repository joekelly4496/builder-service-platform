"use client";

import { useState } from "react";
import Link from "next/link";

type Request = {
  request: any;
  home: any;
};

type CurrentRequest = Request & {
  subcontractor: any;
};

export default function SubPortalClient({
  currentRequest,
  allRequests,
  subcontractor,
}: {
  currentRequest: CurrentRequest;
  allRequests: Request[];
  subcontractor: any;
}) {
  const [selectedRequestId, setSelectedRequestId] = useState(currentRequest.request.id);

  const selectedRequest = allRequests.find((r) => r.request.id === selectedRequestId) || currentRequest;

  const now = new Date();
  const slaDeadline = new Date(selectedRequest.request.slaAcknowledgeDeadline);
  const hoursRemaining = Math.round((slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60));
  const isSlaBreached = slaDeadline < now && selectedRequest.request.status === "submitted";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold">Welcome, {subcontractor.contactName}!</h1>
          <p className="text-lg font-medium mt-2 opacity-90">{subcontractor.companyName}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Request List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Your Requests</h2>
              <div className="space-y-2">
                {allRequests.map(({ request, home }) => (
                  <button
                    key={request.id}
                    onClick={() => setSelectedRequestId(request.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedRequestId === request.id
                        ? "border-purple-500 bg-purple-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-bold text-slate-900 capitalize">{request.tradeCategory}</p>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="text-sm text-slate-600 font-medium">{home.address}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Request Detail */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 capitalize mb-2">
                    {selectedRequest.request.tradeCategory} Service
                  </h2>
                  <div className="flex gap-3">
                    <PriorityBadge priority={selectedRequest.request.priority} />
                    <StatusBadge status={selectedRequest.request.status} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Location
                  </p>
                  <p className="text-base font-semibold text-slate-900">
                    {selectedRequest.home.address}
                  </p>
                  <p className="text-base font-medium text-slate-700">
                    {selectedRequest.home.city}, {selectedRequest.home.state} {selectedRequest.home.zipCode}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Homeowner
                  </p>
                  <p className="text-base font-semibold text-slate-900">
                    {selectedRequest.home.homeownerName}
                  </p>
                  <p className="text-base font-medium text-slate-700">
                    {selectedRequest.home.homeownerEmail}
                  </p>
                  {selectedRequest.home.homeownerPhone && (
                    <p className="text-base font-medium text-slate-700">
                      {selectedRequest.home.homeownerPhone}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Issue Description
                  </p>
                  <p className="text-base font-medium text-slate-900">
                    {selectedRequest.request.homeownerDescription}
                  </p>
                </div>

                {selectedRequest.request.subcontractorNotes && (
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Your Notes
                    </p>
                    <p className="text-base font-medium text-slate-900">
                      {selectedRequest.request.subcontractorNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SLA Warning */}
            {selectedRequest.request.status === "submitted" && (
              <div
                className={`rounded-2xl shadow-sm border p-6 ${
                  isSlaBreached
                    ? "bg-red-50 border-red-200"
                    : hoursRemaining <= 4
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {isSlaBreached ? "⚠️ SLA BREACHED" : "⏰ Response Required"}
                </h3>
                {isSlaBreached ? (
                  <p className="text-red-700 font-semibold">
                    This request is overdue by {Math.abs(hoursRemaining)} hours. Please respond immediately!
                  </p>
                ) : (
                  <p className="text-slate-700 font-semibold">
                    Please acknowledge this request within {hoursRemaining} hours
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <RequestActions
              requestId={selectedRequest.request.id}
              currentStatus={selectedRequest.request.status}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestActions({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/acknowledge`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Request acknowledged!");
        window.location.reload();
      } else {
        alert("❌ " + (data.error || "Failed"));
      }
    } catch (err) {
      alert("❌ Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) {
      alert("Please select both date and time");
      return;
    }

    setLoading(true);
    try {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);

      const res = await fetch(`/api/requests/${requestId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor, notes }),
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Appointment scheduled!");
        window.location.reload();
      } else {
        alert("❌ " + (data.error || "Failed"));
      }
    } catch (err) {
      alert("❌ Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm("Mark this request as completed?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Request completed!");
        window.location.reload();
      } else {
        alert("❌ " + (data.error || "Failed"));
      }
    } catch (err) {
      alert("❌ Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Actions</h3>

      <div className="space-y-3">
        {currentStatus === "submitted" && (
          <button
            onClick={handleAcknowledge}
            disabled={loading}
            className="w-full px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 font-bold text-lg disabled:bg-slate-400"
          >
            {loading ? "Processing..." : "✓ Acknowledge Request"}
          </button>
        )}

        {["submitted", "acknowledged"].includes(currentStatus) && (
          <>
            {!showSchedule ? (
              <button
                onClick={() => setShowSchedule(true)}
                className="w-full px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 font-bold text-lg"
              >
                📅 Schedule Appointment
              </button>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Any special instructions..."
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSchedule(false)}
                    className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSchedule}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-400"
                  >
                    {loading ? "Saving..." : "Confirm"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {["scheduled", "in_progress"].includes(currentStatus) && (
          <button
            onClick={handleComplete}
            disabled={loading}
            className="w-full px-6 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-200 font-bold text-lg disabled:bg-slate-400"
          >
            {loading ? "Processing..." : "✓ Mark as Complete"}
          </button>
        )}

        {currentStatus === "completed" && (
          <div className="text-center py-6">
            <p className="text-emerald-700 font-bold text-xl">✓ Request Completed</p>
            <p className="text-sm text-slate-600 font-medium mt-2">
              Great work! This request is complete.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles = {
    urgent: "bg-red-100 text-red-700 ring-red-200",
    normal: "bg-amber-100 text-amber-700 ring-amber-200",
    low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  };

  return (
    <span
      className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
        styles[priority as keyof typeof styles]
      } ring-1`}
    >
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    submitted: "bg-blue-100 text-blue-700 ring-blue-200",
    acknowledged: "bg-purple-100 text-purple-700 ring-purple-200",
    scheduled: "bg-indigo-100 text-indigo-700 ring-indigo-200",
    in_progress: "bg-amber-100 text-amber-700 ring-amber-200",
    completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    escalated: "bg-red-100 text-red-700 ring-red-200",
    cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
    closed: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${
        styles[status as keyof typeof styles]
      } ring-1`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
