export type TtsGatewayProvider = "ninerouter" | "google-gemini";

export function getTtsGatewayProvider(): TtsGatewayProvider {
  return localStorage.getItem("tts_gateway_provider") === "google-gemini" ? "google-gemini" : "ninerouter";
}

export function buildTtsHeaders(ninerouterModel?: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const provider = getTtsGatewayProvider();

  if (provider === "google-gemini") {
    headers["x-tts-provider"] = "google-gemini";
    const googleKey = localStorage.getItem("google_ai_api_key") || "";
    const googleModel = localStorage.getItem("google_tts_model") || "gemini-2.5-flash-preview-tts";
    const googleVoice = localStorage.getItem("google_tts_voice") || "Kore";
    if (googleKey) headers["x-google-ai-key"] = googleKey;
    headers["x-google-tts-model"] = googleModel;
    headers["x-google-tts-voice"] = googleVoice;
    return headers;
  }

  const nrUrl = localStorage.getItem("ninerouter_url") || "";
  const nrKey = localStorage.getItem("ninerouter_key") || "";
  if (nrUrl && ninerouterModel) {
    headers["x-ninerouter-url"] = nrUrl;
    if (nrKey) headers["x-ninerouter-key"] = nrKey;
    headers["x-ninerouter-tts-model"] = ninerouterModel;
  }
  return headers;
}
