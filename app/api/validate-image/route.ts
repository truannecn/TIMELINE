import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SIGHTENGINE_API_USER = process.env.SIGHTENGINE_API_USER;
const SIGHTENGINE_API_SECRET = process.env.SIGHTENGINE_API_SECRET;
const AI_THRESHOLD = 0.75; // Reject if ai_generated score > this

export async function POST(request: NextRequest) {
  // Check auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check API credentials
  if (!SIGHTENGINE_API_USER || !SIGHTENGINE_API_SECRET) {
    console.error("Sightengine API credentials not configured");
    // In development, allow uploads without validation
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        passed: true,
        warning: "AI detection skipped (API not configured)",
      });
    }
    return NextResponse.json(
      { error: "AI detection service not configured" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Create form data for Sightengine
    const sightengineForm = new FormData();
    sightengineForm.append("media", file);
    sightengineForm.append("models", "genai");
    sightengineForm.append("api_user", SIGHTENGINE_API_USER);
    sightengineForm.append("api_secret", SIGHTENGINE_API_SECRET);

    // Call Sightengine API
    const response = await fetch(
      "https://api.sightengine.com/1.0/check.json",
      {
        method: "POST",
        body: sightengineForm,
      }
    );

    if (!response.ok) {
      console.error("Sightengine API error:", response.status);
      return NextResponse.json(
        { error: "AI detection service error" },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Check for API errors
    if (data.status !== "success") {
      console.error("Sightengine error:", data);
      return NextResponse.json(
        { error: "AI detection failed" },
        { status: 500 }
      );
    }

    // Extract AI generation score
    const aiScore = data.type?.ai_generated ?? 0;
    const passed = aiScore < AI_THRESHOLD;

    return NextResponse.json({
      passed,
      score: aiScore,
      threshold: AI_THRESHOLD,
      message: passed
        ? "Image appears to be human-created"
        : "Image appears to be AI-generated",
    });
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate image" },
      { status: 500 }
    );
  }
}
