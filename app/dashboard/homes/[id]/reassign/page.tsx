"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const TRADE_CATEGORIES = [
  "plumbing",
  "electrical",
  "hvac",
  "roofing",
  "flooring",
  "painting",
  "landscaping",
  "drywall",
  "carpentry",
  "general",
];

type Home = {
  id: string;
  address: string;
  city: string;
  state: string;
};

type Subcontractor = {
  id: string;
  companyName: string;
  contactName: string;
  tradeCategories: string[];
};

type Assignment = {
  tradeCategory: string;
  subcontractorId: string;
};

export default function AssignTradesPage() {
  const router = useRouter();
  const params = useParams();
  const homeId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [home, setHome] = useState<Home | null>(null);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const [homeRes, subsRes, assignmentsRes] = await Promise.all([
          fetch(`/api/homes/${homeId}`),
          fetch(`/api/subcontractors/list`),
          fetch(`/api/homes/${homeId}/assignments`),
        ]);

        const homeData = await homeRes.json();
        const subsData = await subsRes.json();
        const assignmentsData = await assignmentsRes.json();

        if (homeData.success) setHome(homeData.data);
        if (subsData.success) setSubcontractors(subsData.data);
        if (assignmentsData.success) {
          const assignmentMap: Record<string, string> = {};
          assignmentsData.data.forEach((a: Assignment) => {
            assignmentMap[a.tradeCategory] = a.subcontractorId;
          });
          setAssignments(assignmentMap);
        }
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [homeId]);

  const handleAssignment = (trade: string, subId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [trade]: subId,
    }));
  };

  const handleRemoveAssignment = (trade: string) => {
    setAssignments((prev) => {
      const newAssignments = { ...prev };
      delete newAssignments[trade];
      return newAssignments;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/homes/${homeId}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Assignments updated successfully!");
        router.push("/dashboard/homes");
      } else {
        setError(result.error || "Failed to save assignments");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <p className="text-xl font-semibold text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Manage Trade Assignments
              </h1>
              <p className="text-base font-medium text-slate-600 mt-1">
                {home?.address}, {home?.city}, {home?.state}
              </p>
            </div>
            <Link
              href="/dashboard/homes"
              className="text-slate-600 hover:text-slate-900 font-semibold"
            >
              ← Back
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {TRADE_CATEGORIES.map((trade) => {
              const eligibleSubs = subcontractors.filter((sub) =>
                sub.tradeCategories.includes(trade)
              );

              if (eligibleSubs.length === 0) return null;

              return (
                <div
                  key={trade}
                  className="p-5 border border-slate-200 rounded-xl bg-slate-50/50"
                >
                  <h3 className="font-bold text-slate-900 mb-3 capitalize text-lg">
                    {trade}
                  </h3>
                  <div className="space-y-2">
                    {eligibleSubs.map((sub) => (
                      <label
                        key={sub.id}
                        className="flex items-center p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 cursor-pointer transition-all duration-200"
                      >
                        <input
                          type="radio"
                          name={trade}
                          checked={assignments[trade] === sub.id}
                          onChange={() => handleAssignment(trade, sub.id)}
                          className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="ml-3">
                          <p className="font-semibold text-slate-900">
                            {sub.companyName}
                          </p>
                          <p className="text-sm text-slate-600 font-medium">
                            {sub.contactName}
                          </p>
                        </div>
                      </label>
                    ))}
                    {assignments[trade] && (
                      <button
                        onClick={() => handleRemoveAssignment(trade)}
                        className="text-sm text-red-600 hover:text-red-700 font-semibold ml-3"
                      >
                        ✕ Remove assignment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => router.push("/dashboard/homes")}
              className="flex-1 px-6 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 disabled:bg-slate-400"
            >
              {saving ? "Saving..." : "Save Assignments"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
