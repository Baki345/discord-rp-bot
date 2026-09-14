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
        gap: 24,
      }}
    >
      <h1 style={{ fontSize: "1.4rem" }}>Dashboard RP</h1>
      <p style={{ color: "#a79ec2", maxWidth: 360, textAlign: "center" }}>
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
            cursor: "pointer",
          }}
        >
          Se connecter avec Discord
        </button>
      </form>
    </main>
  );
}
