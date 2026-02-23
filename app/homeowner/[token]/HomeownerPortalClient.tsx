"use client";

import { useEffect, useState } from "react";

interface Message {
  id: string;
  senderType: string;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: string;
}

export default function HomeownerPortalClient({
  request,
  home,
  subcontractor,
}: {
  request: any;
  home: any;
  subcontractor: any;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${request.id}/messages`);
      const data = await res.json();
      if (data.success) setMessages(data.messages);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/requests/${request.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderType: "homeowner",
          senderName: home.homeownerName,
          senderEmail: home.homeownerEmail,
          message: newMessage,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNewMessage("");
        fetchMessages();
      } else {
        alert("Failed to send message");
      }
    } catch (err) {
      alert("Error sending message");
    } finally {
      setSending(false);
    }
  };

  const now = new Date();
  const slaDeadline = new Date(request.slaAcknowledgeDeadline);
  const hoursRemaining = Math.round(
    (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)
  );

  const buildGoogleCalendarUrl = () => {
    if (!request.scheduledFor) return "";

    const start = new Date(request.scheduledFor);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const formatDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${request.tradeCategory} Service Appointment`,
      dates: `${formatDate(start)}/${formatDate(end)}`,
      details: `Contractor: ${subcontractor.companyName}\n\n${request.homeownerDescription ?? ""}`,
      location: `${home.address}, ${home.city}, ${home.state}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const icsHref = `/api/ical/request/${request.id}`;

  const photoUrls: string[] = Array.isArray(request.photoUrls)
    ? request.photoUrls
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-8 rounded-2xl mb-6">
          <h1 className="text-3xl font-bold">Welcome, {home.homeownerName}!</h1>
          <p className="text-lg font-medium mt-2 opacity-90">
            Track Your Service Request
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 capitalize">
                {request.tradeCategory} Service Request
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase mb-1">
                    Status
                  </p>
                  <StatusBadge status={request.status} />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase mb-1">
                    Priority
                  </p>
                  <PriorityBadge priority={request.priority} />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase mb-1">
                    Your Description
                  </p>
                  <p className="text-base text-slate-900 font-medium">
                    {request.homeownerDescription}
                  </p>
                </div>

                {request.scheduledFor && (
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                    <p className="text-sm font-bold text-emerald-900 uppercase mb-2">
                      Scheduled Appointment
                    </p>
                    <p className="text-2xl font-bold text-emerald-700 mb-2">
                      {new Date(request.scheduledFor).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        }
                      )}{" "}
                      at{" "}
                      {new Date(request.scheduledFor).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        }
                      )}
                    </p>
                    <p className="text-sm text-emerald-800 font-medium mb-3">
                      Please ensure someone is home at this time.
                    </p>

                    <div className="flex gap-2">
                      <a
                        href={buildGoogleCalendarUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold text-center text-sm"
                      >
                        Add to Google Calendar
                      </a>

                      <a
                        href={icsHref}
                        className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all font-semibold text-center text-sm"
                      >
                        Add to Apple Calendar
                      </a>
                    </div>
                  </div>
                )}

                {request.subcontractorNotes && (
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase mb-1">
                      Contractor Notes
                    </p>
                    <p className="text-base text-slate-900 font-medium">
                      {request.subcontractorNotes}
                    </p>
                  </div>
                )}

                {request.completionNotes && (
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase mb-1">
                      Completion Notes
                    </p>
                    <p className="text-base text-slate-900 font-medium">
                      {request.completionNotes}
                    </p>
                  </div>
                )}

                {photoUrls.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase mb-2">
                      📸 Completion Photos
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {photoUrls.map((url: string, index: number) => (
                        <a
                          key={`${url}-${index}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group overflow-hidden rounded-lg border-2 border-slate-200 hover:border-emerald-500 transition-all"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Completion photo ${index + 1}`}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                          />
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
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Awaiting Response
                </h3>
                <p className="text-blue-700 font-semibold">
                  The contractor will acknowledge your request within{" "}
                  {hoursRemaining} hours.
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Messages</h3>

              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {loading && messages.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    Loading messages...
                  </p>
                ) : messages.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    No messages yet. Send a message to the contractor!
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-xl ${
                        msg.senderType === "builder"
                          ? "bg-blue-50 border-l-4 border-blue-500"
                          : msg.senderType === "subcontractor"
                          ? "bg-purple-50 border-l-4 border-purple-500"
                          : "bg-green-50 border-l-4 border-green-500"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-slate-900">
                            {msg.senderName}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">
                            {msg.senderType} -{" "}
                            {new Date(msg.createdAt).toLocaleString()}
                          </p>
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Assigned Contractor
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Company
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {subcontractor.companyName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Contact
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {subcontractor.contactName}
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {subcontractor.email}
                  </p>
                  {subcontractor.phone && (
                    <p className="text-sm font-medium text-slate-700">
                      {subcontractor.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Service Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Submitted
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>

                {request.acknowledgedAt && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Acknowledged
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {new Date(request.acknowledgedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {request.completedAt && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Completed
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {new Date(request.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {request.status === "completed" && (
              <div className="bg-emerald-50 rounded-2xl shadow-sm border-2 border-emerald-200 p-6 text-center">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="text-xl font-bold text-emerald-700 mb-2">
                  Request Complete!
                </h3>
                <p className="text-sm text-emerald-600 font-medium">
                  Your service request has been completed. Thank you!
                </p>
              </div>
            )}
          </div>
        </div>
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
      className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${
        styles[priority as keyof typeof styles]
      } ring-1`}
    >
      {priority.toUpperCase()}
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
      {status.replace("_", " ").toUpperCase()}
    </span>
  );
}
