import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth/auth.config";
import { getBotInviteUrl } from "@/invite/bot-invite-url";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  const inviteUrl = getBotInviteUrl();

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: "0 20px",
        textAlign: "center",
      }}
    >
      <img
        src="/logo.png"
        alt="ULTRA RPBOT"
        width={64}
        height={64}
        style={{ borderRadius: 16, boxShadow: "0 0 6px var(--neon-glow-strong), 0 0 34px var(--neon-glow-soft)" }}
      />
      <h1 style={{ fontSize: "1.6rem" }}>ULTRA RPBOT</h1>
      <p style={{ color: "var(--text-muted)", maxWidth: 360 }}>
        Connecte-toi avec Discord pour configurer les serveurs où tu es administrateur.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("discord", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          style={{
            background: "#5865F2",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "12px 24px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Se connecter avec Discord
        </button>
      </form>
      {inviteUrl && (
        <a href={inviteUrl} style={{ color: "var(--text-faint)", fontSize: "0.8rem", marginTop: 8 }}>
          Pas encore le bot sur ton serveur ? Invite ULTRA RPBOT →
        </a>
      )}
    </main>
  );
}
