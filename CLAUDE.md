# Le Drawmanche — CLAUDE.md

## Projet
Le Drawmanche — concours de dessin hebdomadaire communautaire. Une manche
par semaine : thème imposé, une semaine pour soumettre UN dessin, vote pour
les dessins des AUTRES uniquement, gagnant révélé le dimanche (possiblement
en stream Twitch). Dessins anonymes pendant le vote, auteurs révélés à la
clôture. IA générative bannie.

## Stack
Vue 3 (Vite) + Pinia + vue-router. Supabase (Postgres, Auth OAuth Google,
Storage). Déploiement à venir.

## Décisions d'architecture (NE PAS casser)
- Anonymat : le front lit la VUE galerie_manche, JAMAIS la table submissions.
  La vue ne renvoie auteur / pleine réso / compteurs que si manche = 'closed'.
- Intégrité du vote, SACRÉE : 1 humain = 1 voix. UNIQUE(manche_id, voter_id)
  + policy RLS interdisant de voter pour sa propre œuvre. Jamais de votes
  payants ou multiples.
- 1 soumission par (manche_id, user_id), UNIQUE. Soumission DÉFINITIVE pour
  le MVP (upsert envisageable plus tard).
- Compteurs de votes CACHÉS pendant la manche, révélés à la clôture.
- Ordre d'affichage MÉLANGÉ par session (Fisher-Yates, graine stable).
- Fichiers nommés par submission_id UNIQUEMENT, jamais user_id (anonymat).
- 2 buckets : dessins-full (privé) et dessins-display (public, basse réso +
  watermark généré côté client).
- Cycle piloté manuellement par l'admin : RPC cloturer_manche() puis
  demarrer_manche(). Réservées à profiles.is_admin.
- UI en français, style sobre.

## Modèle de données
profiles (id→auth.users, username, avatar_url, is_admin) ; themes (label,
season, used) ; manches (numero, theme, status active/closed, starts_at,
ends_at, winner_submission_id) ; submissions (manche_id, user_id,
image_full_path, image_display_path, status active/disqualified) ; votes
(manche_id, voter_id, submission_id). Vue galerie_manche. RPC cloturer_manche
/ demarrer_manche.

## État actuel (fait, fonctionne)
- Fondations : client Supabase, store auth (session/profile/is_admin), router
  + gardes requiresAuth/requiresAdmin, layout + header.
- Auth Google opérationnelle.
- Store manche + galerie (charge manche courante + galerie_manche).
- Composant MancheGalerie : mode vote (anonyme, mélangé, sans compteur, pas
  de self-vote, badge "ton dessin") et mode reveal (auteurs, compteurs,
  pleine réso, gagnant mis en avant). Countdown.
- Flux de soumission : canvas (resize + watermark) → upload des 2 versions →
  insert. Disclaimer IA + case à cocher. Nettoyage des orphelins si l'insert
  échoue.

## Conventions de dev
- vite.config.js : port 5173 figé (strictPort: true).
- TOUS les chargements de store en try/catch/finally : toujours sortir du
  loading et afficher un message d'erreur, jamais de spinner infini
  (utilisateurs sous adblock notamment).
- Bug d'auth inexplicable → vider cookies + cache du site.
- .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) jamais commité. Clé anon
  côté front uniquement, jamais la service_role.

## À FAIRE (prochaines étapes)
1. Écran admin (requiresAdmin) : bouton "Clôturer" → rpc cloturer_manche ;
   bouton "Démarrer la suivante" → rpc demarrer_manche. Boucle le cycle.
2. Agrandissement des dessins (lightbox au clic). Pendant le vote : watermark
   sur TOUTE l'image (diagonale répétée, semi-transparente), pas juste un coin.
3. Pages légales : CGU + politique de confidentialité (footer). Couvrir :
   données perso via Google OAuth (email), bannissement IA, conservation des
   dessins (cf. point 4).
4. Suppression des dessins en fin de manche — À TRANCHER. Lucas veut ne pas
   conserver les dessins. Conflit avec : print/merch du gagnant, historique
   profil, page de résultats passés. Option recommandée : à demarrer_manche(),
   supprimer fichiers + lignes des soumissions NON gagnantes de la manche
   précédente, mais CONSERVER le gagnant. À valider avant de coder. Nettoyage
   en base (submissions/votes) ET dans le Storage (2 buckets).

## Plus tard (hors MVP)
Profil enrichi (avatar, liens, historique) ; watermark/resize côté serveur
(Edge Function) quand enjeux sponsors/cagnotte ; custom domain ou proxy
Supabase (contourner adblockers en prod) ; thèmes saisonniers + privilèges
gagnants ; monétisation (cosmétiques, perks non-compétitifs, sponsors
matériel, cagnotte/mécènes, merch, tirage subs Twitch = print du gagnant).
