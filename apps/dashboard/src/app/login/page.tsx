import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth/auth.config";
import { getBotInviteUrl } from "@/invite/bot-invite-url";
import { FeatureSlideshow } from "./FeatureSlideshow";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  const inviteUrl = getBotInviteUrl();

  return (
    <main className="landing">
      <div className="landing-hero">
        <img
          src="/logo.png"
          alt="ULTRA RPBOT"
          width={64}
          height={64}
          style={{ borderRadius: 16, boxShadow: "0 0 6px var(--neon-glow-strong), 0 0 34px var(--neon-glow-soft)" }}
        />
        <h1 style={{ fontSize: "1.8rem" }}>ULTRA RPBOT</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Un framework de jeu de rôle Discord complet — tickets, niveaux, sécurité anti-raid, musique et bien plus,
          entièrement personnalisable depuis un dashboard.
        </p>

        <div className="landing-cta-row">
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
            <a href={inviteUrl} className="neon-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              + Inviter ULTRA RPBOT
            </a>
          )}
        </div>
      </div>

      <FeatureSlideshow />
    </main>
  );
}
