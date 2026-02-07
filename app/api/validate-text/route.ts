import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Dedalus from "dedalus-labs";

const DEDALUS_API_KEY = process.env.DEDALUS_API_KEY;
const AI_THRESHOLD = 0.65; // Reject if AI probability > this

const DETECTION_PROMPT = `You are an expert AI-generated text detector. Analyze the following text and determine the probability that it was written by an AI language model rather than a human.

Consider these factors:
- Repetitive or formulaic phrasing
- Lack of personal voice, anecdotes, or unique perspective
- Overly balanced or hedging language ("on one hand... on the other hand")
- Perfect grammar and structure without natural human errors
- Generic examples or explanations
- Lack of specific, verifiable details or citations
- Unusual consistency in paragraph length and structure

Respond with ONLY a JSON object in this exact format:
{"ai_probability": 0.XX, "reasoning": "brief explanation"}

Where ai_probability is a number between 0.0 (definitely human) and 1.0 (definitely AI).`;

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
  if (!DEDALUS_API_KEY) {
    console.error("Dedalus API key not configured");
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
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Minimum text length for reliable detection
    if (text.length < 100) {
      return NextResponse.json(
        { error: "Text must be at least 100 characters for AI detection" },
        { status: 400 }
      );
    }

    // Initialize Dedalus client
    const client = new Dedalus({
      apiKey: DEDALUS_API_KEY,
    });

    // Use Claude Opus 4.5 for AI detection
    const completion = await client.chat.completions.create({
      model: "anthropic/claude-opus-4-5",
      messages: [
        { role: "system", content: DETECTION_PROMPT },
        { role: "user", content: `Analyze this text:\n\n${text}` },
      ],
      temperature: 0.1, // Low temperature for consistent analysis
    });

    const responseText = completion.choices[0]?.message?.content || "";

    // Parse the JSON response
    let aiScore = 0;
    let reasoning = "";

    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiScore = parsed.ai_probability ?? 0;
        reasoning = parsed.reasoning ?? "";
        console.log(aiScore);
      }
    } catch (parseError) {
      console.error("Failed to parse AI detection response:", responseText);
      // Default to passing if we can't parse (fail open)
      return NextResponse.json({
        passed: true,
        score: 0,
        threshold: AI_THRESHOLD,
        message: "Could not determine AI probability",
        warning: "Detection parsing failed",
      });
    }

    const passed = aiScore < AI_THRESHOLD;

    return NextResponse.json({
      passed,
      score: aiScore,
      threshold: AI_THRESHOLD,
      message: passed
        ? "Text appears to be human-written"
        : "Text appears to be AI-generated",
      reasoning,
    });
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate text" },
      { status: 500 }
    );
  }
}
