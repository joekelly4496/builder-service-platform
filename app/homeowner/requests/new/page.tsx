"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const supabase = createSupabaseBrowserClient();

const TRADE_CATEGORIES = [
  { value: "plumbing", label: "Plumbing", icon: "🔧" },
  { value: "electrical", label: "Electrical", icon: "⚡" },
  { value: "hvac", label: "HVAC", icon: "❄️" },
  { value: "roofing", label: "Roofing", icon: "🏠" },
  { value: "flooring", label: "Flooring", icon: "🪵" },
  { value: "painting", label: "Painting", icon: "🎨" },
  { value: "landscaping", label: "Landscaping", icon: "🌿" },
  { value: "drywall", label: "Drywall", icon: "🧱" },
  { value: "carpentry", label: "Carpentry", icon: "🪚" },
  { value: "general", label: "General", icon: "🔨" },
];

export default function NewRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    tradeCategory: "",
    priority: "normal",
    description: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/homeowner/login";
        return;
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...fileArray]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const submitData = new FormData();
      submitData.append("tradeCategory", formData.tradeCategory);
      submitData.append("priority", formData.priority);
      submitData.append("description", formData.description);

      files.forEach((file) => {
        submitData.append("photos", file);
      });

      const response = await fetch("/api/homeowner/requests", {
        method: "POST",
        body: submitData,
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/homeowner/dashboard");
        }, 2000);
      } else {
        setError(result.error || "Failed to submit request");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-green-200 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-700 mb-2">Request Submitted!</h2>
          <p className="text-slate-600 mb-4">
            Your service request has been sent to your builder. You&apos;ll receive a confirmation email shortly.
          </p>
          <p className="text-sm text-slate-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Submit Service Request</h1>
              <p className="mt-1 text-sm text-gray-500">
                Describe the issue and we&apos;ll notify your builder
              </p>
            </div>
            <a
              href="/homeowner/dashboard"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trade Category */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              What type of service do you need?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TRADE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, tradeCategory: cat.value })}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    formData.tradeCategory === cat.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: "urgent" })}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  formData.priority === "urgent"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                🔴 Urgent
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: "normal" })}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  formData.priority === "normal"
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                🟡 Normal
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: "low" })}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  formData.priority === "low"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                🟢 Low
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Describe the Issue
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Please provide details about the issue..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Photos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Photos (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Adding photos helps your builder understand the issue faster
            </p>
            <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
              <div className="text-center">
                <svg
                  className="mx-auto h-10 w-10 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-semibold text-blue-600">Click to upload</span> photos or videos
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, MP4 up to 50MB each</p>
              </div>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </p>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{file.type.startsWith("image/") ? "🖼️" : "🎥"}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-800 text-xs font-semibold ml-3"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <a
              href="/homeowner/dashboard"
              className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all text-center text-sm"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading || !formData.tradeCategory || !formData.description}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
