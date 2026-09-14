export interface NavItem {
  href: string;
  label: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const OVERVIEW_ITEM: NavItem = { href: "", label: "Vue d'ensemble" };

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Jeu de rôle",
    items: [
      { href: "/characters", label: "Personnages" },
      { href: "/companies", label: "Entreprises" },
      { href: "/vehicles", label: "Véhicules" },
      { href: "/items", label: "Objets" },
      { href: "/places", label: "Lieux" },
      { href: "/activities", label: "Activités" },
      { href: "/crafting", label: "Fabrication" },
      { href: "/licenses", label: "Permis" },
      { href: "/sessions", label: "Sessions" },
    ],
  },
  {
    label: "Économie",
    items: [
      { href: "/economy", label: "Économie" },
      { href: "/market", label: "Bourse" },
      { href: "/robbery", label: "Braquages" },
      { href: "/drugs", label: "Drogues" },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/tickets", label: "Tickets" },
      { href: "/candidatures", label: "Candidatures" },
      { href: "/leveling", label: "Niveaux" },
      { href: "/message-builder", label: "Messages" },
    ],
  },
  {
    label: "Modération & sécurité",
    items: [
      { href: "/moderation", label: "Modération" },
      { href: "/appeals", label: "Appels" },
      { href: "/staff", label: "Staff sécurité" },
      { href: "/quarantine", label: "Quarantaine" },
      { href: "/join-gate", label: "Porte d'entrée" },
      { href: "/join-raid", label: "Raid d'arrivées" },
      { href: "/verification", label: "Vérification" },
      { href: "/automod", label: "Auto-modération" },
      { href: "/lockdown", label: "Lockdown" },
      { href: "/anti-nuke", label: "Anti-nuke" },
      { href: "/backups", label: "Sauvegardes" },
      { href: "/panic", label: "Mode panique" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/permissions", label: "Permissions" },
      { href: "/command-permissions", label: "Permissions de commandes" },
      { href: "/logs", label: "Journal" },
      { href: "/log-routing", label: "Routage des logs" },
      { href: "/diagnostic", label: "Diagnostic" },
      { href: "/settings", label: "Paramètres" },
    ],
  },
];

/** Finds the nav label matching a pathname, for the topbar's page title. */
export function findPageLabel(pathname: string, guildId: string): string {
  const base = `/g/${guildId}`;
  if (pathname === base) return OVERVIEW_ITEM.label;

  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const href = `${base}${item.href}`;
      if (pathname === href || pathname.startsWith(`${href}/`)) return item.label;
    }
  }
  return "Dashboard";
}
