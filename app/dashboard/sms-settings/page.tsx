"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface SMSUsage {
  smsEnabled: boolean;
  twilioPhoneNumber: string | null;
  messagesSentThisMonth: number;
  homesOnSms: number;
  estimatedMonthlyCostCents: number;
  actualMessageCostCents: number;
}

export default function SMSSettingsPage() {
  const TEST_BUILDER_ID = "75c73c79-029b-44a0-a9e3-4d6366ac141d";
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [usage, setUsage] = useState<SMSUsage | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const res = await fetch(`/api/builder/sms/usage?builderId=${TEST_BUILDER_ID}`);
      const data = await res.json();
      if (data.success) {
        setUsage(data);
      }
    } catch (err) {
      console.error("Failed to fetch SMS usage:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableSMS = async () => {
    setEnabling(true);
    setMessage("");
    try {
      const res = await fetch("/api/builder/sms/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ builderId: TEST_BUILDER_ID }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.alreadyEnabled
          ? "SMS is already enabled for your account."
          : `SMS enabled! Your dedicated number is ${data.phoneNumber}`);
        await fetchUsage();
      } else {
        setMessage(`Failed to enable SMS: ${data.error}`);
      }
    } catch (err) {
      setMessage("Failed to enable SMS. Please try again.");
    } finally {
      setEnabling(false);
    }
  };

  const handleDisableSMS = async () => {
    setEnabling(true);
    setMessage("");
    try {
      const res = await fetch(`/api/builder/sms/enable?builderId=${TEST_BUILDER_ID}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMessage("SMS disabled. Your phone number is retained for reactivation.");
        await fetchUsage();
      } else {
        setMessage(`Failed to disable SMS: ${data.error}`);
      }
    } catch (err) {
      setMessage("Failed to disable SMS. Please try again.");
    } finally {
      setEnabling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <p className="text-slate-600 font-medium">Loading SMS settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">SMS Settings</h1>
              <p className="text-base font-medium text-slate-600 mt-1">Manage SMS notifications for your homeowners</p>
            </div>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold text-sm text-slate-700"
            >
              &larr; Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Enable/Disable SMS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">SMS Add-on</h2>
              <p className="text-sm font-medium text-slate-600 mt-1">
                Send text message notifications to homeowners for maintenance reminders, status updates, and messages.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                usage?.smsEnabled
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {usage?.smsEnabled ? "Active" : "Inactive"}
              </span>
              {usage?.smsEnabled ? (
                <button
                  onClick={handleDisableSMS}
                  disabled={enabling}
                  className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-300 rounded-xl hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  {enabling ? "..." : "Disable"}
                </button>
              ) : (
                <button
                  onClick={handleEnableSMS}
                  disabled={enabling}
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {enabling ? "Provisioning..." : "Enable SMS"}
                </button>
              )}
            </div>
          </div>
          {message && (
            <p className={`mt-4 text-sm font-semibold ${
              message.includes("Failed") ? "text-red-600" : "text-green-600"
            }`}>
              {message}
            </p>
          )}
        </div>

        {/* Dedicated Phone Number */}
        {usage?.smsEnabled && usage.twilioPhoneNumber && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Your Dedicated SMS Number</h2>
            <p className="text-3xl font-bold text-blue-600">{usage.twilioPhoneNumber}</p>
            <p className="text-sm text-slate-500 mt-2">
              All outbound SMS to your homeowners will be sent from this number.
            </p>
          </div>
        )}

        {/* Pricing Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Pricing</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-700 font-medium">Base plan (covers up to 3 homes)</span>
              <span className="font-bold text-slate-900">$10/month</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-700 font-medium">Each additional home</span>
              <span className="font-bold text-slate-900">$3/month</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-700 font-medium">Your estimated cost</span>
              <span className="font-bold text-blue-600 text-lg">
                ${((usage?.estimatedMonthlyCostCents ?? 0) / 100).toFixed(2)}/month
              </span>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        {usage?.smsEnabled && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">This Month&apos;s Usage</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 rounded-xl border border-blue-200/60">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Messages Sent</p>
                <p className="text-3xl font-bold text-blue-700">{usage.messagesSentThisMonth}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-5 rounded-xl border border-green-200/60">
                <p className="text-xs font-bold uppercase tracking-wider text-green-600 mb-1">Homes on SMS</p>
                <p className="text-3xl font-bold text-green-700">{usage.homesOnSms}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 rounded-xl border border-amber-200/60">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Message Costs</p>
                <p className="text-3xl font-bold text-amber-700">
                  ${(usage.actualMessageCostCents / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">How SMS Notifications Work</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">1</span>
              <p>Enable SMS to get a dedicated phone number for your company.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">2</span>
              <p>Homeowners opt in to SMS by adding their phone number in their notification settings.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">3</span>
              <p>SMS notifications are sent automatically for: maintenance reminders, service request status updates, new messages, and schedule confirmations.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">4</span>
              <p>All messages are sent from your dedicated number so homeowners always know who is contacting them.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
