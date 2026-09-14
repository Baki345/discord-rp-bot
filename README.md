# ULTRA RPBOT

Un framework RP Discord original (bot + dashboard web) — personnages,
économie, entreprises, métiers, véhicules, boutiques, et plus. Inspiré des
concepts génériques du genre RP Discord, code/architecture/UI entièrement
originaux.

Pour inviter le bot sur un serveur : `/invite` sur le dashboard déployé
(redirige directement vers l'écran d'autorisation Discord), ou construis
l'URL toi-même avec `DISCORD_CLIENT_ID` — voir
`apps/dashboard/src/invite/bot-invite-url.ts` pour le détail des
permissions demandées (jamais Administrateur : uniquement ce que chaque
fonctionnalité du bot utilise réellement).

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
docker compose up -d --build   # postgres + migration + bot + dashboard
```

Voir `docker-compose.yml` — un service `migrate` dédié exécute
`prisma migrate deploy` avant que `bot`/`dashboard` ne démarrent, donc
`docker compose up -d` seul suffit à chaque déploiement.

Le conteneur `dashboard` n'écoute que sur `127.0.0.1:${DASHBOARD_LOCAL_PORT}`
— il ne termine pas le TLS lui-même. Sur un VPS partagé avec d'autres sites,
un reverse proxy déjà en place au niveau du système (nginx, Caddy...) route
le domaine public vers ce port local. Exemple nginx (cert obtenu via
`certbot certonly --manual --preferred-challenges dns-01 -d <domaine>`,
en ajoutant le TXT `_acme-challenge.<domaine>` demandé chez ton hébergeur DNS) :

```nginx
server {
    listen 443 ssl;
    server_name rp.xultra.space;
    ssl_certificate /etc/letsencrypt/live/rp.xultra.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rp.xultra.space/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Créer l'application Discord (obligatoire avant le premier lancement)

1. https://discord.com/developers/applications → New Application
2. Onglet "Bot" → Reset Token → copier dans `DISCORD_BOT_TOKEN`
3. Onglet "OAuth2" → copier Client ID/Secret dans `DISCORD_CLIENT_ID`/
   `DISCORD_CLIENT_SECRET`, ajouter une Redirect URL correspondant à
   `DISCORD_REDIRECT_URI`
4. Générer un lien d'invitation (scopes `bot` + `applications.commands`)
   pour ajouter le bot à un serveur de test
5. Onglet "Bot" → section "Privileged Gateway Intents" → activer
   **Server Members Intent** et **Message Content Intent** (gratuit sous
   100 serveurs, sans validation Discord). Requis par la suite anti-raid :
   sans ça, la porte d'entrée / détection de raid d'arrivées (Server
   Members) et l'auto-modération par chaleur (Message Content) ne
   recevront aucun événement, même si tout le reste fonctionne.

Après chaque déploiement qui ajoute ou modifie des commandes slash,
il faut les (ré)enregistrer une fois :

```bash
# Sur un serveur précis, propagation immédiate :
pnpm --filter bot run deploy-commands -- --guild=<ID_DU_SERVEUR>
# Globalement (tous les serveurs, jusqu'à 1h de propagation) :
pnpm --filter bot run deploy-commands
```

En prod (Docker), lancer ça dans le conteneur `bot` : `docker compose exec bot pnpm --filter bot run deploy-commands -- --guild=<ID>`.

## Feuille de route

Trois phases, livrées en jalons indépendamment vérifiables, chacun avec sa
propre migration Prisma additive (jamais destructive) :

- **Phase 1** (M1-M9) — cœur RP : personnages, inventaire, économie,
  entreprises, métiers, véhicules, boutiques, permissions.
- **Phase 2** (M10-M19) — systèmes avancés : lieux, clés, activités,
  fabrication, permis/examens, sessions RP, braquages, drogues, racket/
  blanchiment, anti-AFK, bourse.
- **Phase 3** (M20-M32) — suite anti-raid/sécurité : modération (avec
  avertissements, escalade et appels), hiérarchie de staff (extra owners,
  trusted admins, clé de secours), routage des logs, quarantaine, porte
  d'entrée, détection de raid d'arrivées, vérification (bouton/modal/
  grille/web/instantané), auto-modération par chaleur, lockdown,
  anti-nuke, sauvegardes et mode panique, assistant de configuration et
  diagnostic. Commandes principales : `/mod`, `/securite`, `/lockdown`,
  `/rescue`, `/appel`, `/mes-sanctions`. Nécessite les deux intents
  privilégiés listés ci-dessus.
- **M33** — panneau global (`/admin` sur le dashboard) réservé à
  l'opérateur du bot (liste `SUPER_ADMIN_DISCORD_IDS` dans `.env`,
  distincte du propriétaire Discord de chaque serveur) : statistiques
  tous serveurs confondus et suspension d'un serveur (le bot refuse
  alors ses commandes sans le quitter).
- **Phase 4** (M34-M44) — suite engagement/support : panneau global
  enrichi (recherche, tri, changement de plan premium d'un serveur,
  activité récente tous serveurs confondus), système de tickets
  (panneaux, catégories, formulaires, claim/unclaim/fermeture/transfert,
  demandes de salon vocal, limites par membre, fermeture automatique
  d'inactivité, transcripts signés HMAC et vérifiables), candidatures de
  staff (DM séquentielles, revue par rôle), un salon de "jail" visible en
  plus de la quarantaine existante, système de niveaux (XP textuel/vocal,
  cartes de rang en image générée, classement, rôles de récompense),
  commandes d'interaction RP à réactions (câlin, bisou, ...) avec
  statistiques, un constructeur de messages visuel (embeds + boutons-lien,
  aperçu en direct, import/export JSON, envoi via `/message envoyer`
  éventuellement par webhook), et des permissions de commandes avancées
  (rôles autorisés/refusés, salons autorisés, cooldown, par-dessus les
  rôles RP de la Phase 1). Commandes principales : `/ticket`,
  `/candidature`, `/candidatures`, `/niveau`, `/classement`,
  `/interaction`, `/message`.
