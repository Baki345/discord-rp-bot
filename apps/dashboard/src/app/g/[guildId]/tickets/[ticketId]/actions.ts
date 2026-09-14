"use server";

import { verifyTicketTranscript } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";

export async function verifyTicketTranscriptAction(ticketId: string): Promise<{ valid: boolean }> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");

  const valid = await verifyTicketTranscript(ticketId);
  return { valid };
}
