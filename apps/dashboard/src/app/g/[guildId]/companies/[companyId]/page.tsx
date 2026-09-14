import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@discord-rp/database";
import { hireEmployeeAction, fireEmployeeAction } from "../actions";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ guildId: string; companyId: string }>;
}) {
  const { guildId, companyId } = await params;
  const company = await prisma.company.findFirst({
    where: { id: companyId, guildId },
    include: {
      ownerCharacter: true,
      treasuryAccount: true,
      employees: { include: { character: true, grade: true } },
    },
  });
  if (!company) notFound();

  const hireableCharacters = await prisma.character.findMany({
    where: {
      guildId,
      deletedAt: null,
      id: { notIn: [...company.employees.map((e) => e.characterId), company.ownerCharacterId] },
    },
    orderBy: { firstName: "asc" },
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>{company.name}</h1>
      <p style={{ color: "#a79ec2" }}>
        Propriétaire : {company.ownerCharacter.firstName} {company.ownerCharacter.lastName}
        {company.description ? ` — ${company.description}` : ""}
      </p>

      <div style={cardStyle}>
        <div style={{ color: "#a79ec2", fontSize: "0.85rem" }}>Trésorerie</div>
        <div style={{ fontSize: "1.3rem" }}>{((company.treasuryAccount?.balanceCents ?? 0) / 100).toFixed(2)} $</div>
      </div>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Employés</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2340" }}>
            <th style={{ padding: "8px 4px" }}>Personnage</th>
            <th style={{ padding: "8px 4px" }}>Grade</th>
            <th style={{ padding: "8px 4px" }} />
          </tr>
        </thead>
        <tbody>
          {company.employees.map((e) => (
            <tr key={e.id} style={{ borderBottom: "1px solid #1a1530" }}>
              <td style={{ padding: "8px 4px" }}>
                {e.character.firstName} {e.character.lastName}
              </td>
              <td style={{ padding: "8px 4px" }}>{e.grade.name}</td>
              <td style={{ padding: "8px 4px" }}>
                <form action={fireEmployeeAction.bind(null, guildId, company.id, e.characterId)}>
                  <button type="submit" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
                    Licencier
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {company.employees.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: "16px 4px", color: "#a79ec2" }}>
                Aucun employé.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Embaucher</h2>
      <form action={hireEmployeeAction.bind(null, guildId, company.id)} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <select name="characterId" required style={inputStyle}>
          <option value="">Personnage…</option>
          {hireableCharacters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </select>
        <button type="submit" style={buttonStyle}>
          Embaucher
        </button>
      </form>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 12,
  padding: "16px 20px",
  minWidth: 160,
  marginTop: 20,
  display: "inline-block",
};

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
