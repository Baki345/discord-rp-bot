import type { CSSProperties } from "react";
import { listCommandPermissionOverrides } from "@discord-rp/core";
import { saveCommandPermissionOverrideAction, deleteCommandPermissionOverrideAction } from "./actions";

// Every top-level slash command this bot registers (apps/bot/src/deploy-commands.ts).
// Kept as a static list here since the dashboard doesn't import bot command modules.
const COMMAND_NAMES = [
  "config",
  "personnage",
  "economie",
  "banque",
  "metier",
  "entreprise",
  "vehicule",
  "boutique",
  "inventaire",
  "lieu",
  "cle",
  "activite",
  "craft",
  "permis",
  "session",
  "service",
  "braquage",
  "drogue",
  "racket",
  "blanchiment",
  "bourse",
  "mod",
  "securite",
  "rescue",
  "lockdown",
  "appel",
  "mes-sanctions",
  "ticket",
  "candidature",
  "candidatures",
  "niveau",
  "classement",
  "interaction",
  "message",
];

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export default async function CommandPermissionsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const overrides = await listCommandPermissionOverrides(guildId);
  const overrideByCommand = new Map(overrides.map((o) => [o.commandName, o]));

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Permissions de commandes</h1>
      <p style={{ color: "#a79ec2" }}>
        Restreins qui peut utiliser chaque commande, dans quel salon, et avec quel délai entre deux usages. Un
        administrateur Discord passe toujours, quelle que soit la règle. Laisse un champ vide pour ne pas restreindre
        ce critère.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Commande</th>
            <th style={{ padding: "8px 4px" }}>Rôles autorisés</th>
            <th style={{ padding: "8px 4px" }}>Rôles refusés</th>
            <th style={{ padding: "8px 4px" }}>Salons autorisés</th>
            <th style={{ padding: "8px 4px" }}>Cooldown (s)</th>
            <th style={{ padding: "8px 4px" }} />
          </tr>
        </thead>
        <tbody>
          {COMMAND_NAMES.map((commandName) => {
            const override = overrideByCommand.get(commandName);
            return (
              <tr key={commandName} style={{ borderBottom: "1px solid #1a1530" }}>
                <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>/{commandName}</td>
                <td colSpan={5} style={{ padding: "8px 4px" }}>
                  <form
                    action={saveCommandPermissionOverrideAction.bind(null, guildId, commandName)}
                    style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
                  >
                    <input
                      name="allowedRoleIds"
                      placeholder="ID de rôle, ID de rôle…"
                      defaultValue={asStringArray(override?.allowedRoleIds).join(", ")}
                      style={{ ...inputStyle, flex: "1 1 160px" }}
                    />
                    <input
                      name="deniedRoleIds"
                      placeholder="ID de rôle, ID de rôle…"
                      defaultValue={asStringArray(override?.deniedRoleIds).join(", ")}
                      style={{ ...inputStyle, flex: "1 1 160px" }}
                    />
                    <input
                      name="allowedChannelIds"
                      placeholder="ID de salon, ID de salon…"
                      defaultValue={asStringArray(override?.allowedChannelIds).join(", ")}
                      style={{ ...inputStyle, flex: "1 1 160px" }}
                    />
                    <input
                      name="cooldownSeconds"
                      type="number"
                      min={1}
                      placeholder="—"
                      defaultValue={override?.cooldownSeconds ?? ""}
                      style={{ ...inputStyle, width: 90 }}
                    />
                    <button type="submit" style={buttonStyle}>
                      Enregistrer
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {overrides.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Règles actives</h2>
          <ul style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, padding: 0, listStyle: "none" }}>
            {overrides.map((o) => (
              <li key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "monospace", color: "#f4f2fa" }}>/{o.commandName}</span>
                <form action={deleteCommandPermissionOverrideAction.bind(null, guildId, o.commandName)}>
                  <button type="submit" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
                    Supprimer la règle
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
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

const buttonStyle: CSSProperties = {
  background: "#7c3aed",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  color: "white",
  cursor: "pointer",
};
