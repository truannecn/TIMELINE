import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify work exists and user owns it
  const { data: work, error: workError } = await supabase
    .from("works")
    .select("id, author_id, work_type")
    .eq("id", id)
    .single();

  if (workError || !work) {
    return NextResponse.json({ error: "Work not found" }, { status: 404 });
  }

  if (work.author_id !== user.id) {
    return NextResponse.json(
      { error: "You can only add versions to your own works" },
      { status: 403 }
    );
  }

  // Get next version number
  const { data: maxVersion, error: maxError } = await supabase
    .from("work_versions")
    .select("version_number")
    .eq("work_id", id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    console.error("Failed to get max version number:", maxError);
    return NextResponse.json(
      { error: "Failed to determine version number" },
      { status: 500 }
    );
  }

  const nextVersionNumber = (maxVersion?.version_number ?? 0) + 1;

  return NextResponse.json({
    success: true,
    version_number: nextVersionNumber,
    work_type: work.work_type,
  });
}
