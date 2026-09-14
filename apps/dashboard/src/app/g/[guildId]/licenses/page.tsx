import type { CSSProperties } from "react";
import { prisma } from "@discord-rp/database";
import { createLicenseAction, addQuestionAction } from "./actions";

export default async function LicensesPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const licenses = await prisma.license.findMany({
    where: { guildId },
    include: { questions: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Permis & examens</h1>

      {licenses.map((license) => (
        <div key={license.id} style={cardStyle}>
          <h2 style={{ fontSize: "1.05rem", margin: 0 }}>{license.name}</h2>
          <p style={{ color: "#a79ec2", fontSize: "0.85rem", margin: "4px 0 12px" }}>
            {license.questions.length} question(s) — {license.passScorePct}% pour réussir
          </p>
          <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
            {license.questions.map((q) => (
              <li key={q.id} style={{ color: "#a79ec2", fontSize: "0.85rem" }}>
                {q.question}
              </li>
            ))}
          </ul>

          <details>
            <summary style={{ cursor: "pointer", color: "#c4b5fd", fontSize: "0.85rem" }}>Ajouter une question</summary>
            <form action={addQuestionAction.bind(null, guildId, license.id)} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, maxWidth: 420 }}>
              <input name="question" placeholder="Texte de la question" required style={inputStyle} />
              <input name="choice1" placeholder="Choix A" required style={inputStyle} />
              <input name="choice2" placeholder="Choix B" required style={inputStyle} />
              <input name="choice3" placeholder="Choix C (optionnel)" style={inputStyle} />
              <input name="choice4" placeholder="Choix D (optionnel)" style={inputStyle} />
              <label style={labelStyle}>
                Bonne réponse
                <select name="correctIndex" style={inputStyle}>
                  <option value="0">A</option>
                  <option value="1">B</option>
                  <option value="2">C</option>
                  <option value="3">D</option>
                </select>
              </label>
              <button type="submit" style={buttonStyle}>
                Ajouter
              </button>
            </form>
          </details>
        </div>
      ))}
      {licenses.length === 0 && <p style={{ color: "#a79ec2", marginTop: 20 }}>Aucun permis pour l&apos;instant.</p>}

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Créer un permis</h2>
      <form action={createLicenseAction.bind(null, guildId)} style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <input name="key" placeholder="Identifiant (ex. conduite)" required style={inputStyle} />
        <input name="name" placeholder="Nom affiché" required style={inputStyle} />
        <input name="passScorePct" type="number" min="1" max="100" placeholder="% réussite" defaultValue={80} style={{ ...inputStyle, width: 110 }} />
        <button type="submit" style={buttonStyle}>
          Créer
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
  marginTop: 20,
};

const inputStyle: CSSProperties = {
  background: "#0d0814",
  border: "1px solid #2a2340",
  borderRadius: 6,
  padding: "8px 10px",
  color: "#f4f2fa",
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: "#f4f2fa",
  fontSize: "0.9rem",
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
