# Guide d'utilisation — ULTRA RPBOT

Ce guide explique **comment utiliser** chaque commande Discord et chaque page du
dashboard. Pour l'installation/déploiement technique, voir le [README](./README.md).

- Les commandes marquées **(staff)** demandent une permission RP déléguée ou
  un rôle Discord habilité — voir [Permissions](#permissions--qui-peut-faire-quoi).
- Les commandes marquées **(admin)** demandent d'être Administrateur Discord
  sur le serveur (ou super-admin de sécurité — voir plus bas).
- `*` après un paramètre = obligatoire. Les autres sont optionnels.
- Toutes les commandes ont l'autocomplétion Discord : tape `/` et le nom, les
  choix (personnages, entreprises, véhicules...) apparaissent automatiquement.

## Sommaire

1. [Démarrage rapide](#démarrage-rapide)
2. [Jeu de rôle](#jeu-de-rôle)
3. [Économie avancée & criminalité](#économie-avancée--criminalité)
4. [Modération & sécurité](#modération--sécurité)
5. [Engagement](#engagement)
6. [Configuration générale](#configuration-générale--config)
7. [Le dashboard web](#le-dashboard-web)
8. [Panneau opérateur (admin global)](#panneau-opérateur-admin-global)
9. [Permissions — qui peut faire quoi](#permissions--qui-peut-faire-quoi)
10. [FAQ / bon à savoir](#faq--bon-à-savoir)

---

## Démarrage rapide

1. **Inviter le bot** : depuis le dashboard (bouton « Inviter ULTRA RPBOT » sur
   la page de connexion ou le sélecteur de serveurs), ou directement via le
   lien `https://<ton-domaine>/invite`.
2. **Initialiser le serveur** : une fois le bot sur ton serveur, lance
   `/securite setup` (assistant rapide : rôle de quarantaine + salon de logs +
   salon principal) puis `/config setup` (initialise la configuration RP).
3. **Se connecter au dashboard** : va sur le dashboard, connecte-toi avec
   Discord — tu verras tous les serveurs où tu es administrateur ET où le bot
   est installé.
4. **Créer ton premier personnage** : `/personnage create`.
5. Configure le reste au fur et à mesure — chaque système a sa propre
   commande `setup`/`salon-*` et sa propre page dashboard, décrites ci-dessous.

---

## Jeu de rôle

### Personnages — `/personnage`

Chaque joueur peut avoir plusieurs personnages ; un seul est « actif » à la
fois (c'est celui que toutes les autres commandes RP utilisent).

- `/personnage create` — crée un nouveau personnage (ouvre un formulaire).
- `/personnage list` — liste tes personnages.
- `/personnage info <personnage>` — fiche complète d'un personnage.
- `/personnage switch <personnage>` — change ton personnage actif.
- `/personnage delete <personnage>` — supprime un personnage (confirmation demandée).

### Argent — `/economie`, `/banque`

- `/economie solde` — ton liquide + ton solde bancaire.
- `/economie payer <joueur> <montant> [raison]` — paiement en liquide, de la main à la main.
- `/economie historique` — tes 10 dernières transactions.
- `/banque deposer <montant>` — liquide → banque.
- `/banque retirer <montant>` — banque → liquide.

*Pourquoi séparer liquide et banque ?* Le liquide peut être volé lors d'un
braquage ; l'argent en banque non. C'est la base du RP économique du framework.

### Entreprises & métiers — `/entreprise`, `/metier`, `/service`

- `/metier postuler <metier>` / `/metier demissionner` / `/metier info [metier]`
  — rejoindre/quitter un métier, voir les infos.
- `/service prise-de-service` / `/service fin-de-service` — pointer en début/fin
  de service (active le gain de salaire pour les métiers qui en dépendent).
- `/entreprise creer <nom> [description]` — fonde une entreprise (tu en deviens propriétaire).
- `/entreprise employes <entreprise>` — liste les employés.
- `/entreprise embaucher <entreprise> <joueur>` / `licencier` — gérer le personnel (propriétaire).
- `/entreprise treso <entreprise>` — voir la trésorerie.
- `/entreprise facade-blanchiment <entreprise> <actif>` — active/désactive
  cette entreprise comme façade de blanchiment (voir plus bas).
- `/entreprise coter <entreprise> <actions> <prix-initial>` — introduit
  l'entreprise en bourse (propriétaire uniquement).

Les métiers/entreprises se créent d'abord côté staff dans le dashboard
(page **Entreprises**), puis les joueurs postulent/rejoignent en jeu.

### Véhicules & clés — `/vehicule`, `/cle`

- `/vehicule acheter <modele> <plaque> <paiement>` — achat cash ou banque.
- `/vehicule vendre <vehicule>` / `garage` / `info <vehicule>` — gestion classique.
- `/vehicule utiliser <vehicule> <prendre|garer>` — prendre le volant ou garer.
- `/cle vehicule donner|retirer <vehicule> <joueur>` — partager l'accès à un
  véhicule sans en céder la propriété (utile pour un(e) conjoint(e) RP, un
  collègue d'entreprise...).
- `/cle lieu donner|retirer <lieu> <joueur>` — même principe pour un lieu
  (appartement, planque...).

### Boutiques & objets — `/boutique`, `/inventaire`

- `/boutique voir <boutique>` — catalogue.
- `/boutique acheter|vendre <boutique> <article> <quantite>`.
- `/inventaire voir` — ton inventaire.
- `/inventaire utiliser <article>` — consomme un objet (effet défini par le staff).
- `/inventaire donner <joueur> <article> <quantite>` — transfert direct entre joueurs.
- `/inventaire jeter <article> <quantite>`.

Les boutiques et les objets eux-mêmes (effets, prix, stock) se créent dans le
dashboard, pages **Objets** et **Boutiques** (l'« Item Builder »).

### Lieux — `/lieu`

- `/lieu creer <nom> [categorie] [description]` **(staff)** — un lieu RP
  (appartement, commerce, planque...).
- `/lieu liste` / `/lieu info <lieu>` — consultation.
- `/lieu entrer <lieu>` — tenter d'y entrer (accès géré par clé, voir `/cle`).

### Activités & fabrication — `/activite`, `/craft`

- `/activite creer <cle> <nom> [recharge] [recompense-min] [recompense-max]`
  **(staff)** — active de type pêche/mine/livraison avec cooldown et gains
  aléatoires dans une fourchette.
- `/activite liste` / `/activite tenter <activite>` — jouer.
- `/craft liste` — recettes disponibles (définies dans le dashboard, page **Fabrication**).
- `/craft fabriquer <recette>` — fabrique un objet à partir des ingrédients requis.

### Permis — `/permis`

- `/permis creer <cle> <nom> [seuil-reussite]` **(staff)** — nouveau permis
  (conduite, arme...), seuil de réussite en % par défaut 80.
- `/permis question-ajouter <permis> <question> <choix-a> <choix-b> <bonne-reponse> [choix-c] [choix-d]`
  **(staff)** — ajoute une question QCM (2 à 4 choix).
- `/permis liste` — permis disponibles.
- `/permis passer <permis>` — passer l'examen (questions posées une par une en DM/éphémère).

### Sessions RP — `/session`

- `/session start` / `/session stop` **(staff)** — ouvre/ferme une session RP
  officielle sur le serveur.
- `/session info` — voir si une session est en cours.

Si `requireActiveSession` est activé dans les paramètres du serveur
(dashboard, page **Paramètres**), certaines actions RP peuvent être bloquées
hors session — pratique pour cadrer le RP à des horaires précis.

---

## Économie avancée & criminalité

### Braquages — `/braquage`

- `/braquage cibles` — liste des cibles configurées (dashboard).
- `/braquage tenter <cible>` — tente le braquage (risque d'échec/d'alerte selon la config).

### Drogues — `/drogue`

- `/drogue catalogue` — substances disponibles.
- `/drogue produire <substance>` — production (cooldown, risque configurable).
- `/drogue vendre <substance> <quantite>`.

### Racket & blanchiment — `/racket`, `/blanchiment`

- `/racket collecter <entreprise>` — encaisse le racket dû par une entreprise
  (les entreprises doivent d'abord être soumises au racket côté staff).
- `/blanchiment laver <entreprise> <montant>` — blanchit du liquide via une
  entreprise-façade (l'entreprise doit avoir activé
  `/entreprise facade-blanchiment` au préalable). Une partie de l'argent est
  généralement perdue en commission — configurable dans le dashboard.

### Bourse — `/bourse`

- `/bourse liste` — entreprises cotées (via `/entreprise coter`).
- `/bourse acheter|vendre <entreprise> <quantite>` — trading d'actions.
- `/bourse portefeuille` — tes actions détenues.

Le cours évolue avec l'offre/demande simulée — page **Bourse** du dashboard
pour l'historique des cours.

---

## Modération & sécurité

### Modération de base — `/mod` **(staff)**

- `/mod warn <membre> [points] [raison]` — avertissement à points cumulables
  (voir l'escalade automatique plus bas).
- `/mod ban <membre|id> [raison] [purge_jours] [duree_jours] [dm]` — bannissement,
  peut cibler un ID (compte pas sur le serveur), purger les X derniers jours de
  messages (0-7), être temporaire (`duree_jours`), et prévenir la personne en DM avant.
- `/mod unban <id> [raison]`
- `/mod kick <membre> [raison]`
- `/mod timeout <membre> <minutes> [raison]` (max 40320 min = 28 jours) / `/mod untimeout <membre>`
- `/mod purge <nombre>` — supprime en masse (max 100) les derniers messages du salon.
- `/mod pseudo <membre>` — nettoie un pseudo (dehoist, caractères à problème).
- `/mod historique <membre>` — historique complet des sanctions.
- `/mod appel-liste` / `/mod appel-traiter <appel> <accepter|rejeter>` — traiter
  les appels de sanction (voir `/appel` côté joueur).

Aussi disponible en **clic droit sur un membre → Apps** : *Bannir*,
*Expulser*, *Timeout 10 min*.

### Hiérarchie de sécurité — `/securite staff`, `/securite cle-secours`, `/rescue`

Un niveau au-dessus des permissions RP classiques, pensé pour protéger le
serveur lui-même :

- `/securite staff extra-owner <membre>` **(propriétaire uniquement)** —
  ajoute un « extra owner » (quasi-équivalent au propriétaire pour la sécurité :
  mode panique, clé de secours...).
- `/securite staff trusted-admin <membre>` — ajoute un admin de confiance.
- `/securite staff retirer <membre>` / `/securite staff liste`.
- `/securite cle-secours generer` **(propriétaire)** — génère une clé à usage
  unique permettant de retrouver le statut extra owner si jamais tous les
  extra owners sont perdus (compte compromis, erreur...). **Note-la en lieu
  sûr, elle ne s'affiche qu'une fois.**
- `/rescue <cle>` — utilise cette clé pour se restaurer soi-même comme extra owner.

### Quarantaine / jail — `/securite quarantaine`

Isole un compte suspect (ou compromis) sans le bannir : ses rôles sont
retirés et remplacés par un rôle de quarantaine qui bloque l'accès à tous les
salons — sauf un « salon-jail » optionnel où il reste visible.

- `/securite quarantaine setup` — crée/rafraîchit le rôle de quarantaine sur
  tous les salons (à relancer si tu ajoutes de nouveaux salons).
- `/securite quarantaine mettre <membre> [raison]` — met en quarantaine
  (ses rôles précédents sont sauvegardés).
- `/securite quarantaine retirer <membre> [raison]` — sort de quarantaine et
  restaure ses rôles d'avant.
- `/securite quarantaine liste` — membres actuellement en quarantaine.
- `/securite quarantaine salon-jail [salon]` — définit un salon visible où un
  membre en quarantaine peut quand même parler (mode « prison » plutôt que
  silence total) ; vide pour désactiver.

### Porte d'entrée — `/config porte-entree`

Filtres appliqués **à l'arrivée** d'un nouveau membre, chacun avec sa propre
action (`LOG`, `TIMEOUT`, `KICK`, `BAN`, ou `OFF` pour désactiver) :

- `avatar` — pas de photo de profil.
- `age <minutes> [mp]` — compte plus jeune que X minutes (option DM pour
  prévenir la personne).
- `bot-verifie` — bot non vérifié par Discord.
- `bot-ajout [ids_autorises]` — ajout de bot par du staff non autorisé
  (liste blanche d'IDs Discord autorisés à en ajouter).
- `invitation` — pseudo contenant un lien d'invitation Discord.
- `suspect` — heuristique généraliste de compte suspect.
- `pseudo <motifs>` — liste noire de pseudos avec jokers (`*`), ex. `raid*, *xXx*`.

Page dashboard **Porte d'entrée** pour voir l'état de chaque filtre.

### Raid d'arrivées — `/config raid-arrivees`

Détecte une **vague** d'arrivées (contrairement à la porte d'entrée qui juge
chaque arrivée individuellement) :

- `actif`, `fenetre_secondes` (défaut 60), `min_arrivees` (défaut 5) — le
  seuil de déclenchement : X arrivées en Y secondes.
- `cible` : `ALL` (compte toutes les arrivées) ou `SUSPECT_ONLY` (ne compte
  que les comptes déjà signalés par les drapeaux ci-dessous).
- Drapeaux optionnels : `age_min_compte`, `drapeau_avatar`, `similarite_id`
  (comptes créés à des dates rapprochées — granularité jour/mois/adaptative),
  `min_correspondances` (nombre de drapeaux requis pour compter comme suspect).
- `action` — sanction appliquée aux comptes détectés (LOG/TIMEOUT/KICK/BAN).
- `role_alerte` — rôle pingé quand un raid est détecté.
- `fenetre_suivante_secondes` (défaut 300) — durée pendant laquelle toute
  nouvelle arrivée est automatiquement sanctionnée sans re-analyse (le raid
  est considéré actif).
- **`verrouillage_auto`** — en plus de sanctionner les comptes détectés,
  verrouille tout le serveur aux nouvelles arrivées (invitations coupées,
  chaque nouvel arrivant kické/banni) dès le déclenchement. **Ne se lève
  jamais tout seul** : une fois la situation confirmée sûre, un staff doit
  lancer `/lockdown fin`. Désactivé par défaut — c'est une réponse plus
  radicale que la sanction individuelle, à activer en connaissance de cause.

Lance la commande sans aucune option pour voir la configuration actuelle.

### Vérification — `/securite verification`

Oblige les nouveaux membres à confirmer qu'ils sont humains avant d'accéder
au serveur.

- `setup [actif] [mode] [cible] [role_verifie] [action_echec] [delai_minutes] [quarantaine_legacy]`
  — modes disponibles :
  - `BUTTON` — un bouton à cliquer.
  - `MODAL` — taper une phrase de confirmation.
  - `GRID_CAPTCHA` — cliquer la case différente des autres dans une grille de 9 emojis.
  - `WEB` — se vérifier depuis le dashboard (lien `/verify/<serveur>`).
  - `INSTANT` — rôle donné immédiatement au clic (pas de réel défi — pour un
    serveur à faible risque qui veut juste un rôle "membre" explicite).
- `panneau` — poste le panneau de vérification (bouton) dans le salon courant.
- `manuel <membre>` — attribue le rôle vérifié manuellement, sans passer par
  un défi (cas particulier, invité par un membre de confiance...).

`action_echec` (KICK/BAN/NONE) s'applique si le délai (`delai_minutes`) est
dépassé sans vérification réussie.

### Auto-modération — `/securite automod`

Système de « chaleur » : chaque message à problème (mot interdit, domaine
interdit, spam...) augmente un compteur par membre, qui redescend avec le
temps. Passé un seuil, sanction automatique.

- `setup [actif] [chaleur_max] [decroissance_par_seconde] [strikes_avant_cap] [timeout_normal_minutes] [timeout_cap_minutes] [reset_apres_timeout]`
  — `chaleur_max` déclenche un premier timeout ; après `strikes_avant_cap`
  déclenchements, le timeout passe au niveau « cap » (plus long).
- `mot-ajouter <mot>` / `mot-retirer <mot>` — liste noire de mots/expressions.
- `domaine-ajouter <domaine>` / `domaine-retirer <domaine>` — liste noire de domaines dans les liens postés.

`/securite salon-partenariat <salon>` exempte un salon entier (ex. un salon
de partenariats où des liens externes sont normaux) ;
`/securite salons-partenariat-liste` pour les voir tous.

### Anti-nuke — `/securite anti-nuke`

Surveille en temps réel les actions destructrices (suppression de
salons/rôles, bannissements en masse, création de webhooks...) via le
journal d'audit Discord, et réagit avant qu'un compte compromis ne fasse trop
de dégâts.

- `setup [actif] [mode_strict] [seuil_par_minute] [seuil_par_heure] [quarantaine_auto]`
  — au-delà du seuil (par défaut 5/min ou 15/heure), l'auteur est mis en
  quarantaine (si `quarantaine_auto`) et un incident est enregistré. Le
  **mode strict** ajoute la surveillance des modifications de rôles, de
  permissions de salons et des changements de paramètres serveur (des
  actions plus sujettes aux faux positifs qu'une suppression pure, mais
  qu'un compte compromis utilise aussi pour nuire sans rien supprimer).
- `whitelist-utilisateur <membre> [retirer]` — exempte un utilisateur ou bot
  de confiance (ex. un autre bot légitime qui fait beaucoup d'actions).
- `whitelist-categorie <categorie> [retirer]` — exempte une catégorie entière
  (ex. la catégorie des tickets, où les salons se créent/suppriment souvent).

Deux réponses **toujours immédiates**, indépendantes des seuils :
toute tentative de supprimer/modifier le rôle de quarantaine, toute
modification du rôle `@everyone`, toute tentative de retirer le rôle de
quarantaine à quelqu'un qui y est activement soumis, et **l'ajout de tout
nouveau bot non whitelisté** (le bot ajouté est expulsé immédiatement, en plus
de la réponse habituelle sur la personne qui l'a autorisé).

Une **vague** (plusieurs auteurs *distincts* qui déclenchent chacun
l'anti-nuke dans une même courte fenêtre) escalade automatiquement en **mode
panique**.

### Sauvegardes — `/securite backup`

Photographie la structure du serveur (salons, catégories, rôles,
permissions — jamais les messages ni qui a quel rôle) pour pouvoir la
restaurer après une attaque.

- `creer [nom]` — sauvegarde immédiate.
- `liste` — sauvegardes disponibles.
- `charger <id>` — restaure (recrée ce qui manque, ajuste ce qui diffère).
- `supprimer <id>` / `effacer` (tout supprimer).

Le mode panique peut restaurer automatiquement la dernière sauvegarde — voir
ci-dessous.

### Mode panique — `/securite panic`

Le niveau d'urgence maximal : verrouillage total déclenché automatiquement
par une vague de destructions détectée par l'anti-nuke, ou manuellement.

- `setup [actif] [seuil_auteurs] [fenetre_secondes] [verrouillage_auto] [restauration_auto] [role_alerte]`
  — `seuil_auteurs` (min 2) = nombre de comptes *distincts* déclenchant
  l'anti-nuke dans `fenetre_secondes` pour activer le mode panique.
  `verrouillage_auto` verrouille tout le serveur à l'activation ;
  `restauration_auto` restaure en plus la dernière sauvegarde.
- `activer` **(propriétaire/extra owner uniquement)** — déclenchement manuel.
- `fin` **(propriétaire/extra owner uniquement)** — lève le mode panique.
- `statut` — état actuel.

### Verrouillage d'urgence — `/lockdown` **(admin)**

L'outil manuel derrière le mode panique et le raid d'arrivées automatique —
utilisable directement à tout moment :

- `salon [salon] [cache]` — verrouille un salon (celui du message par
  défaut) ; `cache` le rend aussi invisible.
- `salons <salons mentionnés> [cache]` — plusieurs salons d'un coup.
- `serveur [cache] [kick_nouveaux] [ban_nouveaux] [pause_invitations]` —
  verrouille tout : chaque salon, les permissions dangereuses de chaque rôle
  sont retirées temporairement, et les nouvelles arrivées sont bloquées si
  `kick_nouveaux`/`ban_nouveaux` est activé.
- `fin` — lève le verrouillage et restaure exactement l'état précédent
  (permissions de salons et de rôles).
- `statut` — voir si un lockdown est actif et ce qu'il couvre.

**Un seul lockdown actif à la fois** — `/lockdown fin` avant d'en relancer un autre.

### Avertissements & appels

- `/mod warn` (voir plus haut) attribue des points.
- `/securite avertissements actif <actif>` — active/désactive l'escalade automatique.
- `/securite avertissements ajouter-seuil <points> <action> [timeout_minutes]`
  — ex. 5 points → TIMEOUT 60 min, 10 points → BAN.
- `/securite avertissements retirer-seuil <points>` / `liste-seuils`.
- Côté joueur : `/mes-sanctions` (voir ses propres sanctions) puis
  `/appel <cas> <message>` pour contester — traité via `/mod appel-liste`
  et `/mod appel-traiter`.

### Diagnostic — `/securite diagnostic`

Vérifie la configuration de sécurité (rôle de quarantaine présent et bien
positionné, position du rôle du bot dans la hiérarchie, logs configurés...)
et signale ce qui manque ou est mal réglé. À lancer après toute
réorganisation de rôles.

---

## Engagement

### Tickets — `/ticket`

- `/ticket panneau creer <salon> <titre> [description]` **(staff)** — crée un
  panneau (message avec un menu déroulant de catégories).
- `/ticket panneau publier <panneau>` — poste/republie le panneau dans son salon.
- `/ticket categorie creer <nom> [emoji] [panneau] [categorie-discord] [role-support]`
  **(staff)** — une catégorie de ticket ; d'autres réglages (formulaire,
  rôles claim/fermeture, limite par membre, fermeture auto) se font dans le
  dashboard, page **Tickets**.
- `/ticket liste` — tickets actuellement ouverts.
- Une fois un ticket ouvert (par un joueur via le menu du panneau), les
  boutons *Claim*/*Unclaim*/*Fermer*/*Transférer*/*Demander un salon vocal*
  apparaissent directement dans le salon du ticket.
- À la fermeture, un **transcript signé** (HMAC) est généré — vérifiable
  depuis le dashboard, page **Tickets → Historique**, pour prouver qu'il n'a
  pas été modifié après coup.

### Candidatures — `/candidature`, `/candidatures`

- `/candidatures categorie-creer <nom> [salon-resultat] [role-revieweur]`
  **(staff)** — crée une catégorie (ex. « Modérateur »). Les questions du
  formulaire se configurent dans le dashboard, page **Candidatures**.
- `/candidature <categorie>` — un joueur postule : le bot lui envoie les
  questions une par une **en message privé**.
- `/candidatures liste` — nombre de candidatures en attente.
- Un reviewer (rôle configuré) voit apparaître des boutons
  *Accepter*/*Refuser* dans le salon résultat.

### Niveaux — `/niveau`, `/classement`

- `/niveau voir [membre]` — niveau et progression en texte.
- `/niveau carte [membre]` — carte de rang **en image** (avatar, niveau,
  barre de progression), générée à la volée.
- `/niveau carte-fond [url]` — personnalise le fond de sa propre carte
  (vide = revenir au fond par défaut du serveur).
- `/classement` — top 10 du serveur.
- XP gagnée en discutant (avec cooldown anti-spam) et en vocal ; réglages
  (taux d'XP, rôles de récompense par niveau, annonce de passage de niveau —
  texte et/ou salon dédié) dans le dashboard, page **Niveaux**.

### Musique — `/musique`

- `/musique jouer <requete>` — lien direct (SoundCloud, Bandcamp, Twitch,
  Vimeo, ou tout flux audio HTTP direct) ou recherche par mots-clés
  (cherche automatiquement sur SoundCloud). Rejoint ton salon vocal actuel.
- `/musique pause` / `reprendre` / `passer` / `stop` — contrôles (peuvent être
  restreints à un rôle DJ, voir dashboard).
- `/musique file` — file d'attente actuelle.
- `/musique volume <0-150>`.
- Un message « en cours de lecture » avec boutons (pause/passer/stop/boucle)
  est posté automatiquement à chaque piste. Pas de YouTube — délibérément,
  pour la stabilité (voir dashboard, page **Musique**, pour le détail).

### Interactions RP — `/interaction`

- `/interaction faire <action> <cible>` — câlin, bisou, tape, caresse,
  cajole, chatouille, pousse, tape m'cinq — poste un embed avec un GIF et un
  bouton « renvoyer » pour que la cible réponde en un clic.
- `/interaction stats [membre]` — compteurs donnés/reçus par action.

### Constructeur de messages — `/message`

- Le message (texte + embed + boutons-lien) se construit visuellement dans
  le dashboard, page **Messages**, avec aperçu en direct.
- `/message envoyer <nom> [salon] [via-webhook]` — poste un modèle
  enregistré ; `via-webhook` l'envoie sous une identité personnalisée
  (nom/avatar du webhook) plutôt que comme le bot.

---

## Configuration générale — `/config` **(admin)**

- `/config setup` — initialise (ou réinitialise) la configuration RP du serveur.
- `/config salon-logs <type> [salon]` — route un type de log
  (`audit`/`economy`/`moderation`) vers un salon (vide pour désactiver).
- `/config salon-securite <categorie> [salon]` — même chose pour les
  catégories de logs sécurité (`GENERAL`, `MODERATION`, `APPEALS`,
  `AUTOMOD`, `ANTI_NUKE`, `VERIFICATION`, `JOIN_GATE`, `JOIN_RAID`, `PANIC`) —
  permet de séparer ces logs du reste.
- `/config role-permission <attribuer|retirer> <joueur> <role>` — délègue (ou
  retire) un rôle RP (permission en jeu, distincte des permissions Discord)
  à un membre. Les rôles RP eux-mêmes se créent dans le dashboard, page
  **Permissions**.
- `/config salon-afk [salon] [minutes]` — salon vocal anti-AFK : les membres
  qui y restent inactifs n'accumulent pas d'XP ni de salaire vocal (défaut
  20 minutes).
- `/config porte-entree ...` et `/config raid-arrivees ...` — voir la section
  [Modération & sécurité](#modération--sécurité).

---

## Le dashboard web

Connecte-toi avec Discord ; tu verras chaque serveur où tu es administrateur
ET où le bot est installé. Menu latéral organisé en catégories :

**Jeu de rôle** — Personnages, Entreprises, Véhicules, Objets, Lieux,
Activités, Fabrication, Permis, Sessions : consultation et création en masse
(plus rapide qu'en Discord pour du contenu volumineux — ex. importer tout un
catalogue de boutique).

**Économie** — Économie (transactions), Bourse (cours des actions),
Braquages, Drogues : réglages des taux/probabilités et historique.

**Engagement** — Tickets (panneaux, catégories, formulaires, historique),
Candidatures (catégories, revue), Niveaux (taux d'XP, récompenses,
annonces), Musique (rôle DJ, salons autorisés, volume), Messages
(constructeur visuel).

**Modération & sécurité** — Modération (historique), Appels, Staff sécurité
(hiérarchie extra owner/trusted admin), Quarantaine, Porte d'entrée, Raid
d'arrivées (incidents détectés), Vérification (tentatives web), Auto-modération,
Lockdown, Anti-nuke (incidents), Sauvegardes, Mode panique.

**Administration** — Permissions (rôles RP), Permissions de commandes
(restreindre `/commande` par rôle/salon/cooldown — au-dessus des rôles RP),
Journal (audit log complet, filtrable), Routage des logs, Diagnostic,
Paramètres (réglages généraux : argent de départ, session RP requise ou non...).

La plupart des pages affichent la config actuelle (souvent réglée depuis
Discord) et certaines permettent de l'éditer directement — les deux restent
toujours synchronisées, peu importe où tu changes quoi.

---

## Panneau opérateur (admin global)

Réservé à l'opérateur du bot (liste `SUPER_ADMIN_DISCORD_IDS` dans `.env` —
distincte du propriétaire Discord de chaque serveur individuel), accessible
sur `/admin` :

- Liste de tous les serveurs utilisant le bot, avec recherche/tri.
- Changer le **plan** (Gratuit/Premium/Premium+) d'un serveur directement.
- Suspendre un serveur (le bot refuse ses commandes sans le quitter).
- Activité récente tous serveurs confondus.

---

## Permissions — qui peut faire quoi

Trois couches indépendantes, du plus large au plus fin :

1. **Administrateur Discord** — passe toujours partout, sur tout, quel que
   soit le réglage. C'est le niveau attendu pour configurer le serveur.
2. **Rôles RP** (`/config role-permission`, dashboard page **Permissions**) —
   des permissions déléguées *en jeu* (ex. « peut créer des objets », « peut
   voir les logs économiques ») sans donner de vraies permissions Discord.
   Vérifiées à l'intérieur de chaque commande RP.
3. **Permissions de commandes** (dashboard page **Permissions de
   commandes**) — une couche générique par-dessus, vérifiée **avant** même
   que la commande ne s'exécute : restreint qui peut lancer `/commande` (rôle
   autorisé/refusé, salon autorisé, cooldown). Un administrateur Discord
   passe toujours, même avec une règle configurée.

La **hiérarchie de sécurité** (`/securite staff`) est encore différente :
propriétaire/extra owner/trusted admin ne concernent que les actions les
plus sensibles (mode panique, clé de secours) — indépendant des rôles RP et
des permissions de commandes.

---

## FAQ / bon à savoir

**Le bot ne répond pas à une commande de sécurité.** Vérifie que son propre
rôle Discord est bien positionné *au-dessus* des rôles qu'il doit gérer
(quarantaine, lockdown...) — `/securite diagnostic` le signale directement.

**Un lockdown/mode panique reste actif après une fausse alerte.**
`/lockdown fin` (ou `/securite panic fin` pour le mode panique) restaure
tout exactement à l'état d'avant — aucun des deux ne se lève jamais tout
seul, c'est volontaire pour éviter qu'il se relève en pleine attaque encore active.

**Un membre légitime s'est fait mettre en quarantaine par erreur.**
`/securite quarantaine retirer <membre>` restaure ses rôles précédents tels
qu'ils étaient au moment de la mise en quarantaine.

**J'ai perdu tous mes extra owners (comptes supprimés/compromis).**
`/rescue <clé>` avec la clé générée par `/securite cle-secours generer` — à
générer et conserver en lieu sûr *avant* d'en avoir besoin.

**La musique ne fonctionne pas du tout.** Le nœud audio (Lavalink) doit être
configuré côté serveur (`LAVALINK_PASSWORD` dans `.env`) — sans ça,
`/musique` répond que la fonctionnalité n'est pas disponible plutôt que de planter.

**Comment renommer/personnaliser l'apparence du bot ?**
`pnpm --filter bot run rebrand` (une fois, depuis le serveur) — voir le README.
