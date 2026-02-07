"use client";

import { configureAmplify } from "@/lib/amplify/config";

interface AmplifyProviderProps {
  children: React.ReactNode;
}

// Configure immediately when this module loads
configureAmplify();

export function AmplifyProvider({ children }: AmplifyProviderProps) {
  return <>{children}</>;
}
