"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Thread } from "@/lib/api/types";

/**
 * Toggle thread follow status for the current user
 */
export async function toggleFollowThread(threadId: string): Promise<{ success: boolean; isFollowing: boolean }> {
  const supabase = await createClient();

  // SECURITY: Always verify authentication server-side
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // SECURITY: Block unauthenticated requests
  if (authError || !user) {
    console.error("Unauthorized thread follow attempt:", authError);
    return { success: false, isFollowing: false };
  }

  // Check current follow status
  const { data: existingFollow } = await supabase
    .from("user_threads")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("thread_id", threadId)
    .maybeSingle();

  if (existingFollow) {
    // Unfollow - RLS ensures auth.uid() = user_id
    const { error } = await supabase
      .from("user_threads")
      .delete()
      .eq("user_id", user.id)
      .eq("thread_id", threadId);

    if (error) {
      console.error("Unfollow thread error:", error);
      return { success: false, isFollowing: true };
    }

    revalidatePath("/explore");
    return { success: true, isFollowing: false };
  } else {
    // Follow - RLS ensures auth.uid() = user_id
    const { error } = await supabase
      .from("user_threads")
      .insert({ user_id: user.id, thread_id: threadId });

    if (error) {
      console.error("Follow thread error:", error);
      return { success: false, isFollowing: false };
    }

    revalidatePath("/explore");
    return { success: true, isFollowing: true };
  }
}

/**
 * Create a new thread (community)
 */
export async function createThread(data: {
  name: string;
  description?: string;
}): Promise<{ success: boolean; thread?: Thread; error?: string }> {
  const supabase = await createClient();

  // SECURITY: Always verify authentication server-side
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Authentication required" };
  }

  // Validate input
  const name = data.name.trim();
  if (!name || name.length < 2) {
    return { success: false, error: "Thread name must be at least 2 characters" };
  }

  if (name.length > 50) {
    return { success: false, error: "Thread name must be less than 50 characters" };
  }

  // Check if thread with this name already exists (case-insensitive)
  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "A thread with this name already exists" };
  }

  // Create thread - RLS ensures created_by = auth.uid()
  const { data: thread, error } = await supabase
    .from("threads")
    .insert({
      name,
      description: data.description?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Create thread error:", error);
    return { success: false, error: "Failed to create thread" };
  }

  // Auto-follow the thread the user just created
  await supabase.from("user_threads").insert({
    user_id: user.id,
    thread_id: thread.id,
  });

  revalidatePath("/explore");
  return { success: true, thread };
}

/**
 * Get all threads with follow status for current user
 */
export async function getThreadsWithFollowStatus(): Promise<Thread[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: threads, error } = await supabase
    .from("threads")
    .select("*")
    .order("created_by", { ascending: true, nullsFirst: true }) // Default interests first
    .order("name", { ascending: true });

  if (error) {
    console.error("Get threads error:", error);
    return [];
  }

  return threads || [];
}

/**
 * Get threads that the current user follows
 */
export async function getFollowedThreads(): Promise<Thread[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("user_threads")
    .select("thread:threads(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get followed threads error:", error);
    return [];
  }

  return data?.map((item: any) => item.thread).filter(Boolean) || [];
}
