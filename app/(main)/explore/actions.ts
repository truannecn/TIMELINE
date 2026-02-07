"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleFollow(targetUserId: string): Promise<{ success: boolean; isFollowing: boolean }> {
  const supabase = await createClient();

  // SECURITY: Always verify authentication server-side
  // Get authenticated user from server session (NOT from client props)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // SECURITY: Block unauthenticated requests
  if (authError || !user) {
    console.error("Unauthorized follow attempt:", authError);
    return { success: false, isFollowing: false };
  }

  // Prevent self-follow
  if (user.id === targetUserId) {
    return { success: false, isFollowing: false };
  }

  // Check current follow status
  const { data: existingFollow } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existingFollow) {
    // Unfollow - RLS ensures auth.uid() = follower_id
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);

    if (error) {
      console.error("Unfollow error:", error);
      return { success: false, isFollowing: true };
    }

    revalidatePath("/explore");
    return { success: true, isFollowing: false };
  } else {
    // Follow - RLS ensures auth.uid() = follower_id
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: targetUserId });

    if (error) {
      console.error("Follow error:", error);
      return { success: false, isFollowing: false };
    }

    revalidatePath("/explore");
    return { success: true, isFollowing: true };
  }
}

export async function toggleLike(workId: string): Promise<{ success: boolean; isLiked: boolean; likeCount: number }> {
  const supabase = await createClient();

  // SECURITY: Always verify authentication server-side
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // SECURITY: Block unauthenticated requests
  if (authError || !user) {
    console.error("Unauthorized like attempt:", authError);
    return { success: false, isLiked: false, likeCount: 0 };
  }

  // Check current like status
  const { data: existingLike } = await supabase
    .from("likes")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("work_id", workId)
    .maybeSingle();

  if (existingLike) {
    // Unlike - RLS ensures auth.uid() = user_id
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("work_id", workId);

    if (error) {
      console.error("Unlike error:", error);
      return { success: false, isLiked: true, likeCount: 0 };
    }

    // Get updated like count
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("work_id", workId);

    revalidatePath("/explore");
    return { success: true, isLiked: false, likeCount: count || 0 };
  } else {
    // Like - RLS ensures auth.uid() = user_id
    const { error } = await supabase
      .from("likes")
      .insert({ user_id: user.id, work_id: workId });

    if (error) {
      console.error("Like error:", error);
      return { success: false, isLiked: false, likeCount: 0 };
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
        type: "like",
      });
    }

    // Get updated like count
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("work_id", workId);

    revalidatePath("/explore");
    return { success: true, isLiked: true, likeCount: count || 0 };
  }
}
