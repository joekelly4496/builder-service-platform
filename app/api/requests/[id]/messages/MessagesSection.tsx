"use client";

import { useState, useEffect } from "react";

interface Message {
  id: string;
  senderType: string;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: string;
}

export default function MessagesSection({ requestId }: { requestId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
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
  }, [requestId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderType: "builder",
          senderName: "Builder Team",
          senderEmail: "builder@demo.com",
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-4">💬 Messages</h3>

      {/* Messages List */}
      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
        {loading && messages.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No messages yet. Start the conversation!</p>
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
                  <p className="font-bold text-slate-900">{msg.senderName}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {msg.senderType} • {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-slate-800 font-medium">{msg.message}</p>
            </div>
          ))
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-slate-200 pt-4">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          rows={3}
          className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
        />
        <button
          onClick={handleSendMessage}
          disabled={sending || !newMessage.trim()}
          className="mt-3 w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold disabled:bg-slate-400"
        >
          {sending ? "Sending..." : "Send Message"}
        </button>
      </div>
    </div>
  );
}
