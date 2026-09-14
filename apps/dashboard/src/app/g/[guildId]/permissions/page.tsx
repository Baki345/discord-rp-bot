import type { CSSProperties } from "react";
import { listRPRoles, listMemberRoleAssignments, PERMISSION_FLAGS } from "@discord-rp/core";
import { createRPRoleAction, deleteRPRoleAction, assignRoleAction, unassignRoleAction } from "./actions";

const PERMISSION_LABELS: Record<string, string> = {
  MANAGE_CHARACTERS: "Personnages",
  MANAGE_ECONOMY: "Économie",
  MANAGE_COMPANIES: "Entreprises",
  MANAGE_JOBS: "Métiers",
  MANAGE_VEHICLES: "Véhicules",
  MANAGE_ITEMS: "Objets",
  MANAGE_SHOPS: "Boutiques",
  VIEW_LOGS: "Journal d'audit",
};

export default async function PermissionsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [roles, assignments] = await Promise.all([listRPRoles(guildId), listMemberRoleAssignments(guildId)]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Permissions</h1>
      <p style={{ color: "#a79ec2" }}>
        Délègue des capacités d&apos;administration précises à des membres sans leur donner les permissions Discord du serveur.
      </p>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Rôles RP</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Nom</th>
            <th style={{ padding: "8px 4px" }}>Permissions</th>
            <th style={{ padding: "8px 4px" }} />
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>
                {role.color && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: role.color,
                      marginRight: 8,
                    }}
                  />
                )}
                {role.name}
              </td>
              <td style={{ padding: "8px 4px", color: "#a79ec2" }}>
                {(role.permissions as string[]).map((p) => PERMISSION_LABELS[p] ?? p).join(", ") || "—"}
              </td>
              <td style={{ padding: "8px 4px" }}>
                <form action={deleteRPRoleAction.bind(null, guildId, role.id)}>
                  <button type="submit" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
                    Supprimer
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {roles.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucun rôle RP pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Créer un rôle RP</h2>
      <form action={createRPRoleAction.bind(null, guildId)} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, maxWidth: 420 }}>
        <input name="key" placeholder="Identifiant (ex. support)" required style={inputStyle} />
        <input name="name" placeholder="Nom affiché" required style={inputStyle} />
        <input name="color" type="color" defaultValue="#7c3aed" style={{ ...inputStyle, padding: 4, height: 40 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {PERMISSION_FLAGS.map((flag) => (
            <label key={flag} style={checkboxLabelStyle}>
              <input type="checkbox" name="permissions" value={flag} /> {PERMISSION_LABELS[flag] ?? flag}
            </label>
          ))}
        </div>
        <button type="submit" style={buttonStyle}>
          Créer
        </button>
      </form>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Attributions</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Membre (ID Discord)</th>
            <th style={{ padding: "8px 4px" }}>Rôle</th>
            <th style={{ padding: "8px 4px" }} />
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{a.discordUserId}</td>
              <td style={{ padding: "8px 4px" }}>{a.role.name}</td>
              <td style={{ padding: "8px 4px" }}>
                <form action={unassignRoleAction.bind(null, guildId, a.discordUserId, a.roleId)}>
                  <button type="submit" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
                    Retirer
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {assignments.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucune attribution pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Attribuer un rôle</h2>
      <p style={{ color: "#a79ec2", fontSize: "0.85rem" }}>
        Récupère l&apos;ID Discord du membre (clic droit sur son profil → Copier l&apos;identifiant, mode développeur activé).
      </p>
      <form action={assignRoleAction.bind(null, guildId)} style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <input name="discordUserId" placeholder="ID Discord du membre" required style={inputStyle} />
        <select name="roleId" required style={inputStyle}>
          <option value="">Rôle…</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <button type="submit" style={buttonStyle}>
          Attribuer
        </button>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 6,
  padding: "8px 10px",
  color: "#f4f2fa",
};

const checkboxLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#f4f2fa",
};

const buttonStyle: CSSProperties = {
  background: "#7c3aed",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  color: "white",
  cursor: "pointer",
  alignSelf: "flex-start",
};
