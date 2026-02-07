"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createThread(name: string, description?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if thread name already exists
  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "A thread with this name already exists" };
  }

  // Create the thread
  const { data: thread, error } = await supabase
    .from("threads")
    .insert({
      name,
      description: description || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !thread) {
    console.error("Error creating thread:", error);
    return { success: false, error: "Failed to create thread" };
  }

  revalidatePath("/explore");

  return { success: true, threadId: thread.id };
}
