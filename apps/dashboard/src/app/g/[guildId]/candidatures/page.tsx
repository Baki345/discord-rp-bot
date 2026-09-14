import type { CSSProperties } from "react";
import { listApplicationCategories, listPendingApplications, listApplicationHistory } from "@discord-rp/core";
import { updateApplicationCategoryAction, deleteApplicationCategoryAction } from "./actions";

function joinIds(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : "";
}

export default async function CandidaturesPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [categories, pending, history] = await Promise.all([
    listApplicationCategories(guildId),
    listPendingApplications(guildId),
    listApplicationHistory(guildId, 20),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Candidatures</h1>
      <p style={{ color: "#a79ec2" }}>
        Créées depuis Discord via <code>/candidatures categorie-creer</code>. Les questions se configurent ici en JSON
        (tableau de <code>{"{ id, type, label, required }"}</code>, types possibles : SHORT_TEXT, PARAGRAPH, USER,
        ROLE, CHANNEL, SELECT, FILE).
      </p>

      <h2 style={{ fontSize: "1.1rem", marginTop: 24 }}>Catégories ({categories.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
        {categories.map((category) => (
          <form key={category.id} action={updateApplicationCategoryAction.bind(null, guildId, category.id)} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ color: "#f4f2fa" }}>{category.name}</strong>
              <button type="submit" formAction={deleteApplicationCategoryAction.bind(null, guildId, category.id)} style={dangerButtonStyle}>
                Supprimer
              </button>
            </div>
            <label style={labelStyle}>
              Rôles revieweurs (IDs séparés par des virgules)
              <input type="text" name="reviewerRoleIds" defaultValue={joinIds(category.reviewerRoleIds)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Salon de résultats (ID)
              <input type="text" name="resultChannelId" defaultValue={category.resultChannelId ?? ""} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Questions (JSON — laisser vide pour ne pas changer)
              <textarea name="questionsJson" rows={4} placeholder={JSON.stringify(category.questions)} style={{ ...inputStyle, fontFamily: "monospace" }} />
            </label>
            <button type="submit" style={saveButtonStyle}>
              Enregistrer
            </button>
          </form>
        ))}
        {categories.length === 0 && <p style={{ color: "#a79ec2" }}>Aucune catégorie créée.</p>}
      </div>

      <h2 style={{ fontSize: "1.1rem", marginTop: 28 }}>En attente ({pending.length})</h2>
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {pending.map((app) => (
          <li key={app.id} style={{ color: "#f4f2fa", fontSize: "0.9rem" }}>
            <code>{app.applicantDiscordId}</code> — {new Date(app.createdAt).toLocaleString("fr-FR")}
          </li>
        ))}
        {pending.length === 0 && <li style={{ color: "#a79ec2" }}>Aucune candidature en attente.</li>}
      </ul>

      <h2 style={{ fontSize: "1.1rem", marginTop: 28 }}>Historique récent</h2>
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {history.map((app) => (
          <li key={app.id} style={{ color: "#f4f2fa", fontSize: "0.9rem" }}>
            <code>{app.applicantDiscordId}</code> —{" "}
            <span style={{ color: app.status === "ACCEPTED" ? "#4ade80" : "#f87171" }}>{app.status === "ACCEPTED" ? "Acceptée" : "Refusée"}</span>
            {app.reviewedByDiscordId && <> par <code>{app.reviewedByDiscordId}</code></>}
          </li>
        ))}
        {history.length === 0 && <li style={{ color: "#a79ec2" }}>Aucune candidature traitée.</li>}
      </ul>
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
const labelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, color: "#a79ec2", fontSize: "0.8rem" };
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
