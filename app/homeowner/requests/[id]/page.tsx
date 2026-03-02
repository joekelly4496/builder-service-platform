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
  subcontractor: {
    companyName: string;
    contactName: string;
    phone: string | null;
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
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState("");
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
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
      <div style={{ minHeight: "100vh", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6b7280", fontWeight: 500 }}>Loading your request...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ background: "white", borderRadius: 16, padding: 32, maxWidth: 400, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <p style={{ color: "#dc2626", fontWeight: 700, marginBottom: 12 }}>Something went wrong</p>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>{error}</p>
          <a href="/homeowner/dashboard" style={{ color: "#2563eb", fontWeight: 600 }}>← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  const allPhotos = [...(request.photoUrls ?? []), ...(request.photos ?? [])].filter(Boolean);
  const completionPhotos = (request.completionPhotos ?? []).filter(Boolean);
  const isCompleted = ["completed", "closed"].includes(request.status);

  const statusColors: Record<string, { bg: string; color: string; border: string }> = {
    submitted: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    acknowledged: { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
    scheduled: { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" },
    in_progress: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
    completed: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
    escalated: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
    cancelled: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" },
    closed: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" },
  };

  const priorityColors: Record<string, { bg: string; color: string; border: string }> = {
    urgent: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
    normal: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
    low: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  };

  const sc = statusColors[request.status] ?? statusColors.cancelled;
  const pc = priorityColors[request.priority] ?? priorityColors.normal;

  const card: React.CSSProperties = {
    background: "white",
    borderRadius: 16,
    padding: 32,
    marginBottom: 20,
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    border: "1px solid #f0f0f0",
  };

  const label: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 0,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* Page Header */}
        <div style={{ marginBottom: "2rem" }}>
          <a href="/homeowner/dashboard" style={{ color: "#6b7280", fontSize: 14, fontWeight: 500, textDecoration: "none", display: "inline-block", marginBottom: 16 }}>
            ← Back to Dashboard
          </a>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#9ca3af", margin: 0 }}>
            Welcome, {user?.email?.split("@")[0]}!
          </h1>
          <p style={{ color: "#9ca3af", marginTop: 4, fontSize: 15, marginBottom: 0 }}>Track Your Service Request</p>
        </div>

        {/* Main Request Card */}
        <div style={card}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginTop: 0, marginBottom: 20, textTransform: "capitalize" }}>
            {request.tradeCategory} Service Request
          </h2>

          <div style={{ marginBottom: 16 }}>
            <p style={label}>Status</p>
            <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
              {request.status.replace("_", " ")}
            </span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={label}>Priority</p>
            <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>
              {request.priority}
            </span>
          </div>

          {request.homeownerDescription && (
            <div style={{ marginBottom: 16 }}>
              <p style={label}>Your Description</p>
              <p style={{ color: "#374151", fontWeight: 500, margin: 0 }}>{request.homeownerDescription}</p>
            </div>
          )}

          {request.scheduledFor && (
            <div style={{ marginBottom: 16 }}>
              <p style={label}>📅 Scheduled For</p>
              <p style={{ color: "#1d4ed8", fontWeight: 700, margin: 0 }}>
                {new Date(request.scheduledFor).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at {new Date(request.scheduledFor).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          )}

          {request.subcontractorNotes && (
            <div style={{ marginBottom: 16 }}>
              <p style={label}>Subcontractor Notes</p>
              <p style={{ color: "#374151", fontWeight: 500, margin: 0 }}>{request.subcontractorNotes}</p>
            </div>
          )}

          {request.completionNotes && (
            <div style={{ marginBottom: 16 }}>
              <p style={label}>Completion Notes</p>
              <p style={{ color: "#374151", fontWeight: 500, margin: 0 }}>{request.completionNotes}</p>
            </div>
          )}

          {allPhotos.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={label}>📸 Photos</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {allPhotos.map((url, i) => (
                  <button key={i} onClick={() => setSelectedPhoto(url)} style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", cursor: "pointer", padding: 0, aspectRatio: "4/3", background: "#f9fafb" }}>
                    <img src={url} alt={`Photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {completionPhotos.length > 0 && (
            <div style={{ marginTop: allPhotos.length > 0 ? 16 : 0 }}>
              <p style={label}>📸 Completion Photos</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {completionPhotos.map((url, i) => (
                  <button key={i} onClick={() => setSelectedPhoto(url)} style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", cursor: "pointer", padding: 0, aspectRatio: "4/3", background: "#f9fafb" }}>
                    <img src={url} alt={`Completion ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages Card */}
        <div style={card}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginTop: 0, marginBottom: 20 }}>Messages</h2>
          <div style={{ minHeight: 80, maxHeight: 360, overflowY: "auto", marginBottom: 16 }}>
            {messages.length === 0 ? (
              <p style={{ color: "#9ca3af", textAlign: "center", padding: "2rem 0", fontWeight: 500 }}>
                No messages yet. Send a message to the contractor!
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
                {messages.map((msg) => {
                  const isHomeowner = msg.senderType === "homeowner";
                  return (
                    <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isHomeowner ? "flex-end" : "flex-start" }}>
                      <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 4, marginTop: 0, textTransform: "capitalize" }}>
                        {isHomeowner ? "You" : `${msg.senderName} (${msg.senderType})`}
                      </p>
                      <div style={{
                        maxWidth: "75%",
                        padding: "10px 14px",
                        borderRadius: isHomeowner ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: isHomeowner ? "#2563eb" : "#f3f4f6",
                        color: isHomeowner ? "white" : "#111827",
                        fontSize: 14,
                        fontWeight: 500,
                        lineHeight: 1.5,
                      }}>
                        {msg.message}
                      </div>
                      <p style={{ fontSize: 11, color: "#d1d5db", marginTop: 4, marginBottom: 0 }}>
                        {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type your message..."
              rows={3}
              style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 500, resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#111827" }}
            />
            <button
              onClick={sendMessage}
              disabled={sendingMessage || !newMessage.trim()}
              style={{ marginTop: 10, width: "100%", padding: "12px", background: newMessage.trim() ? "#2563eb" : "#e5e7eb", color: newMessage.trim() ? "white" : "#9ca3af", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: newMessage.trim() ? "pointer" : "not-allowed" }}
            >
              {sendingMessage ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>

        {/* Assigned Contractor */}
        {request.subcontractor && (
          <div style={card}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginTop: 0, marginBottom: 20 }}>Assigned Contractor</h2>
            <div style={{ marginBottom: 12 }}>
              <p style={label}>Company</p>
              <p style={{ fontWeight: 700, color: "#111827", margin: 0 }}>{request.subcontractor.companyName}</p>
            </div>
            <div>
              <p style={label}>Contact</p>
              <p style={{ fontWeight: 700, color: "#111827", margin: 0 }}>{request.subcontractor.contactName}</p>
              {request.subcontractor.phone && (
                <p style={{ color: "#6b7280", margin: "2px 0 0", fontWeight: 500 }}>{request.subcontractor.phone}</p>
              )}
            </div>
          </div>
        )}

        {/* Service Details */}
        <div style={card}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginTop: 0, marginBottom: 20 }}>Service Details</h2>
          <div style={{ marginBottom: request.completedAt ? 12 : 0 }}>
            <p style={label}>Submitted</p>
            <p style={{ fontWeight: 700, color: "#111827", margin: 0 }}>{new Date(request.createdAt).toLocaleString()}</p>
          </div>
          {request.completedAt && (
            <div>
              <p style={label}>Completed</p>
              <p style={{ fontWeight: 700, color: "#15803d", margin: 0 }}>{new Date(request.completedAt).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Rating */}
        {isCompleted && (
          <div style={card}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginTop: 0, marginBottom: 20 }}>Rate This Service</h2>
            {existingRating ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} style={{ color: s <= existingRating.rating ? "#f59e0b" : "#e5e7eb" }}>★</span>
                  ))}
                </div>
                {existingRating.review && <p style={{ color: "#6b7280", fontStyle: "italic" }}>"{existingRating.review}"</p>}
                <p style={{ color: "#9ca3af", fontSize: 13 }}>Thanks for your feedback!</p>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                  {[1,2,3,4,5].map((s) => (
                    <button key={s} onClick={() => setRatingValue(s)} style={{ fontSize: 36, background: "none", border: "none", cursor: "pointer", color: s <= ratingValue ? "#f59e0b" : "#e5e7eb", transition: "color 0.15s" }}>★</button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Leave a review (optional)..."
                  rows={3}
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 500, resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 10 }}
                />
                <button
                  onClick={submitRating}
                  disabled={!ratingValue || submittingRating}
                  style={{ width: "100%", padding: 12, background: ratingValue ? "#f59e0b" : "#e5e7eb", color: ratingValue ? "white" : "#9ca3af", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: ratingValue ? "pointer" : "not-allowed" }}
                >
                  {submittingRating ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div onClick={() => setSelectedPhoto(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <img src={selectedPhoto} alt="Full size" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12 }} />
          <button onClick={() => setSelectedPhoto(null)} style={{ position: "absolute", top: 16, right: 20, color: "white", fontSize: 32, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>×</button>
        </div>
      )}
    </div>
  );
}