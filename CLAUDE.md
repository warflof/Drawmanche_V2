# Le Drawmanche — CLAUDE.md

## Projet
Le Drawmanche — concours de dessin hebdomadaire communautaire. Une manche
par semaine : thème imposé, une semaine pour soumettre UN dessin, vote pour
les dessins des AUTRES uniquement, gagnant révélé le dimanche (possiblement
en stream Twitch). Dessins anonymes pendant le vote, auteurs révélés à la
clôture. IA générative bannie.

## Stack
Vue 3 (Vite) + Pinia + vue-router. Supabase (Postgres, Auth OAuth Google,
Storage). UI en français, style sobre (l'UI/UX soignée est un chantier
ultérieur — ne pas sur-styliser pour l'instant).

## Décisions d'architecture (NE PAS casser)
- Anonymat : le front lit la VUE galerie_manche, JAMAIS la table submissions.
  La vue ne renvoie auteur / pleine réso / compteurs que si manche = 'closed'.
- Intégrité du vote, SACRÉE : 1 humain = 1 voix. UNIQUE(manche_id, voter_id)
  + policy RLS interdisant de voter pour sa propre œuvre. Jamais de votes
  payants ou multiples.
- 1 soumission par (manche_id, user_id), UNIQUE. Soumission DÉFINITIVE.
- Compteurs de votes CACHÉS pendant la manche, révélés à la clôture.
- Ordre d'affichage MÉLANGÉ par session (Fisher-Yates, graine stable).
- Fichiers nommés par submission_id UNIQUEMENT, jamais user_id (anonymat).
- 2 buckets : dessins-full (PRIVÉ) et dessins-display (PUBLIC, basse réso +
  watermark généré côté client). Tout affichage public (hero, fresque,
  galerie) utilise image_display_path via dessins-display. La pleine réso
  (dessins-full) est réservée au print/merch du gagnant.
- Cycle piloté manuellement par l'admin : RPC cloturer_manche() puis
  demarrer_manche(). Réservées à profiles.is_admin.
- Égalité de votes : départage ALÉATOIRE (random() dans cloturer_manche),
  assumé et annoncé au reveal. Il y a TOUJOURS exactement un gagnant.
- Conservation : les non-gagnants sont PURGÉS au démarrage de la manche
  suivante (base + storage). Le gagnant est conservé 1 an (winner_until),
  pour la fresque/print. Aucun pouvoir de suppression côté utilisateur.
- Hero accueil : affiche le DERNIER gagnant en date existant (galerie_gagnants,
  1re ligne), en sautant les manches blanches. Le hero n'est masqué (v-if,
  pas CSS) QUE si galerie_gagnants est entièrement vide.

## Modèle de données
profiles (id→auth.users, username, avatar_url, is_admin) ; themes (label,
season, used) ; manches (numero, theme, status active/closed, starts_at,
ends_at, winner_submission_id, winner_until) ; submissions (manche_id,
user_id, image_full_path, image_display_path, status active/disqualified) ;
votes (manche_id, voter_id, submission_id).
Vues : galerie_manche (galerie d'une manche, anonyme tant que non clôturée) ;
galerie_gagnants (fresque : gagnants non expirés, tri numero desc, expose
image_display_path).
RPC : cloturer_manche() (désigne le gagnant + winner_until) ;
demarrer_manche() (purge les non-gagnants de la manche précédente, RENVOIE
les chemins (full_path, display_path) à effacer du storage, crée la manche
suivante avec un thème tiré au sort).

## État actuel (fait, fonctionne)
- Fondations : client Supabase, store auth (session/profile/is_admin), router
  + gardes requiresAuth/requiresAdmin, layout + header. Titre du site
  cliquable -> retour accueil.
- Auth Google opérationnelle.
- Store manche + galerie. Composant MancheGalerie : mode vote (anonyme,
  mélangé, sans compteur, pas de self-vote, badge "ton dessin") et mode
  reveal (auteurs, compteurs, pleine réso, gagnant mis en avant).
- Flux de soumission : canvas (resize + watermark) -> upload des 2 versions
  -> insert. Disclaimer IA + case à cocher. Nettoyage des orphelins si
  l'insert échoue.
- Écran admin (/admin, requiresAdmin) : bouton Clôturer (rpc cloturer_manche)
  et bouton Démarrer la suivante (rpc demarrer_manche + storage.remove() sur
  les chemins renvoyés). Confirmations + feedback.
- Accueil : hero "Hall of Fame" (dernier gagnant) -> section manche en cours
  (thème + countdown + bouton soumettre) -> galerie de vote.
- Page fresque /gagnants (lit galerie_gagnants).
- Helper getDisplayUrl(path) dans src/lib/imageHelpers.js : construit l'URL
  publique depuis dessins-display (retire un éventuel préfixe de bucket).
- Gestion session expirée : getSession() au démarrage (avant mount),
  handleSessionError() dans les stores, onAuthStateChange pour
  TOKEN_REFRESHED / SIGNED_OUT / SIGNED_IN.

## Conventions de dev
- vite.config.js : port 5173 figé (strictPort: true).
- TOUS les chargements de store en try/catch/finally : toujours sortir du
  loading, afficher un message d'erreur + bouton Réessayer, jamais de spinner
  infini.
- Chemins storage stockés en RELATIF au bucket (ex. "abc-123.webp"), sans
  préfixe de bucket, pour que storage.remove() / getPublicUrl fonctionnent.
- .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) jamais commité. Clé anon
  côté front uniquement, jamais la service_role.
- Migrations SQL versionnées dans supabase/migrations (0001 schema, 0002
  storage, 0003 rpc_manches, 0004 gagnants_purge, 0005 reparation).

## À FAIRE (prochaines étapes MVP)
1. Lightbox : agrandir un dessin au clic. Pendant le VOTE, watermark sur TOUTE
   l'image (diagonale répétée, semi-transparente), pas un simple coin.
2. Pages légales : CGU + politique de confidentialité (footer). Couvrir :
   données perso via Google OAuth (email), bannissement IA, conservation
   (non-gagnants supprimés au démarrage de la manche suivante ; gagnant
   conservé 1 an pour la fresque/print).

## Plus tard (hors MVP)
- Pages profil (avatar, liens externes, historique des dessins). Le pseudo du
  hero et de la fresque devra alors devenir un <router-link> vers le profil
  (emplacement déjà prévu).
- Purge réelle des gagnants expirés (>1 an) via pg_cron (base + storage).
  Aujourd'hui galerie_gagnants filtre sur winner_until, mais l'effacement
  physique des vieux gagnants n'est pas encore automatisé.
- Watermark/resize côté serveur (Edge Function) quand enjeux sponsors/cagnotte.
- Custom domain ou proxy Supabase (contourner les adblockers en prod).
- Thèmes saisonniers + privilèges gagnants.
- Monétisation (vote SACRÉ, jamais payant) : cosmétiques, perks non-compétitifs,
  sponsors matériel, cagnotte/mécènes, merch sur l'œuvre gagnante, tirage au
  sort abonnés/subs Twitch = print du dessin gagnant.
- Fresque anniversaire (52 gagnants sur l'année).
