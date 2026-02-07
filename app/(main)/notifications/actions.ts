"use server";

import { createClient } from "@/lib/supabase/server";

export type Notification = {
  id: string;
  type: "like" | "bookmark";
  read: boolean;
  created_at: string;
  work_id: string;
  work_title: string;
  actor_username: string;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
};

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      id,
      type,
      read,
      created_at,
      work_id,
      work:works!notifications_work_id_fkey(title),
      actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)
    `
    )
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return (data ?? []).map((n: Record<string, unknown>) => {
    const work = n.work as { title: string } | null;
    const actor = n.actor as {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;

    return {
      id: n.id as string,
      type: n.type as "like" | "bookmark",
      read: n.read as boolean,
      created_at: n.created_at as string,
      work_id: n.work_id as string,
      work_title: work?.title ?? "Untitled",
      actor_username: actor?.username ?? "unknown",
      actor_display_name: actor?.display_name ?? null,
      actor_avatar_url: actor?.avatar_url ?? null,
    };
  });
}

export async function markNotificationsRead(): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", user.id)
    .eq("read", false);

  if (error) {
    console.error("Error marking notifications read:", error);
    return { success: false };
  }

  return { success: true };
}
