"use client";

import { useState, useTransition, type CSSProperties } from "react";
import type { MessageTemplateContent } from "@discord-rp/core";
import { saveMessageTemplateAction, deleteMessageTemplateAction } from "./actions";

type Button = { label: string; url: string; emoji?: string };

const EMPTY_CONTENT: MessageTemplateContent = { content: "", embeds: [], buttonRows: [] };

export function Builder({ guildId, templates }: { guildId: string; templates: { name: string; contentJson: unknown }[] }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState<MessageTemplateContent>(EMPTY_CONTENT);
  const [hasEmbed, setHasEmbed] = useState(false);
  const [buttons, setButtons] = useState<Button[]>([]);
  const [jsonText, setJsonText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const embed = hasEmbed ? content.embeds[0] : undefined;

  function updateEmbed(patch: Partial<NonNullable<MessageTemplateContent["embeds"][number]>>) {
    setContent((c) => ({ ...c, embeds: [{ ...(c.embeds[0] ?? {}), ...patch }] }));
  }

  function loadTemplate(t: { name: string; contentJson: unknown }) {
    const parsed = t.contentJson as MessageTemplateContent;
    setName(t.name);
    setContent(parsed);
    setHasEmbed(parsed.embeds.length > 0);
    setButtons(parsed.buttonRows[0] ?? []);
  }

  function buildFinalContent(): MessageTemplateContent {
    return {
      content: content.content || undefined,
      embeds: hasEmbed && embed ? [embed] : [],
      buttonRows: buttons.length > 0 ? [buttons] : [],
    };
  }

  function handleSave() {
    if (!name.trim()) {
      setMessage("❌ Donne un nom au modèle.");
      return;
    }
    startTransition(async () => {
      const result = await saveMessageTemplateAction(guildId, name.trim(), buildFinalContent());
      setMessage(result.error ? `❌ ${result.error}` : "✅ Modèle enregistré.");
    });
  }

  function handleImport() {
    try {
      const parsed = JSON.parse(jsonText) as MessageTemplateContent;
      setContent(parsed);
      setHasEmbed(parsed.embeds.length > 0);
      setButtons(parsed.buttonRows[0] ?? []);
      setMessage("✅ JSON importé.");
    } catch {
      setMessage("❌ JSON invalide.");
    }
  }

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 380px", display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={labelStyle}>
          Nom du modèle
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Contenu texte (hors embed)
          <textarea value={content.content ?? ""} onChange={(e) => setContent((c) => ({ ...c, content: e.target.value }))} rows={2} style={inputStyle} />
        </label>

        <label style={checkboxLabelStyle}>
          <input type="checkbox" checked={hasEmbed} onChange={(e) => setHasEmbed(e.target.checked)} />
          Inclure un embed
        </label>
        {hasEmbed && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 12, borderLeft: "2px solid #2a2340" }}>
            <label style={labelStyle}>
              Titre
              <input type="text" value={embed?.title ?? ""} onChange={(e) => updateEmbed({ title: e.target.value })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Description
              <textarea value={embed?.description ?? ""} onChange={(e) => updateEmbed({ description: e.target.value })} rows={3} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Couleur (hex)
              <input type="color" value={embed?.color ?? "#7c3aed"} onChange={(e) => updateEmbed({ color: e.target.value })} style={{ ...inputStyle, padding: 2 }} />
            </label>
            <label style={labelStyle}>
              Image (URL)
              <input type="text" value={embed?.imageUrl ?? ""} onChange={(e) => updateEmbed({ imageUrl: e.target.value })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Footer
              <input type="text" value={embed?.footerText ?? ""} onChange={(e) => updateEmbed({ footerText: e.target.value })} style={inputStyle} />
            </label>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#f4f2fa", fontSize: "0.9rem" }}>Boutons (lien uniquement — max 5)</span>
          <button type="button" onClick={() => setButtons((b) => [...b, { label: "", url: "" }])} disabled={buttons.length >= 5} style={smallButtonStyle}>
            + Ajouter
          </button>
        </div>
        {buttons.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Libellé"
              value={b.label}
              onChange={(e) => setButtons((arr) => arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="text"
              placeholder="https://..."
              value={b.url}
              onChange={(e) => setButtons((arr) => arr.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
              style={{ ...inputStyle, flex: 2 }}
            />
            <button type="button" onClick={() => setButtons((arr) => arr.filter((_, j) => j !== i))} style={dangerButtonStyle}>
              ✕
            </button>
          </div>
        ))}

        <button type="button" onClick={handleSave} disabled={isPending} style={buttonStyle}>
          {isPending ? "Enregistrement..." : "Enregistrer le modèle"}
        </button>
        {message && <span style={{ color: message.startsWith("✅") ? "#4ade80" : "#f87171", fontSize: "0.85rem" }}>{message}</span>}

        <details>
          <summary style={{ color: "#a79ec2", fontSize: "0.85rem", cursor: "pointer" }}>Import / export JSON</summary>
          <textarea
            value={jsonText || JSON.stringify(buildFinalContent(), null, 2)}
            onChange={(e) => setJsonText(e.target.value)}
            rows={8}
            style={{ ...inputStyle, fontFamily: "monospace", marginTop: 8 }}
          />
          <button type="button" onClick={handleImport} style={{ ...smallButtonStyle, marginTop: 6 }}>
            Importer ce JSON
          </button>
        </details>
      </div>

      <div style={{ flex: "1 1 320px" }}>
        <h3 style={{ color: "#a79ec2", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Aperçu</h3>
        <div style={previewContainerStyle}>
          {content.content && <p style={{ color: "#f4f2fa", margin: "0 0 8px 0", whiteSpace: "pre-wrap" }}>{content.content}</p>}
          {hasEmbed && embed && (
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", background: "#2b2d31" }}>
              <div style={{ width: 4, background: embed.color ?? "#7c3aed" }} />
              <div style={{ padding: "10px 14px", flex: 1 }}>
                {embed.title && <div style={{ color: "#fff", fontWeight: 600, marginBottom: 6 }}>{embed.title}</div>}
                {embed.description && <div style={{ color: "#dbdee1", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{embed.description}</div>}
                {embed.imageUrl && <img src={embed.imageUrl} alt="" style={{ marginTop: 8, borderRadius: 4, maxWidth: "100%" }} />}
                {embed.footerText && <div style={{ color: "#949ba4", fontSize: "0.75rem", marginTop: 8 }}>{embed.footerText}</div>}
              </div>
            </div>
          )}
          {buttons.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {buttons.map((b, i) => (
                <span key={i} style={previewButtonStyle}>
                  {b.label || "(bouton)"} ↗
                </span>
              ))}
            </div>
          )}
        </div>

        <h3 style={{ color: "#a79ec2", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 24 }}>
          Modèles enregistrés
        </h3>
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {templates.map((t) => (
            <li key={t.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" onClick={() => loadTemplate(t)} style={{ ...smallButtonStyle, textAlign: "left" }}>
                {t.name}
              </button>
              <button
                type="button"
                onClick={() => startTransition(() => deleteMessageTemplateAction(guildId, t.name))}
                style={dangerButtonStyle}
              >
                Supprimer
              </button>
            </li>
          ))}
          {templates.length === 0 && <li style={{ color: "#a79ec2", fontSize: "0.85rem" }}>Aucun modèle enregistré.</li>}
        </ul>
      </div>
    </div>
  );
}

const labelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, color: "#f4f2fa", fontSize: "0.85rem" };
const checkboxLabelStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, color: "#f4f2fa", fontSize: "0.9rem" };
const inputStyle: CSSProperties = { background: "#0f0c1a", border: "1px solid #2a2340", borderRadius: 6, padding: "8px 10px", color: "#f4f2fa" };
const buttonStyle: CSSProperties = { background: "#7c3aed", border: "none", borderRadius: 6, padding: "10px 16px", color: "white", cursor: "pointer" };
const smallButtonStyle: CSSProperties = {
  background: "transparent",
  border: "1px solid #7c3aed",
  color: "#c4b5fd",
  borderRadius: 6,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: "0.8rem",
};
const dangerButtonStyle: CSSProperties = {
  background: "transparent",
  border: "1px solid #f87171",
  color: "#f87171",
  borderRadius: 6,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: "0.8rem",
};
const previewContainerStyle: CSSProperties = { background: "#313338", borderRadius: 8, padding: 16 };
const previewButtonStyle: CSSProperties = {
  background: "#4e5058",
  color: "#fff",
  borderRadius: 4,
  padding: "6px 12px",
  fontSize: "0.85rem",
};
