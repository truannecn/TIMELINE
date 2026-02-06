import { DetectionResult, AIDetector } from "./types";

const AI_THRESHOLD = 0.75; // Reject if ai_generated > this

export class SightengineDetector implements AIDetector {
  private apiUser: string;
  private apiSecret: string;

  constructor() {
    if (!process.env.SIGHTENGINE_API_USER || !process.env.SIGHTENGINE_API_SECRET) {
      throw new Error("Missing Sightengine API credentials");
    }
    this.apiUser = process.env.SIGHTENGINE_API_USER;
    this.apiSecret = process.env.SIGHTENGINE_API_SECRET;
  }

  async checkImage(imageBytes: Buffer, filename: string): Promise<DetectionResult> {
    const formData = new FormData();
    formData.append("media", new Blob([new Uint8Array(imageBytes)]), filename);
    formData.append("models", "genai");
    formData.append("api_user", this.apiUser);
    formData.append("api_secret", this.apiSecret);

    const response = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    const aiScore = data?.type?.ai_generated ?? 0;

    return {
      passed: aiScore < AI_THRESHOLD,
      confidence: 1 - aiScore,
      rawScore: aiScore,
      provider: "sightengine",
      details: data,
    };
  }

  async checkText(_text: string): Promise<DetectionResult> {
    throw new Error("Sightengine does not support text detection");
  }
}
