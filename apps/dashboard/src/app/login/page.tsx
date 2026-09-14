import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth/auth.config";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

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
      <span
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--neon)",
          color: "var(--bg)",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.1rem",
          boxShadow: "0 0 6px var(--neon-glow-strong), 0 0 34px var(--neon-glow-soft)",
        }}
      >
        RP
      </span>
      <h1 style={{ fontSize: "1.5rem" }}>Dashboard RP</h1>
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
    </main>
  );
}
