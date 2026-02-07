const DEDALUS_API_URL = "https://api.dedaluslabs.ai";

interface DedalusModel {
  id: string;
  object: string;
  owned_by: string;
}

interface ModelsResponse {
  object: string;
  data: DedalusModel[];
}

interface HealthResponse {
  status: string;
}

async function dedalusFetch<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.DEDALUS_API_KEY;

  if (!apiKey) {
    throw new Error("DEDALUS_API_KEY environment variable is not set");
  }

  const response = await fetch(`${DEDALUS_API_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Dedalus API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// GET /health - Check API health
export async function getHealth(): Promise<HealthResponse> {
  return dedalusFetch<HealthResponse>("/health");
}

// GET /v1/models - List all available models
export async function getModels(): Promise<ModelsResponse> {
  return dedalusFetch<ModelsResponse>("/v1/models");
}

// GET /v1/models/{model_id} - Get specific model details
export async function getModel(modelId: string): Promise<DedalusModel> {
  return dedalusFetch<DedalusModel>(`/v1/models/${encodeURIComponent(modelId)}`);
}
