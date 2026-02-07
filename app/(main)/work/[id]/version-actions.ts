"use server";

import { createClient } from "@/lib/supabase/server";
import { WorkVersion } from "@/lib/api/types";
import { revalidatePath } from "next/cache";

export async function getWorkVersions(workId: string): Promise<{
  success: boolean;
  versions?: WorkVersion[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data: versions, error } = await supabase
    .from("work_versions")
    .select("*")
    .eq("work_id", workId)
    .order("version_number", { ascending: true });

  if (error) {
    console.error("Failed to fetch versions:", error);
    return { success: false, error: "Failed to load versions" };
  }

  return { success: true, versions: versions || [] };
}

export async function createWorkVersion(data: {
  work_id: string;
  version_number: number;
  title: string;
  notes: string | null;
  image_path?: string;
  image_url?: string;
  width?: number;
  height?: number;
  content?: string;
}): Promise<{
  success: boolean;
  version?: WorkVersion;
  error?: string;
}> {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Verify ownership
  const { data: work } = await supabase
    .from("works")
    .select("author_id")
    .eq("id", data.work_id)
    .single();

  if (!work || work.author_id !== user.id) {
    return { success: false, error: "You can only add versions to your own works" };
  }

  // Insert version
  const { data: version, error } = await supabase
    .from("work_versions")
    .insert({
      work_id: data.work_id,
      version_number: data.version_number,
      title: data.title,
      notes: data.notes,
      image_path: data.image_path || null,
      image_url: data.image_url || null,
      width: data.width || null,
      height: data.height || null,
      content: data.content || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create version:", error);
    return { success: false, error: "Failed to save version" };
  }

  // Revalidate the work page
  revalidatePath(`/work/${data.work_id}`);

  return { success: true, version };
}

export async function deleteVersion(versionId: string): Promise<{
  success: boolean;
  image_path?: string | null;
  error?: string;
}> {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Get version with work ownership check
  const { data: version, error: fetchError } = await supabase
    .from("work_versions")
    .select("id, work_id, image_path, works!inner(author_id)")
    .eq("id", versionId)
    .single();

  if (fetchError || !version) {
    return { success: false, error: "Version not found" };
  }

  // Verify ownership via the joined works table
  const work = version.works as unknown as { author_id: string };
  if (work.author_id !== user.id) {
    return { success: false, error: "You can only delete your own versions" };
  }

  const workId = version.work_id;
  const imagePath = version.image_path;

  // Delete version
  const { error: deleteError } = await supabase
    .from("work_versions")
    .delete()
    .eq("id", versionId);

  if (deleteError) {
    console.error("Failed to delete version:", deleteError);
    return { success: false, error: "Failed to delete version" };
  }

  // Revalidate the work page
  revalidatePath(`/work/${workId}`);

  return { success: true, image_path: imagePath };
}
