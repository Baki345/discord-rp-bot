import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTicket, getTicketTranscript, getTicketCategory } from "@discord-rp/core";
import { VerifyButton } from "./VerifyButton";

export default async function TicketDetailPage({ params }: { params: Promise<{ guildId: string; ticketId: string }> }) {
  const { guildId, ticketId } = await params;
  const ticket = await getTicket(ticketId).catch(() => null);
  if (!ticket || ticket.guildId !== guildId) notFound();

  const [category, transcript] = await Promise.all([getTicketCategory(ticket.categoryId), getTicketTranscript(ticketId)]);
  const messages = transcript ? (transcript.content as unknown as { authorTag: string; content: string; attachmentUrls: string[]; createdAt: string }[]) : [];

  return (
    <div>
      <p>
        <Link href={`/g/${guildId}/tickets/history`} style={{ color: "#a79ec2" }}>
          ← Retour à l&apos;historique
        </Link>
      </p>
      <h1 style={{ fontSize: "1.4rem" }}>
        Ticket — {category.name}
      </h1>
      <p style={{ color: "#a79ec2" }}>
        Ouvert par <code>{ticket.openerDiscordId}</code> · statut {ticket.status}
      </p>

      {transcript ? (
        <>
          <VerifyButton ticketId={ticketId} />
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={messageStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#a79ec2", fontSize: "0.75rem" }}>
                  <strong style={{ color: "#f4f2fa" }}>{m.authorTag}</strong>
                  <span>{new Date(m.createdAt).toLocaleString("fr-FR")}</span>
                </div>
                {m.content && <div style={{ color: "#f4f2fa", fontSize: "0.9rem", marginTop: 4, whiteSpace: "pre-wrap" }}>{m.content}</div>}
                {m.attachmentUrls.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                    {m.attachmentUrls.map((url) => (
                      <a key={url} href={url} style={{ color: "#c4b5fd", fontSize: "0.8rem" }}>
                        {url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {messages.length === 0 && <p style={{ color: "#a79ec2" }}>Transcript vide.</p>}
          </div>
        </>
      ) : (
        <p style={{ color: "#a79ec2" }}>Aucun transcript enregistré pour ce ticket (il est peut-être encore ouvert).</p>
      )}
    </div>
  );
}

const messageStyle: CSSProperties = {
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 8,
  padding: "10px 12px",
};
