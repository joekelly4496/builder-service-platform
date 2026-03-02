"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  id: string;
  senderType: string;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: string;
}

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
  photos: string[] | null;
  photoUrls: string[] | null;
  completionPhotos: string[] | null;
  subcontractorNotes: string | null;
  completionNotes: string | null;
}

interface Rating {
  rating: number;
  review: string | null;
}

export default function HomeownerRequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState("");
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then((p) => setRequestId(p.id));
  }, [params]);

  useEffect(() => {
    if (requestId) checkAuth();
  }, [requestId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const [reqRes, msgRes, ratingRes] = await Promise.all([
        fetch(`/api/homeowner/requests/${requestId}?userId=${userId}`),
        fetch(`/api/requests/${requestId}/messages`),
        fetch(`/api/homeowner/requests/${requestId}/rating?userId=${userId}`),
      ]);

      const reqData = await reqRes.json();
      const msgData = await msgRes.json();
      const ratingData = await ratingRes.json();

      if (reqData.success) setRequest(reqData.request);
      else setError(reqData.error ?? "Failed to load request");

      if (msgData.success) setMessages(msgData.messages ?? []);
      if (ratingData.success && ratingData.rating) setExistingRating(ratingData.rating);
    } catch {
      setError("Failed to load request details");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderType: "homeowner",
          senderName: user.email,
          senderEmail: user.email,
          message: newMessage.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const submitRating = async () => {
    if (!ratingValue || !user) return;
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/homeowner/requests/${requestId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          rating: ratingValue,
          review: reviewText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRatingSuccess(true);
        setExistingRating({ rating: ratingValue, review: reviewText });
      }
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-600 font-medium">Loading request...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <a href="/homeowner/dashboard" className="px-6 py-3 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-all inline-block">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const allPhotos = [
    ...(request.photoUrls ?? []),
    ...(request.photos ?? []),
    ...(request.completionPhotos ?? []),
  ].filter(Boolean);

  const isCompleted = ["completed", "closed"].includes(request.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/homeowner/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm transition-all">
            ← Back to Dashboard
          </a>
          <div className="flex items-center gap-3">
            <StatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Request Overview */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h1 className="text-2xl font-bold text-slate-900 capitalize mb-1">
            {request.tradeCategory} Service Request
          </h1>
          <p className="text-sm text-slate-500 mb-4">
            Submitted {new Date(request.createdAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>

          {request.homeownerDescription && (
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Your Description</p>
              <p className="text-slate-700 font-medium">{request.homeownerDescription}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {request.scheduledFor && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">📅 Scheduled For</p>
                <p className="text-blue-900 font-bold">
                  {new Date(request.scheduledFor).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <p className="text-blue-700 font-medium text-sm">
                  {new Date(request.scheduledFor).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            )}

            {request.completedAt && (
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">✅ Completed On</p>
                <p className="text-emerald-900 font-bold">
                  {new Date(request.completedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
            )}
          </div>

          {request.subcontractorNotes && (
            <div className="mt-4 bg-purple-50 rounded-xl p-4 border border-purple-100">
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">🔧 Subcontractor Notes</p>
              <p className="text-purple-900 font-medium">{request.subcontractorNotes}</p>
            </div>
          )}

          {request.completionNotes && (
            <div className="mt-4 bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">📋 Completion Notes</p>
              <p className="text-green-900 font-medium">{request.completionNotes}</p>
            </div>
          )}
        </div>

        {/* Photos */}
        {allPhotos.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">📷 Photos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allPhotos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPhoto(url)}
                  className="aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-all hover:shadow-md"
                >
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">💬 Messages</h2>

          <div className="space-y-3 max-h-96 overflow-y-auto mb-4 pr-1">
            {messages.length === 0 ? (
              <p className="text-slate-400 font-medium text-sm text-center py-8">No messages yet. Start the conversation!</p>
            ) : (
              messages.map((msg) => {
                const isHomeowner = msg.senderType === "homeowner";
                return (
                  <div key={msg.id} className={`flex ${isHomeowner ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs sm:max-w-md rounded-2xl px-4 py-3 ${
                      isHomeowner
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : msg.senderType === "builder"
                        ? "bg-slate-100 text-slate-900 rounded-bl-sm"
                        : "bg-purple-50 text-purple-900 border border-purple-100 rounded-bl-sm"
                    }`}>
                      <p className={`text-xs font-bold mb-1 ${isHomeowner ? "text-blue-100" : msg.senderType === "builder" ? "text-slate-500" : "text-purple-500"}`}>
                        {isHomeowner ? "You" : `${msg.senderName} (${msg.senderType})`}
                      </p>
                      <p className="text-sm font-medium leading-relaxed">{msg.message}</p>
                      <p className={`text-xs mt-1 ${isHomeowner ? "text-blue-200" : "text-slate-400"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={sendingMessage || !newMessage.trim()}
              className="px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all text-sm"
            >
              {sendingMessage ? "..." : "Send"}
            </button>
          </div>
        </div>

        {/* Rating — only show if completed */}
        {isCompleted && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">⭐ Rate This Service</h2>

            {existingRating ? (
              <div className="text-center py-4">
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={`text-3xl ${s <= existingRating.rating ? "text-amber-400" : "text-slate-200"}`}>★</span>
                  ))}
                </div>
                {existingRating.review && (
                  <p className="text-slate-600 font-medium mt-2 italic">"{existingRating.review}"</p>
                )}
                <p className="text-sm text-slate-400 mt-2">Thanks for your feedback!</p>
              </div>
            ) : (
              <div>
                <div className="flex justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setRatingValue(s)}
                      className={`text-4xl transition-all hover:scale-110 ${s <= ratingValue ? "text-amber-400" : "text-slate-200 hover:text-amber-300"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Leave a review (optional)..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 outline-none transition-all resize-none mb-3"
                />
                <button
                  onClick={submitRating}
                  disabled={!ratingValue || submittingRating}
                  className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                >
                  {submittingRating ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img src={selectedPhoto} alt="Full size" className="max-w-full max-h-full rounded-xl shadow-2xl" />
          <button
            className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-slate-300"
            onClick={() => setSelectedPhoto(null)}
          >
            ×
          </button>
        </div>
      )}
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
  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${styles[status] ?? "bg-slate-100 text-slate-700"}`}>
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
  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${styles[priority] ?? "bg-slate-100 text-slate-700"}`}>
      {priority}
    </span>
  );
}