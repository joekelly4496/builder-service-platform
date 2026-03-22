"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SmsMessage {
  id: string;
  direction: string;
  fromNumber: string;
  toNumber: string;
  body: string;
  status: string;
  serviceRequestId: string | null;
  createdAt: string;
}

interface Subscription {
  isSubPro: boolean;
  smsEnabled: boolean;
  twilioPhoneNumber: string | null;
  priceCents: number;
}

export default function SubSmsPage() {
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [toNumber, setToNumber] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [serviceRequestId, setServiceRequestId] = useState("");
  const [sending, setSending] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/sub/login";
        return;
      }
      setAccessToken(session.access_token);
      await fetchAll(session.access_token);
    };
    load();
  }, []);

  const fetchAll = async (token: string) => {
    try {
      const [subRes, smsRes] = await Promise.all([
        fetch("/api/sub/subscription", { headers: { authorization: `Bearer ${token}` } }),
        fetch("/api/sub/sms", { headers: { authorization: `Bearer ${token}` } }),
      ]);
      const subData = await subRes.json();
      const smsData = await smsRes.json();

      if (subData.success) setSubscription(subData.subscription);
      if (smsData.success) setMessages(smsData.messages);
    } catch {
      setError("Failed to load data");
    }
    setLoading(false);
  };

  const activateSubPro = async () => {
    setActivating(true);
    setError("");
    try {
      const res = await fetch("/api/sub/subscription", {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Sub Pro activated! Your business number is ready.");
        await fetchAll(accessToken);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to activate Sub Pro");
    }
    setActivating(false);
  };

  const sendMessage = async () => {
    if (!toNumber || !messageBody) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/sub/sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          toNumber,
          message: messageBody,
          serviceRequestId: serviceRequestId || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessageBody("");
        setSuccessMsg("Message sent!");
        setTimeout(() => setSuccessMsg(""), 3000);
        // Refresh messages
        const smsRes = await fetch("/api/sub/sms", {
          headers: { authorization: `Bearer ${accessToken}` },
        });
        const smsData = await smsRes.json();
        if (smsData.success) setMessages(smsData.messages);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to send message");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center">
        <p className="text-slate-600 font-semibold">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">SMS Business Number</h1>
              <p className="text-purple-200 font-medium mt-1">
                {subscription?.twilioPhoneNumber
                  ? `Your number: ${subscription.twilioPhoneNumber}`
                  : "Send and receive texts with your clients"}
              </p>
            </div>
            <Link
              href="/sub/dashboard"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-semibold text-sm transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium text-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium text-sm">
            {successMsg}
          </div>
        )}

        {/* Not Sub Pro — show activation */}
        {!subscription?.isSubPro && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 text-center">
            <div className="text-5xl mb-4">📱</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Get Your Business SMS Number
            </h2>
            <p className="text-slate-600 font-medium mb-2 max-w-lg mx-auto">
              Sub Pro gives you a dedicated local phone number for texting homeowners
              and builders. All messages are linked to your job records.
            </p>
            <p className="text-3xl font-bold text-purple-600 mb-6">
              $29<span className="text-lg text-slate-500 font-medium">/month</span>
            </p>
            <ul className="text-left max-w-sm mx-auto space-y-2 mb-6">
              <li className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className="text-emerald-500">✓</span> Dedicated local phone number
              </li>
              <li className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className="text-emerald-500">✓</span> Send & receive SMS linked to jobs
              </li>
              <li className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className="text-emerald-500">✓</span> Automated review collection
              </li>
              <li className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className="text-emerald-500">✓</span> $0.03/outbound message
              </li>
            </ul>
            <button
              onClick={activateSubPro}
              disabled={activating}
              className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold text-base hover:bg-purple-700 disabled:bg-slate-300 transition-all shadow-lg shadow-purple-200"
            >
              {activating ? "Activating..." : "Activate Sub Pro"}
            </button>
          </div>
        )}

        {/* Sub Pro active — show SMS UI */}
        {subscription?.isSubPro && (
          <>
            {/* Send Message */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Send Message</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    To Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={toNumber}
                    onChange={(e) => setToNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Link to Job (optional)
                  </label>
                  <input
                    type="text"
                    value={serviceRequestId}
                    onChange={(e) => setServiceRequestId(e.target.value)}
                    placeholder="Service request ID"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
                  />
                </div>
              </div>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Type your message..."
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium resize-none mb-3"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">
                  {messageBody.length}/160 characters
                  {messageBody.length > 160 ? ` (${Math.ceil(messageBody.length / 160)} segments)` : ""}
                </p>
                <button
                  onClick={sendMessage}
                  disabled={sending || !toNumber || !messageBody}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:bg-slate-300 transition-all"
                >
                  {sending ? "Sending..." : "Send SMS"}
                </button>
              </div>
            </div>

            {/* Message History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Message History ({messages.length})
              </h2>
              {messages.length === 0 ? (
                <p className="text-slate-500 font-medium text-sm text-center py-8">
                  No messages yet. Send your first SMS above!
                </p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-xl ${
                        msg.direction === "outbound"
                          ? "bg-purple-50 border-l-4 border-purple-500"
                          : "bg-slate-50 border-l-4 border-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              msg.direction === "outbound"
                                ? "bg-purple-200 text-purple-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {msg.direction === "outbound" ? "SENT" : "RECEIVED"}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {msg.direction === "outbound"
                              ? `To: ${msg.toNumber}`
                              : `From: ${msg.fromNumber}`}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 font-medium">{msg.body}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {msg.serviceRequestId && (
                          <span className="text-xs text-purple-600 font-semibold">
                            Job: {msg.serviceRequestId.slice(0, 8)}...
                          </span>
                        )}
                        <span
                          className={`text-xs font-medium ${
                            msg.status === "sent" || msg.status === "received"
                              ? "text-emerald-600"
                              : "text-red-500"
                          }`}
                        >
                          {msg.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
