"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleThreadFollow(
  threadId: string
): Promise<{ success: boolean; isFollowing: boolean }>
 {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Unauthorized thread follow attempt:", authError);
    return { success: false, isFollowing: false };
  }

  const { data: existingFollow } = await supabase
    .from("user_threads")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("thread_id", threadId)
    .maybeSingle();

  if (existingFollow) {
    const { error } = await supabase
      .from("user_threads")
      .delete()
      .eq("user_id", user.id)
      .eq("thread_id", threadId);

    if (error) {
      console.error("Unfollow thread error:", error);
      return { success: false, isFollowing: true };
    }

    revalidatePath(`/threads/${threadId}`);
    return { success: true, isFollowing: false };
  }

  const { error } = await supabase
    .from("user_threads")
    .insert({ user_id: user.id, thread_id: threadId });

  if (error) {
    console.error("Follow thread error:", error);
    return { success: false, isFollowing: false };
  }

  revalidatePath(`/threads/${threadId}`);
  return { success: true, isFollowing: true };
}
