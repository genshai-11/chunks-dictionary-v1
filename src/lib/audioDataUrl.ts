export function toAudioDataUrl(audioBase64: string, mimeType?: string): string {
  const safeMime = mimeType && mimeType.startsWith("audio/") ? mimeType : "audio/mp3";
  return `data:${safeMime};base64,${audioBase64}`;
}
