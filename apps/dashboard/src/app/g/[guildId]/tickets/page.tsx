import type { CSSProperties } from "react";
import Link from "next/link";
import { listTicketPanels, listTicketCategories, listOpenTickets } from "@discord-rp/core";
import { updateTicketCategoryRolesAction, deleteTicketCategoryAction } from "./actions";

function joinIds(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : "";
}

export default async function TicketsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [panels, categories, openTickets] = await Promise.all([
    listTicketPanels(guildId),
    listTicketCategories(guildId),
    listOpenTickets(guildId),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Tickets</h1>
      <p style={{ color: "#a79ec2" }}>
        Panneaux et catégories créés depuis Discord via <code>/ticket panneau creer</code> et{" "}
        <code>/ticket categorie creer</code>. Les rôles de claim/close/VC et les limites se règlent ici.
      </p>

      <p style={{ color: "#f4f2fa" }}>
        <strong>{openTickets.length}</strong> ticket(s) actuellement ouvert(s). {" "}
        <Link href={`/g/${guildId}/tickets/history`} style={{ color: "#c4b5fd" }}>
          Voir l&apos;historique et les transcripts →
        </Link>
      </p>

      <h2 style={{ fontSize: "1.1rem", marginTop: 28 }}>Panneaux ({panels.length})</h2>
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {panels.map((panel) => (
          <li key={panel.id} style={cardStyle}>
            <strong style={{ color: "#f4f2fa" }}>{panel.title}</strong>
            <div style={{ color: "#a79ec2", fontSize: "0.8rem" }}>
              #{panel.channelId} · {panel.categories.length} catégorie(s) · id <code>{panel.id}</code>
            </div>
          </li>
        ))}
        {panels.length === 0 && <li style={{ color: "#a79ec2" }}>Aucun panneau créé.</li>}
      </ul>

      <h2 style={{ fontSize: "1.1rem", marginTop: 28 }}>Catégories ({categories.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
        {categories.map((category) => (
          <form key={category.id} action={updateTicketCategoryRolesAction.bind(null, guildId, category.id)} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ color: "#f4f2fa" }}>
                {category.emoji ? `${category.emoji} ` : ""}
                {category.name}
              </strong>
              <button
                type="submit"
                formAction={deleteTicketCategoryAction.bind(null, guildId, category.id)}
                style={dangerButtonStyle}
              >
                Supprimer
              </button>
            </div>

            <label style={labelStyle}>
              Rôles support (auto-ajoutés à chaque ticket) — IDs séparés par des virgules
              <input type="text" name="supportRoleIds" defaultValue={joinIds(category.supportRoleIds)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Rôles autorisés à claim/unclaim (vide = tous les rôles support)
              <input type="text" name="claimRoleIds" defaultValue={joinIds(category.claimRoleIds)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Rôles autorisés à fermer (vide = tous les rôles support)
              <input type="text" name="closeRoleIds" defaultValue={joinIds(category.closeRoleIds)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Rôles autorisés à créer un salon vocal (vide = tous les rôles support)
              <input type="text" name="vcRequestRoleIds" defaultValue={joinIds(category.vcRequestRoleIds)} style={inputStyle} />
            </label>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ ...labelStyle, flex: 1 }}>
                Limite de tickets par membre
                <input
                  type="number"
                  name="ticketLimitPerUser"
                  min="1"
                  defaultValue={category.ticketLimitPerUser ?? ""}
                  placeholder="Illimité"
                  style={inputStyle}
                />
              </label>
              <label style={{ ...labelStyle, flex: 1 }}>
                Fermeture auto après (minutes d&apos;inactivité)
                <input
                  type="number"
                  name="autoCloseAfterMinutesInactive"
                  min="1"
                  defaultValue={category.autoCloseAfterMinutesInactive ?? ""}
                  placeholder="Jamais"
                  style={inputStyle}
                />
              </label>
            </div>

            <button type="submit" style={saveButtonStyle}>
              Enregistrer
            </button>
          </form>
        ))}
        {categories.length === 0 && <p style={{ color: "#a79ec2" }}>Aucune catégorie créée.</p>}
      </div>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 10,
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  color: "#a79ec2",
  fontSize: "0.8rem",
};
const inputStyle: CSSProperties = {
  background: "#0f0c1a",
  border: "1px solid #2a2340",
  borderRadius: 6,
  padding: "6px 10px",
  color: "#f4f2fa",
  fontSize: "0.85rem",
};
const saveButtonStyle: CSSProperties = {
  background: "#7c3aed",
  border: "none",
  borderRadius: 6,
  padding: "6px 14px",
  color: "white",
  cursor: "pointer",
  fontSize: "0.85rem",
  alignSelf: "flex-start",
};
const dangerButtonStyle: CSSProperties = {
  background: "transparent",
  border: "1px solid #f87171",
  color: "#f87171",
  borderRadius: 6,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: "0.75rem",
};
