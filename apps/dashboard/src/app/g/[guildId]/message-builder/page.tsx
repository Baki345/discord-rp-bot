import { listMessageTemplates } from "@discord-rp/core";
import { Builder } from "./Builder";

export default async function MessageBuilderPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const templates = await listMessageTemplates(guildId);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Constructeur de messages</h1>
      <p style={{ color: "#a79ec2" }}>
        Crée un message (embed + boutons-lien) réutilisable, puis envoie-le depuis Discord avec{" "}
        <code>/message envoyer</code>.
      </p>

      <div style={{ marginTop: 20 }}>
        <Builder guildId={guildId} templates={templates.map((t) => ({ name: t.name, contentJson: t.contentJson }))} />
      </div>
    </div>
  );
}
