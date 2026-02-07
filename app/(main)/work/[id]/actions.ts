"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleBookmark(workId: string): Promise<{ success: boolean; isBookmarked: boolean }> {
  const supabase = await createClient();

  // Get authenticated user server-side (NOT from client props)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, isBookmarked: false };
  }

  // Check current bookmark status
  const { data: existingBookmark } = await supabase
    .from("bookmarks")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("work_id", workId)
    .maybeSingle();

  if (existingBookmark) {
    // Remove bookmark - RLS ensures auth.uid() = user_id
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("work_id", workId);

    if (error) {
      console.error("Remove bookmark error:", error);
      return { success: false, isBookmarked: true };
    }

    revalidatePath(`/work/${workId}`);
    return { success: true, isBookmarked: false };
  } else {
    // Add bookmark - RLS ensures auth.uid() = user_id
    const { error } = await supabase
      .from("bookmarks")
      .insert({ user_id: user.id, work_id: workId });

    if (error) {
      console.error("Add bookmark error:", error);
      return { success: false, isBookmarked: false };
    }

    // Notify work author (skip self-notifications)
    const { data: work } = await supabase
      .from("works")
      .select("author_id")
      .eq("id", workId)
      .single();

    if (work && work.author_id !== user.id) {
      await supabase.from("notifications").insert({
        recipient_id: work.author_id,
        actor_id: user.id,
        work_id: workId,
        type: "bookmark",
      });
    }

    revalidatePath(`/work/${workId}`);
    return { success: true, isBookmarked: true };
  }
}
