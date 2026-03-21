"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = createSupabaseBrowserClient();

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
  acknowledgedAt: string | null;
  slaAcknowledgeDeadline: string;
  photos: string[] | null;
  photoUrls: string[] | null;
  completionPhotos: string[] | null;
  subcontractorNotes: string | null;
  completionNotes: string | null;
  subcontractor: {
    companyName: string;
    contactName: string;
    email?: string;
    phone: string | null;
  } | null;
  home: {
    address: string;
    city: string;
    state: string;
    homeownerName: string;
    homeownerEmail: string;
  } | null;
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
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    params.then((p) => setRequestId(p.id));
  }, [params]);

  useEffect(() => {
    if (requestId) checkAuth();
  }, [requestId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/homeowner/login";
      return;
    }
    setUser(session.user);
    await fetchData(session.user.id);
  };

  const fetchMessages = async () => {
    if (!requestId) return;
    const res = await fetch(`/api/requests/${requestId}/messages`);
    const data = await res.json();
    if (data.success) setMessages(data.messages ?? []);
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
      if (ratingData.success && ratingData.rating) {
        setExistingRating(ratingData.rating);
        setRatingValue(ratingData.rating.rating);
        setReviewText(ratingData.rating.review ?? "");
      }
    } catch {
      setError("Failed to load request details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!requestId) return;
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [requestId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !request) return;
    setSending(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderType: "homeowner",
          senderName: request.home?.homeownerName ?? user.email,
          senderEmail: request.home?.homeownerEmail ?? user.email,
          message: newMessage.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage("");
        fetchMessages();
      } else {
        alert("Failed to send message");
      }
    } catch {
      alert("Error sending message");
    } finally {
      setSending(false);
    }
  };

  const submitRating = async () => {
    if (!ratingValue || !user) return;
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/homeowner/requests/${requestId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, rating: ratingValue, review: reviewText }),
      });
      const data = await res.json();
      if (data.success) setExistingRating({ rating: ratingValue, review: reviewText });
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Loading your request...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md text-center">
          <p className="text-red-600 font-bold mb-4">{error}</p>
          <a href="/homeowner/dashboard" className="text-emerald-600 font-semibold">← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  const now = new Date();
  const slaDeadline = new Date(request.slaAcknowledgeDeadline);
  const hoursRemaining = Math.round((slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60));

  const submittedPhotos = (request.photoUrls ?? []).filter(Boolean);
  const completionPhotos = (request.completionPhotos ?? []).filter(Boolean);
  const isCompleted = ["completed", "closed"].includes(request.status);

  const buildGoogleCalendarUrl = () => {
    if (!request.scheduledFor) return "";
    const start = new Date(request.scheduledFor);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${request.tradeCategory} Service Appointment`,
      dates: `${formatDate(start)}/${formatDate(end)}`,
      details: `Contractor: ${request.subcontractor?.companyName ?? ""}\n\n${request.homeownerDescription ?? ""}`,
      location: request.home ? `${request.home.address}, ${request.home.city}, ${request.home.state}` : "",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8">
      <div className="max-w-4xl mx-auto">

        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-8 rounded-2xl mb-6">
          <a href="/homeowner/dashboard" className="text-emerald-100 text-sm font-medium hover:text-white mb-4 inline-block">
            ← Back to Dashboard
          </a>
          <h1 className="text-3xl font-bold">
            Welcome, {request.home?.homeownerName ?? user?.email?.split("@")[0]}!
          </h1>
          <p className="text-lg font-medium mt-2 opacity-90">Track Your Service Request</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 capitalize">
                {request.tradeCategory} Service Request
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase mb-1">Status</p>
                  <StatusBadge status={request.status} />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase mb-1">Priority</p>
                  <PriorityBadge priority={request.priority} />
                </div>

                {request.homeownerDescription && (
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase mb-1">Your Description</p>
                    <p className="text-base text-slate-900 font-medium">{request.homeownerDescription}</p>
                  </div>
                )}

                {submittedPhotos.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase mb-2">📸 Submitted Photos</p>
                    <div className="grid grid-cols-2 gap-3">
                      {submittedPhotos.map((url, index) => (
                        <a key={index} href={url} target="_blank" rel="noopener noreferrer"
                          className="relative group overflow-hidden rounded-lg border-2 border-slate-200 hover:border-emerald-500 transition-all">
                          <img src={url} alt={`Photo ${index + 1}`} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200" />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {request.scheduledFor && (
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                    <p className="text-sm font-bold text-emerald-900 uppercase mb-2">Scheduled Appointment</p>
                    <p className="text-2xl font-bold text-emerald-700 mb-2">
                      {new Date(request.scheduledFor).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {new Date(request.scheduledFor).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </p>
                    <p className="text-sm text-emerald-800 font-medium mb-3">Please ensure someone is home at this time.</p>
                    <div className="flex gap-2">
                      <a href={buildGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer"
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold text-center text-sm">
                        Add to Google Calendar
                      </a>
                      <a href={`/api/ical/request/${request.id}`}
                        className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all font-semibold text-center text-sm">
                        Add to Apple Calendar
                      </a>
                    </div>
                  </div>
                )}

                {request.subcontractorNotes && (
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase mb-1">Contractor Notes</p>
                    <p className="text-base text-slate-900 font-medium">{request.subcontractorNotes}</p>
                  </div>
                )}

                {request.completionNotes && (
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase mb-1">Completion Notes</p>
                    <p className="text-base text-slate-900 font-medium">{request.completionNotes}</p>
                  </div>
                )}

                {completionPhotos.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase mb-2">📸 Completion Photos</p>
                    <div className="grid grid-cols-2 gap-3">
                      {completionPhotos.map((url, index) => (
                        <a key={index} href={url} target="_blank" rel="noopener noreferrer"
                          className="relative group overflow-hidden rounded-lg border-2 border-slate-200 hover:border-emerald-500 transition-all">
                          <img src={url} alt={`Completion photo ${index + 1}`} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200" />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {request.status === "submitted" && hoursRemaining > 0 && (
              <div className="rounded-2xl shadow-sm border p-6 bg-blue-50 border-blue-200">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Awaiting Response</h3>
                <p className="text-blue-700 font-semibold">
                  The contractor will acknowledge your request within {hoursRemaining} hours.
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Messages</h3>
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No messages yet. Send a message to the contractor!</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`p-4 rounded-xl ${
                      msg.senderType === "builder" ? "bg-blue-50 border-l-4 border-blue-500"
                      : msg.senderType === "subcontractor" ? "bg-purple-50 border-l-4 border-purple-500"
                      : "bg-green-50 border-l-4 border-green-500"
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-slate-900">{msg.senderName}</p>
                          <p className="text-xs text-slate-500 capitalize">{msg.senderType} — {new Date(msg.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-slate-800 font-medium">{msg.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-slate-200 pt-4">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 resize-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="mt-3 w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold disabled:bg-slate-400"
                >
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {request.subcontractor && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Assigned Contractor</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Company</p>
                    <p className="text-sm font-semibold text-slate-900">{request.subcontractor.companyName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Contact</p>
                    <p className="text-sm font-semibold text-slate-900">{request.subcontractor.contactName}</p>
                    {request.subcontractor.email && (
                      <p className="text-sm font-medium text-slate-700">{request.subcontractor.email}</p>
                    )}
                    {request.subcontractor.phone && (
                      <p className="text-sm font-medium text-slate-700">{request.subcontractor.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Service Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Submitted</p>
                  <p className="text-sm font-semibold text-slate-900">{new Date(request.createdAt).toLocaleString()}</p>
                </div>
                {request.acknowledgedAt && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Acknowledged</p>
                    <p className="text-sm font-semibold text-slate-900">{new Date(request.acknowledgedAt).toLocaleString()}</p>
                  </div>
                )}
                {request.completedAt && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Completed</p>
                    <p className="text-sm font-semibold text-slate-900">{new Date(request.completedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {isCompleted && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Rate This Service</h3>
                {existingRating ? (
                  <div className="text-center">
                    <div className="text-3xl mb-2">
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} style={{ color: s <= existingRating.rating ? "#f59e0b" : "#e5e7eb" }}>★</span>
                      ))}
                    </div>
                    {existingRating.review && (
                      <p className="text-slate-600 text-sm italic">"{existingRating.review}"</p>
                    )}
                    <p className="text-slate-400 text-xs mt-2">Thanks for your feedback!</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-center gap-1 mb-3">
                      {[1,2,3,4,5].map((s) => (
                        <button key={s} onClick={() => setRatingValue(s)}
                          className="text-3xl transition-all hover:scale-110"
                          style={{ color: s <= ratingValue ? "#f59e0b" : "#e5e7eb", background: "none", border: "none", cursor: "pointer" }}>
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Leave a review (optional)..."
                      rows={3}
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 resize-none mb-3"
                    />
                    <button
                      onClick={submitRating}
                      disabled={!ratingValue || submittingRating}
                      className="w-full py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:bg-slate-400 transition-all text-sm"
                    >
                      {submittingRating ? "Submitting..." : "Submit Rating"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {request.status === "completed" && (
              <div className="bg-emerald-50 rounded-2xl shadow-sm border-2 border-emerald-200 p-6 text-center">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="text-xl font-bold text-emerald-700 mb-2">Request Complete!</h3>
                <p className="text-sm text-emerald-600 font-medium">Your service request has been completed. Thank you!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
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
    <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ring-1 ${styles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {status.replace("_", " ").toUpperCase()}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 ring-red-200",
    normal: "bg-amber-100 text-amber-700 ring-amber-200",
    low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  };
  return (
    <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ring-1 ${styles[priority] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {priority.toUpperCase()}
    </span>
  );
}