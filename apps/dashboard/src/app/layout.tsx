import type { ReactNode } from "react";
import { Chakra_Petch, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display-family",
});
const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body-family",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-family",
});

export const metadata = {
  title: "Dashboard RP",
  description: "Configure ton serveur RP Discord sans toucher aux commandes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
