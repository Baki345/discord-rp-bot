import type { CSSProperties } from "react";
import Link from "next/link";
import { listTicketHistory, listTicketCategories } from "@discord-rp/core";

function formatDuration(createdAt: Date, closedAt: Date | null): string {
  if (!closedAt) return "—";
  const minutes = Math.round((closedAt.getTime() - createdAt.getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)} h`;
}

export default async function TicketHistoryPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [tickets, categories] = await Promise.all([listTicketHistory(guildId), listTicketCategories(guildId)]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Historique des tickets</h1>
      <p style={{ color: "#a79ec2" }}>
        <Link href={`/g/${guildId}/tickets`} style={{ color: "#a79ec2" }}>
          ← Retour aux tickets
        </Link>
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#a79ec2", fontSize: "0.8rem" }}>
            <th style={thStyle}>Catégorie</th>
            <th style={thStyle}>Ouvert par</th>
            <th style={thStyle}>Fermé par</th>
            <th style={thStyle}>Durée</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} style={{ borderTop: "1px solid #2a2340" }}>
              <td style={tdStyle}>{categoryNameById.get(ticket.categoryId) ?? "—"}</td>
              <td style={tdStyle}>
                <code>{ticket.openerDiscordId}</code>
              </td>
              <td style={tdStyle}>{ticket.closedByDiscordId ? <code>{ticket.closedByDiscordId}</code> : <em>auto</em>}</td>
              <td style={tdStyle}>{formatDuration(ticket.createdAt, ticket.closedAt)}</td>
              <td style={tdStyle}>
                <Link href={`/g/${guildId}/tickets/${ticket.id}`} style={{ color: "#c4b5fd" }}>
                  Voir le transcript
                </Link>
              </td>
            </tr>
          ))}
          {tickets.length === 0 && (
            <tr>
              <td colSpan={5} style={{ ...tdStyle, color: "#a79ec2", textAlign: "center", padding: "24px 10px" }}>
                Aucun ticket fermé pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: CSSProperties = { padding: "6px 10px" };
const tdStyle: CSSProperties = { padding: "10px 10px", color: "#f4f2fa", fontSize: "0.9rem" };
