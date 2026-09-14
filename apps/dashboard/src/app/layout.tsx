import type { ReactNode } from "react";

export const metadata = {
  title: "Dashboard RP",
  description: "Configure ton serveur RP Discord sans toucher aux commandes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0d0814", color: "#f4f2fa" }}>
        {children}
      </body>
    </html>
  );
}
