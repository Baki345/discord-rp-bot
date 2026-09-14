"use client";

import { useState, useTransition } from "react";
import { verifyTicketTranscriptAction } from "./actions";

export function VerifyButton({ ticketId }: { ticketId: string }) {
  const [result, setResult] = useState<"valid" | "invalid" | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const { valid } = await verifyTicketTranscriptAction(ticketId);
            setResult(valid ? "valid" : "invalid");
          });
        }}
        style={{
          background: "#7c3aed",
          border: "none",
          borderRadius: 6,
          padding: "8px 16px",
          color: "white",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}
      >
        {isPending ? "Vérification..." : "Vérifier la signature"}
      </button>
      {result === "valid" && <span style={{ color: "#4ade80" }}>✅ Signature valide — ce transcript n&apos;a pas été modifié.</span>}
      {result === "invalid" && <span style={{ color: "#f87171" }}>❌ Signature invalide — ce transcript a été altéré depuis sa création.</span>}
    </div>
  );
}
