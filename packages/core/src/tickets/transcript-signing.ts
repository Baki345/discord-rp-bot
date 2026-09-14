import { createHmac, timingSafeEqual } from "node:crypto";

export interface TranscriptMessage {
  authorId: string;
  authorTag: string;
  content: string;
  attachmentUrls: string[];
  createdAt: string;
}

/** Deterministic JSON serialization — the same content array always signs to the same string regardless of Node's own key-insertion-order quirks. */
function canonicalize(content: TranscriptMessage[]): string {
  return JSON.stringify(
    content.map((m) => ({
      authorId: m.authorId,
      authorTag: m.authorTag,
      content: m.content,
      attachmentUrls: m.attachmentUrls,
      createdAt: m.createdAt,
    })),
  );
}

export function signTranscript(content: TranscriptMessage[], secret: string): string {
  return createHmac("sha256", secret).update(canonicalize(content)).digest("hex");
}

/** Constant-time compare — a signature check is a security boundary, string `===` would leak timing information about how many leading bytes match. */
export function verifyTranscriptSignature(content: TranscriptMessage[], signature: string, secret: string): boolean {
  const expected = signTranscript(content, secret);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
