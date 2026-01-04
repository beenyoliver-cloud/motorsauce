// src/app/messages/[conversationId]/page.tsx
"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Package, User as UserIcon } from "lucide-react";
import { fetchMessages, sendMessage, type Message, fetchThreads } from "@/lib/messagesClient";
import { displayName } from "@/lib/names";
import { getCurrentUserSync } from "@/lib/auth";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();
  const currentUser = getCurrentUserSync();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationInfo, setConversationInfo] = useState<{
    peer?: { id: string; name?: string; avatar?: string | null };
    listing?: { id: string; title?: string | null; image?: string | null; price?: number | null };
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversation();
    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadConversation() {
    try {
      const threads = await fetchThreads();
      const thread = threads.find((t) => t.id === conversationId);
      if (thread) {
        setConversationInfo({
          peer: thread.peer || undefined,
          listing: thread.listing || undefined,
        });
      }
    } catch (err) {
      console.error("[Conversation] Failed to load conversation info:", err);
    }
  }

  async function loadMessages() {
    try {
      setLoading(true);
      setError(null);
      const msgs = await fetchMessages(conversationId);
      setMessages(msgs);
    } catch (err) {
      console.error("[Conversation] Failed to load messages:", err);
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    
    const text = messageText.trim();
    if (!text || sending) return;

    try {
      setSending(true);
      await sendMessage(conversationId, text);
      setMessageText("");
      await loadMessages(); // Reload to get the new message
    } catch (err) {
      console.error("[Conversation] Failed to send message:", err);
      alert(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function formatMessageTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / 3600000;

    if (diffHours < 24) {
      return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
    
    return date.toLocaleDateString("en-GB", { 
      day: "numeric", 
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
          <span className="text-gray-600">Loading conversation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <p className="text-red-600 font-medium mb-4">{error}</p>
              <button
                onClick={() => router.push("/messages")}
                className="px-4 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition"
              >
                Back to Messages
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/messages")}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {conversationInfo?.peer?.avatar ? (
              <img
                src={conversationInfo.peer.avatar}
                alt={conversationInfo.peer.name || "User"}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-gray-500" />
              </div>
            )}

            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">
                {conversationInfo?.peer?.name || "User"}
              </h2>
              {conversationInfo?.listing && (
                <Link
                  href={`/listing/${conversationInfo.listing.id}`}
                  className="text-sm text-gray-600 hover:text-yellow-600 flex items-center gap-1"
                >
                  <Package className="w-3 h-3" />
                  {conversationInfo.listing.title}
                </Link>
              )}
            </div>

            {conversationInfo?.listing?.image && (
              <Link href={`/listing/${conversationInfo.listing.id}`}>
                <img
                  src={conversationInfo.listing.image}
                  alt=""
                  className="w-12 h-12 rounded object-cover"
                />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.from.id === currentUser?.id;
                const isSystem = message.type === "system";

                if (isSystem) {
                  return (
                    <div key={message.id} className="flex justify-center">
                      <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {message.text}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? "bg-yellow-500 text-black"
                          : "bg-white border border-gray-200 text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? "text-black/70" : "text-gray-500"
                        }`}
                      >
                        {formatMessageTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!messageText.trim() || sending}
              className="px-6 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
