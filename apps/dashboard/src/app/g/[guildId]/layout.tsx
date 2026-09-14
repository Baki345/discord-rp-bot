import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export default async function GuildLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { guildId } = await params;
  const actor = await resolveActorContext(session, guildId);

  // Only a Discord guild admin, or a member holding at least one delegated
  // RPRole permission, may open this guild's dashboard.
  if (!actor.isDiscordGuildAdmin && actor.rpPermissions.length === 0) {
    redirect("/");
  }

  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      <nav
        style={{
          width: 220,
          borderRight: "1px solid #2a2340",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <a href="/" style={{ color: "#a79ec2", fontSize: "0.85rem", marginBottom: 16 }}>
          ← Tes serveurs
        </a>
        <a href={`/g/${guildId}`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Vue d&apos;ensemble
        </a>
        <a href={`/g/${guildId}/characters`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Personnages
        </a>
        <a href={`/g/${guildId}/economy`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Économie
        </a>
        <a href={`/g/${guildId}/companies`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Entreprises
        </a>
        <a href={`/g/${guildId}/vehicles`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Véhicules
        </a>
        <a href={`/g/${guildId}/items`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Objets
        </a>
        <a href={`/g/${guildId}/places`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Lieux
        </a>
        <a href={`/g/${guildId}/activities`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Activités
        </a>
        <a href={`/g/${guildId}/crafting`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Fabrication
        </a>
        <a href={`/g/${guildId}/licenses`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Permis
        </a>
        <a href={`/g/${guildId}/sessions`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Sessions
        </a>
        <a href={`/g/${guildId}/robbery`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Braquages
        </a>
        <a href={`/g/${guildId}/drugs`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Drogues
        </a>
        <a href={`/g/${guildId}/market`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Bourse
        </a>
        <a href={`/g/${guildId}/moderation`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Modération
        </a>
        <a href={`/g/${guildId}/tickets`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Tickets
        </a>
        <a href={`/g/${guildId}/candidatures`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Candidatures
        </a>
        <a href={`/g/${guildId}/leveling`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Niveaux
        </a>
        <a href={`/g/${guildId}/appeals`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Appels
        </a>
        <a href={`/g/${guildId}/staff`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Staff sécurité
        </a>
        <a href={`/g/${guildId}/quarantine`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Quarantaine
        </a>
        <a href={`/g/${guildId}/join-gate`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Porte d&apos;entrée
        </a>
        <a href={`/g/${guildId}/join-raid`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Raid d&apos;arrivées
        </a>
        <a href={`/g/${guildId}/verification`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Vérification
        </a>
        <a href={`/g/${guildId}/automod`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Auto-modération
        </a>
        <a href={`/g/${guildId}/lockdown`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Lockdown
        </a>
        <a href={`/g/${guildId}/anti-nuke`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Anti-nuke
        </a>
        <a href={`/g/${guildId}/backups`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Sauvegardes
        </a>
        <a href={`/g/${guildId}/panic`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Mode panique
        </a>
        <a href={`/g/${guildId}/permissions`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Permissions
        </a>
        <a href={`/g/${guildId}/logs`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Journal
        </a>
        <a href={`/g/${guildId}/log-routing`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Routage des logs
        </a>
        <a href={`/g/${guildId}/diagnostic`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Diagnostic
        </a>
        <a href={`/g/${guildId}/settings`} style={{ color: "#f4f2fa", textDecoration: "none" }}>
          Paramètres
        </a>
      </nav>
      <div style={{ flex: 1, padding: "32px 40px" }}>{children}</div>
    </div>
  );
}
