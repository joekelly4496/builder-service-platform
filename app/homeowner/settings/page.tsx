"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = createSupabaseBrowserClient();

interface Preferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  phoneNumber: string | null;
  maintenanceEmail: boolean;
  maintenanceSms: boolean;
  maintenanceInApp: boolean;
  requestUpdatesEmail: boolean;
  requestUpdatesSms: boolean;
  requestUpdatesInApp: boolean;
  messagesEmail: boolean;
  messagesSms: boolean;
  messagesInApp: boolean;
}

const defaultPrefs: Preferences = {
  emailEnabled: true,
  smsEnabled: false,
  inAppEnabled: true,
  phoneNumber: null,
  maintenanceEmail: true,
  maintenanceSms: false,
  maintenanceInApp: true,
  requestUpdatesEmail: true,
  requestUpdatesSms: false,
  requestUpdatesInApp: true,
  messagesEmail: true,
  messagesSms: false,
  messagesInApp: true,
};

export default function HomeownerSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [userId, setUserId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/homeowner/login";
      return;
    }
    setUserId(session.user.id);
    await fetchPreferences(session.user.id);
  };

  const fetchPreferences = async (uid: string) => {
    try {
      const res = await fetch(
        `/api/homeowner/notification-preferences?userId=${uid}`
      );
      const data = await res.json();
      if (data.success && data.preferences) {
        setPrefs({
          emailEnabled: data.preferences.emailEnabled ?? true,
          smsEnabled: data.preferences.smsEnabled ?? false,
          inAppEnabled: data.preferences.inAppEnabled ?? true,
          phoneNumber: data.preferences.phoneNumber ?? null,
          maintenanceEmail: data.preferences.maintenanceEmail ?? true,
          maintenanceSms: data.preferences.maintenanceSms ?? false,
          maintenanceInApp: data.preferences.maintenanceInApp ?? true,
          requestUpdatesEmail: data.preferences.requestUpdatesEmail ?? true,
          requestUpdatesSms: data.preferences.requestUpdatesSms ?? false,
          requestUpdatesInApp: data.preferences.requestUpdatesInApp ?? true,
          messagesEmail: data.preferences.messagesEmail ?? true,
          messagesSms: data.preferences.messagesSms ?? false,
          messagesInApp: data.preferences.messagesInApp ?? true,
        });
      }
    } catch (err) {
      console.error("Failed to fetch preferences:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/homeowner/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...prefs }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage("Settings saved successfully!");
      } else {
        setSaveMessage("Failed to save settings. Please try again.");
      }
    } catch (err) {
      setSaveMessage("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const Toggle = ({
    checked,
    onChange,
    disabled,
  }: {
    checked: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled
          ? "bg-slate-200 cursor-not-allowed"
          : checked
          ? "bg-blue-600"
          : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <p className="text-slate-600 font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Notification Settings
              </h1>
              <p className="text-sm font-medium text-slate-600 mt-0.5">
                Choose how and when you get notified
              </p>
            </div>
            <a
              href="/homeowner/dashboard"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              &larr; Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Global Channel Toggles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Notification Channels
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Email</p>
                <p className="text-sm text-slate-500">
                  Receive notifications via email
                </p>
              </div>
              <Toggle
                checked={prefs.emailEnabled}
                onChange={(val) =>
                  setPrefs((p) => ({ ...p, emailEnabled: val }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">In-App</p>
                <p className="text-sm text-slate-500">
                  See notifications in your dashboard
                </p>
              </div>
              <Toggle
                checked={prefs.inAppEnabled}
                onChange={(val) =>
                  setPrefs((p) => ({ ...p, inAppEnabled: val }))
                }
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">
                    SMS{" "}
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ml-1">
                      Premium
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">
                    Receive text message alerts
                  </p>
                </div>
                <Toggle
                  checked={prefs.smsEnabled}
                  onChange={(val) =>
                    setPrefs((p) => ({ ...p, smsEnabled: val }))
                  }
                />
              </div>
              {prefs.smsEnabled && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={prefs.phoneNumber ?? ""}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, phoneNumber: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    SMS notifications require your builder to have SMS enabled
                    for your home. Standard message rates may apply.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Per-Event Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Event Preferences
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Choose which channels to use for each type of notification
          </p>

          {/* Table header */}
          <div className="grid grid-cols-4 gap-4 mb-3 px-1">
            <div />
            <p className="text-xs font-bold text-slate-500 text-center">
              Email
            </p>
            <p className="text-xs font-bold text-slate-500 text-center">
              In-App
            </p>
            <p className="text-xs font-bold text-slate-500 text-center">SMS</p>
          </div>

          <div className="space-y-1">
            {/* Maintenance Reminders */}
            <div className="grid grid-cols-4 gap-4 items-center py-3 px-1 rounded-xl hover:bg-slate-50">
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  Maintenance Reminders
                </p>
                <p className="text-xs text-slate-400">
                  When maintenance tasks are due
                </p>
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={prefs.maintenanceEmail}
                  onChange={(val) =>
                    setPrefs((p) => ({ ...p, maintenanceEmail: val }))
                  }
                  disabled={!prefs.emailEnabled}
                />
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={prefs.maintenanceInApp}
                  onChange={(val) =>
                    setPrefs((p) => ({ ...p, maintenanceInApp: val }))
                  }
                  disabled={!prefs.inAppEnabled}
                />
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={prefs.maintenanceSms}
                  onChange={(val) =>
                    setPrefs((p) => ({ ...p, maintenanceSms: val }))
                  }
                  disabled={!prefs.smsEnabled}
                />
              </div>
            </div>

            {/* Request Updates */}
            <div className="grid grid-cols-4 gap-4 items-center py-3 px-1 rounded-xl hover:bg-slate-50">
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  Request Updates
                </p>
                <p className="text-xs text-slate-400">
                  Status changes on your service requests
                </p>
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={prefs.requestUpdatesEmail}
                  onChange={(val) =>
                    setPrefs((p) => ({ ...p, requestUpdatesEmail: val }))
                  }
                  disabled={!prefs.emailEnabled}
                />
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={prefs.requestUpdatesInApp}
                  onChange={(val) =>
                    setPrefs((p) => ({ ...p, requestUpdatesInApp: val }))
                  }
                  disabled={!prefs.inAppEnabled}
                />
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={prefs.requestUpdatesSms}
                  onChange={(val) =>
                    setPrefs((p) => ({ ...p, requestUpdatesSms: val }))
                  }
                  disabled={!prefs.smsEnabled}
                />
              </div>
            </div>

            {/* Messages */}
            <div className="grid grid-cols-4 gap-4 items-center py-3 px-1 rounded-xl hover:bg-slate-50">
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  New Messages
                </p>
                <p className="text-xs text-slate-400">
                  When someone messages you about a request
                </p>
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={prefs.messagesEmail}
                  onChange={(val) =>
                    setPrefs((p) => ({ ...p, messagesEmail: val }))
                  }
                  disabled={!prefs.emailEnabled}
                />
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={prefs.messagesInApp}
                  onChange={(val) =>
                    setPrefs((p) => ({ ...p, messagesInApp: val }))
                  }
                  disabled={!prefs.inAppEnabled}
                />
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={prefs.messagesSms}
                  onChange={(val) =>
                    setPrefs((p) => ({ ...p, messagesSms: val }))
                  }
                  disabled={!prefs.smsEnabled}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saveMessage && (
            <p
              className={`text-sm font-semibold ${
                saveMessage.includes("success")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {saveMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
