// src/app/messages/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Package, User as UserIcon, Clock } from "lucide-react";
import { fetchThreads, type Thread } from "@/lib/messagesClient";
import { displayName } from "@/lib/names";
import { useRouter } from "next/navigation";

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setLoading(true);
      setError(null);
      const threads = await fetchThreads();
      setConversations(threads);
    } catch (err) {
      console.error("[Messages] Failed to load conversations:", err);
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  function formatTimestamp(timestamp: string | null | undefined) {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              <span className="ml-3 text-gray-600">Loading conversations...</span>
            </div>
          </div>
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
                onClick={loadConversations}
                className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 transition"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">
            {conversations.length === 0 
              ? "No conversations yet" 
              : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <MessageSquare className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-600 mb-6">
                Start a conversation by contacting a seller or making an offer on a listing.
              </p>
              <Link
                href="/search"
                className="inline-block px-6 py-3 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 transition"
              >
                Browse Listings
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className={`block p-4 hover:bg-gray-50 transition-colors ${
                  !conversation.isRead ? "bg-yellow-50" : ""
                }`}
              >
                <div className="flex gap-4">
                  {/* Avatar/Icon */}
                  <div className="flex-shrink-0">
                    {conversation.peer?.avatar ? (
                      <img
                        src={conversation.peer.avatar}
                        alt={conversation.peer.name || "User"}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conversation.peer?.name || "User"}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatTimestamp(conversation.lastMessageAt)}
                      </span>
                    </div>

                    {/* Listing Info */}
                    {conversation.listing && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Package className="w-4 h-4" />
                        <span className="truncate">{conversation.listing.title}</span>
                      </div>
                    )}

                    {/* Last Message Preview */}
                    {conversation.lastMessage && (
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage}
                      </p>
                    )}

                    {/* Unread Indicator */}
                    {!conversation.isRead && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded">
                          New
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Listing Image */}
                  {conversation.listing?.image && (
                    <div className="flex-shrink-0">
                      <img
                        src={conversation.listing.image}
                        alt=""
                        className="w-16 h-16 rounded object-cover"
                      />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
