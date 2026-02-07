"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { markNotificationsRead } from "@/app/(main)/notifications/actions";
import type { Notification } from "@/app/(main)/notifications/actions";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [localUnread, setLocalUnread] = useState(unreadCount);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalUnread(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);

    if (willOpen && localUnread > 0) {
      setLocalUnread(0);
      await markNotificationsRead();
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative rounded-full border border-black/40 bg-[#e6e6e6] p-2 shadow-sm hover:bg-[#dcdcdc] transition-colors"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {localUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {localUnread > 9 ? "9+" : localUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-black/20 bg-white shadow-lg z-50 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-black/50">
              No notifications yet
            </div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/work/${n.work_id}`}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 hover:bg-black/5 transition-colors border-b border-black/10 last:border-b-0 ${
                      !n.read ? "bg-purple-50" : ""
                    }`}
                  >
                    <p className="text-sm">
                      <span className="font-medium">
                        {n.actor_display_name || n.actor_username}
                      </span>{" "}
                      {n.type === "like" ? "liked" : "bookmarked"} your{" "}
                      <span className="font-medium">{n.work_title}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-black/50">
                      {timeAgo(n.created_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
