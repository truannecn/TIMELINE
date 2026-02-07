"use client";

import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";

let configured = false;

/**
 * Configure Amplify with the generated outputs
 * This should be called once at app initialization
 */
export function configureAmplify(): void {
  if (configured) {
    return;
  }

  Amplify.configure(outputs);
  configured = true;
}

// Configure immediately on module load (client-side only)
if (typeof window !== "undefined") {
  configureAmplify();
}
