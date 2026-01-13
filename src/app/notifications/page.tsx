"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase";

type Notification = {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setError("Please sign in to view notifications.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/notifications?limit=50", {
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load notifications");
      }

      const data = await res.json();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    try {
      const supabase = supabaseBrowser();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ markAllRead: true }),
      });
      loadNotifications();
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <button
          onClick={markAllRead}
          disabled={!notifications.some((n) => !n.read)}
          className="text-sm font-medium text-yellow-700 hover:text-yellow-900 disabled:text-gray-400"
        >
          Mark all as read
        </button>
      </div>

      {loading && <div className="text-sm text-gray-600">Loading notifications…</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!loading && !error && (
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
              You have no notifications yet.
            </div>
          ) : (
            notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-xl border p-4 ${
                  notification.read ? "border-gray-200 bg-white" : "border-yellow-200 bg-yellow-50"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-semibold text-gray-900">{notification.title}</h2>
                  <span className="text-xs text-gray-500 shrink-0">{timeAgo(notification.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-gray-700">{notification.message}</p>
                {notification.link && (
                  <Link
                    href={notification.link}
                    className="mt-2 inline-flex text-sm font-medium text-yellow-700 hover:text-yellow-900"
                  >
                    View details →
                  </Link>
                )}
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function timeAgo(dateStr: string) {
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
