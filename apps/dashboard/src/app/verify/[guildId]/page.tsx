import { prisma } from "@discord-rp/database";
import { auth, signIn } from "@/auth/auth.config";
import { submitWebVerificationAction } from "./actions";

export default async function VerifyPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await prisma.guild.findUnique({ where: { id: guildId }, select: { name: true, iconUrl: true } });
  const session = await auth();

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.4rem" }}>Vérification — {guild?.name ?? "Serveur inconnu"}</h1>

      {!guild ? (
        <p style={{ color: "#a79ec2" }}>Ce serveur n&apos;est pas configuré.</p>
      ) : !session ? (
        <>
          <p style={{ color: "#a79ec2", maxWidth: 360 }}>Connecte-toi avec Discord pour confirmer ton identité et rejoindre le serveur.</p>
          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo: `/verify/${guildId}` });
            }}
          >
            <button type="submit" style={buttonStyle}>
              Se connecter avec Discord
            </button>
          </form>
        </>
      ) : (
        <>
          <p style={{ color: "#a79ec2", maxWidth: 360 }}>
            Connecté en tant que <strong>{session.user.name}</strong>. Clique ci-dessous pour terminer ta
            vérification — le bot t&apos;attribuera le rôle vérifié sous quelques secondes.
          </p>
          <form action={submitWebVerificationAction.bind(null, guildId)}>
            <button type="submit" style={buttonStyle}>
              Confirmer ma vérification
            </button>
          </form>
        </>
      )}
    </main>
  );
}

const buttonStyle = {
  background: "#5865F2",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "12px 24px",
  fontSize: "1rem",
  cursor: "pointer",
} as const;
