"use client";

import { useState } from "react";

export default function SubActions({
  requestId,
  currentStatus,
  accessToken,
}: {
  requestId: string;
  currentStatus: string;
  accessToken?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const handleAcknowledge = async () => {
    if (!confirm("Acknowledge this request? This confirms you've seen it and will respond.")) return;

    setLoading(true);
    try {
      const ackHeaders: Record<string, string> = {};
      if (accessToken) ackHeaders["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/requests/${requestId}/acknowledge`, {
        method: "POST",
        headers: ackHeaders,
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Request acknowledged!");
        window.location.reload();
      } else {
        alert("❌ " + (data.error || "Failed"));
      }
    } catch (err) {
      alert("❌ Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) {
      alert("Please select both a date and time window");
      return;
    }

    setLoading(true);
    try {
      // Set scheduledFor to the start of the selected window
      const startHours = selectedTime === "morning" ? 8 : selectedTime === "afternoon" ? 12 : 8;
      const scheduledFor = new Date(selectedDate);
      scheduledFor.setHours(startHours, 0, 0, 0);

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/requests/${requestId}/schedule`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          scheduledFor: scheduledFor.toISOString(),
          timeWindow: selectedTime,
          notes: notes || undefined
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Appointment scheduled! The homeowner has been notified.");
        window.location.reload();
      } else {
        alert("❌ " + (data.error || "Failed"));
      }
    } catch (err: any) {
      console.error("Schedule error:", err);
      alert("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("completionNotes", completionNotes);
      
      photos.forEach((photo) => {
        formData.append("photos", photo);
      });

      const completeHeaders: Record<string, string> = {};
      if (accessToken) completeHeaders["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/requests/${requestId}/complete`, {
        method: "POST",
        headers: completeHeaders,
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Request marked as complete! ${data.photoCount} photos uploaded.`);
        window.location.reload();
      } else {
        alert("❌ " + (data.error || "Failed"));
      }
    } catch (err) {
      alert("❌ Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setPhotos(fileArray);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isSameDay = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false;
    return date1.toDateString() === date2.toDateString();
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    return isSameDay(date, new Date());
  };

  const isPastDate = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const timeWindows = [
    { value: "morning", label: "Morning", range: "8 AM – 12 PM" },
    { value: "afternoon", label: "Afternoon", range: "12 PM – 4 PM" },
    { value: "allday", label: "All Day", range: "8 AM – 4 PM" },
  ];

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Actions</h3>

      <div className="space-y-3">
        {currentStatus === "submitted" && (
          <button
            onClick={handleAcknowledge}
            disabled={loading}
            className="w-full px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 font-bold text-lg disabled:bg-slate-400 shadow-sm"
          >
            {loading ? "Processing..." : "✓ Acknowledge Request"}
          </button>
        )}

        {["submitted", "acknowledged"].includes(currentStatus) && (
          <>
            {!showSchedule ? (
              <button
                onClick={() => setShowSchedule(true)}
                className="w-full px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 font-bold text-lg shadow-sm"
              >
                📅 Schedule Appointment
              </button>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                    <button onClick={previousMonth} className="p-1 hover:bg-slate-200 rounded transition">
                      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h4 className="font-bold text-slate-900">
                      {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </h4>
                    <button onClick={nextMonth} className="p-1 hover:bg-slate-200 rounded transition">
                      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                    {weekDays.map((day, i) => (
                      <div key={i} className="text-center py-2 text-xs font-semibold text-slate-500">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 bg-white">
                    {days.map((day, i) => {
                      const isSelected = isSameDay(day, selectedDate);
                      const isTodayDate = isToday(day);
                      const isPast = isPastDate(day);

                      return (
                        <button
                          key={i}
                          onClick={() => day && !isPast && setSelectedDate(day)}
                          disabled={!day || isPast}
                          className={`
                            aspect-square p-2 text-sm font-medium border-r border-b border-slate-100
                            ${!day ? "bg-slate-50 cursor-default" : ""}
                            ${isPast && day ? "text-slate-300 cursor-not-allowed" : ""}
                            ${!isPast && day && !isSelected ? "hover:bg-slate-50 text-slate-900" : ""}
                            ${isSelected ? "bg-indigo-600 text-white font-bold" : ""}
                            ${isTodayDate && !isSelected ? "text-indigo-600 font-bold" : ""}
                          `}
                        >
                          {day?.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedDate && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Select Time Window</label>
                    <div className="space-y-2">
                      {timeWindows.map((window) => {
                        const isSelected = selectedTime === window.value;
                        return (
                          <button
                            key={window.value}
                            onClick={() => setSelectedTime(window.value)}
                            className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition flex items-center justify-between ${isSelected ? "bg-indigo-600 text-white" : "bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200"}`}
                          >
                            <span>{window.label}</span>
                            <span className={`text-xs font-medium ${isSelected ? "text-indigo-200" : "text-slate-500"}`}>{window.range}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedDate && selectedTime && (
                  <div className="p-4 bg-indigo-50 rounded-xl border-2 border-indigo-200">
                    <p className="text-xs font-bold text-indigo-900 uppercase mb-1">Selected:</p>
                    <p className="text-base font-bold text-indigo-700">
                      {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-base font-bold text-indigo-700">
                      {timeWindows.find((w) => w.value === selectedTime)?.label} ({timeWindows.find((w) => w.value === selectedTime)?.range})
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Special instructions..."
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowSchedule(false);
                      setSelectedDate(null);
                      setSelectedTime("");
                      setNotes("");
                    }}
                    className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSchedule}
                    disabled={loading || !selectedDate || !selectedTime}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-400 transition-all"
                  >
                    {loading ? "Scheduling..." : "Schedule"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {["scheduled", "in_progress"].includes(currentStatus) && (
          <>
            {!showComplete ? (
              <button
                onClick={() => setShowComplete(true)}
                className="w-full px-6 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-200 font-bold text-lg shadow-sm"
              >
                ✓ Mark as Complete
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Completion Notes</label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    rows={3}
                    placeholder="Describe what was done..."
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">📸 Upload Photos (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                  {photos.length > 0 && (
                    <p className="text-sm text-emerald-600 font-semibold mt-2">
                      {photos.length} photo{photos.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowComplete(false);
                      setCompletionNotes("");
                      setPhotos([]);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:bg-slate-400 transition-all"
                  >
                    {loading ? "Completing..." : "Complete Job"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {currentStatus === "completed" && (
          <div className="text-center py-6 bg-emerald-50 rounded-xl border-2 border-emerald-200">
            <p className="text-emerald-700 font-bold text-xl">✓ Request Completed</p>
            <p className="text-sm text-emerald-600 font-medium mt-2">
              Great work! This request is complete.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}