"use client";

import { useState } from "react";

interface Props {
  requestId: string;
  subcontractorId: string;
  homeId: string;
  tradeCategory: string;
  initialJobCostCents: number | null;
  builderName: string;
}

export default function JobCostAndReview({
  requestId,
  subcontractorId,
  homeId,
  tradeCategory,
  initialJobCostCents,
  builderName,
}: Props) {
  const [jobCostDollars, setJobCostDollars] = useState(
    initialJobCostCents != null ? (initialJobCostCents / 100).toFixed(2) : ""
  );
  const [savingCost, setSavingCost] = useState(false);
  const [costSaved, setCostSaved] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [error, setError] = useState("");

  const saveJobCost = async () => {
    setSavingCost(true);
    setError("");
    try {
      const cents = jobCostDollars
        ? Math.round(parseFloat(jobCostDollars) * 100)
        : null;
      const res = await fetch(`/api/builder/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobCostCents: cents }),
      });
      const data = await res.json();
      if (data.success) {
        setCostSaved(true);
        setTimeout(() => setCostSaved(false), 3000);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to save job cost");
    }
    setSavingCost(false);
  };

  const submitReview = async () => {
    if (!rating) return;
    setSubmittingReview(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subcontractorId,
          serviceRequestId: requestId,
          homeId,
          rating,
          comment,
          tradeCategory,
          reviewerName: builderName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewSubmitted(true);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to submit review");
    }
    setSubmittingReview(false);
  };

  return (
    <div className="space-y-6">
      {/* Job Cost */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-3">Job Cost</h3>
        <p className="text-sm text-slate-600 font-medium mb-3">
          Record the cost of this job for your cost intelligence reports.
        </p>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={jobCostDollars}
              onChange={(e) => setJobCostDollars(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
            />
          </div>
          <button
            onClick={saveJobCost}
            disabled={savingCost}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:bg-slate-300 transition-all"
          >
            {savingCost ? "Saving..." : costSaved ? "Saved!" : "Save Cost"}
          </button>
        </div>
      </div>

      {/* Builder Review */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-3">
          Review Subcontractor
        </h3>
        {reviewSubmitted ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  style={{ color: s <= rating ? "#f59e0b" : "#e5e7eb" }}
                >
                  ★
                </span>
              ))}
            </div>
            {comment && (
              <p className="text-slate-600 text-sm italic mb-2">
                &ldquo;{comment}&rdquo;
              </p>
            )}
            <p className="text-emerald-600 font-semibold text-sm">
              Review submitted! It will appear on their public profile.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-600 font-medium mb-3">
              Rate the subcontractor&apos;s work on this job.
            </p>
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  className="text-3xl transition-all hover:scale-110"
                  style={{
                    color: s <= rating ? "#f59e0b" : "#e5e7eb",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comments about their work quality, timeliness, communication..."
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none mb-3"
            />
            <button
              onClick={submitReview}
              disabled={!rating || submittingReview}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:bg-slate-300 transition-all"
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
