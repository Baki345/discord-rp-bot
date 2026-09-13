# Discord RP Bot Framework

Un framework RP Discord original (bot + dashboard web) — personnages,
économie, entreprises, métiers, véhicules, boutiques, et plus. Inspiré des
concepts génériques du genre RP Discord, code/architecture/UI entièrement
originaux.

## Stack

TypeScript · discord.js v14 (bot, slash commands) · Next.js App Router
(dashboard) · PostgreSQL + Prisma (données) · pnpm workspaces + Turborepo
(monorepo) · Auth.js (Discord OAuth2, dashboard) · Zod (validation).

## Structure

```
apps/bot/         Bot Discord (slash commands, événements)
apps/dashboard/   Dashboard web (Next.js)
packages/core/    Logique métier partagée — la SEULE source de vérité pour
                  chaque action (créer un personnage, déposer de l'argent...),
                  appelée à l'identique par le bot ET le dashboard.
packages/database/ Schéma Prisma + client + seed
packages/config/  Variables d'environnement validées (zod) + constantes partagées
packages/ui/      Composants du dashboard
```

Voir `packages/core/src/services/*.service.ts` pour le détail du pattern
(validation zod → vérification de permission → transaction DB → journal
d'audit → retour typé) — c'est le même pour toutes les actions.

## Démarrer en local

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d      # Postgres + Adminer (localhost:8080)
cp .env.example .env                                 # puis remplir DATABASE_URL et le reste
pnpm --filter @discord-rp/database exec prisma migrate dev --name init
pnpm db:seed
pnpm dev                                              # bot + dashboard en parallèle (Turborepo)
```

Pour enregistrer les commandes slash sur un serveur de test (rapide, pas de
propagation globale à attendre) :

```bash
pnpm --filter bot run deploy-commands -- --guild=<ID_DU_SERVEUR_DE_TEST>
```

## Déploiement (VPS auto-hébergé)

```bash
cp .env.example .env    # remplir toutes les valeurs de production
docker compose up -d    # postgres + migration + bot + dashboard + caddy (TLS)
```

Voir `docker-compose.yml` — un service `migrate` dédié exécute
`prisma migrate deploy` avant que `bot`/`dashboard` ne démarrent, donc
`docker compose up -d` seul suffit à chaque déploiement.

## Créer l'application Discord (obligatoire avant le premier lancement)

1. https://discord.com/developers/applications → New Application
2. Onglet "Bot" → Reset Token → copier dans `DISCORD_BOT_TOKEN`
3. Onglet "OAuth2" → copier Client ID/Secret dans `DISCORD_CLIENT_ID`/
   `DISCORD_CLIENT_SECRET`, ajouter une Redirect URL correspondant à
   `DISCORD_REDIRECT_URI`
4. Générer un lien d'invitation (scopes `bot` + `applications.commands`)
   pour ajouter le bot à un serveur de test

## Feuille de route

Voir le plan d'architecture complet (schéma, découpage des packages,
jalons) — livré en 9 étapes indépendamment vérifiables couvrant le cœur du
RP (personnages, inventaire, économie, entreprises, métiers, véhicules,
boutiques, permissions). Les systèmes avancés (braquages, drogues, bourse,
examens, sessions, anti-AFK...) viennent après, en s'appuyant sur le même
schéma sans migration destructive.
