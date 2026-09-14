import type { CSSProperties } from "react";
import Link from "next/link";
import { prisma } from "@discord-rp/database";
import { createCompanyAction } from "./actions";

export default async function CompaniesPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [companies, characters] = await Promise.all([
    prisma.company.findMany({ where: { guildId }, include: { ownerCharacter: true, employees: true }, orderBy: { name: "asc" } }),
    prisma.character.findMany({ where: { guildId, deletedAt: null }, orderBy: { firstName: "asc" } }),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Entreprises</h1>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Nom</th>
            <th style={{ padding: "8px 4px" }}>Propriétaire</th>
            <th style={{ padding: "8px 4px" }}>Employés</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>
                <Link href={`/g/${guildId}/companies/${c.id}`} style={{ color: "#c4b5fd" }}>
                  {c.name}
                </Link>
              </td>
              <td style={{ padding: "8px 4px" }}>
                {c.ownerCharacter.firstName} {c.ownerCharacter.lastName}
              </td>
              <td style={{ padding: "8px 4px" }}>{c.employees.length}</td>
            </tr>
          ))}
          {companies.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucune entreprise pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Créer une entreprise</h2>
      <form action={createCompanyAction.bind(null, guildId)} style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <select name="ownerCharacterId" required style={inputStyle}>
          <option value="">Propriétaire…</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </select>
        <input name="name" placeholder="Nom" required style={inputStyle} />
        <input name="description" placeholder="Description (optionnel)" style={inputStyle} />
        <button type="submit" style={buttonStyle}>
          Créer
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

const buttonStyle: CSSProperties = {
  background: "#7c3aed",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  color: "white",
  cursor: "pointer",
};
