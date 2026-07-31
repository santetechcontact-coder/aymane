# Audit structurel, design et logique - AYMANE / SanteTech

Date: 2026-06-16
Contexte: plateforme sante moderne pour le Senegal, React + Vite + Supabase, experience mobile-first patient/professionnel.

## Synthese executive

AYMANE possede une base produit solide: routes metier nombreuses, auth Supabase, roles, RLS documentee, triage IA, dashboard patient/pro, pharmacie, SOS, dossier medical et annuaire. Le risque principal n'est pas l'ambition fonctionnelle mais la coherence bout-en-bout: plusieurs appels a l'action publics menaient a des routes inexistantes, les pages legales etaient absentes, la landing etait tres expressive mais moins orientee decision mobile, et la direction visuelle conservait des marqueurs generiques.

La passe appliquee corrige les ruptures critiques de navigation, ajoute les pages legales minimales, conserve l'intention mobile-first, et renforce le premier ecran patient autour d'un parcours de soins concret: decrire un symptome, choisir un soignant, suivre son dossier.

## Architecture

- Stack coherente: React 18, TypeScript, Vite, Tailwind 3, shadcn/ui, Framer Motion, Supabase.
- Bonne separation globale: `pages/`, `components/`, `hooks/`, `lib/`, `integrations/supabase/`.
- Les routes critiques sont centralisees dans `src/App.tsx`.
- Le shell dashboard est role-aware et derive la navigation depuis les roles.
- Risque restant: plusieurs pages sont riches mais encore couplees directement a Supabase dans le composant. A moyen terme, extraire des hooks de donnees par domaine (`useConsultations`, `useDirectory`, `useMedicalRecord`) faciliterait tests et etats offline.

## Navigation et parcours

Problemes identifies:

- Les CTA publics `directory`, `pharmacy`, `medical-record`, `sos` etaient utilises depuis la landing mais non declares comme routes publiques/protegees.
- `ProtectedRoute` redirigeait vers `/auth` sans memoriser la destination initiale.
- Le footer contenait des liens morts vers `#`.

Corrections appliquees:

- Ajout de raccourcis routes proteges: `/directory`, `/pharmacy`, `/medical-record`, `/sos`.
- Conservation de la destination apres connexion via `state.from`.
- Ajout des pages `/confidentialite`, `/cgu`, `/mentions-legales`, `/securite`.

## Design system

Problemes identifies:

- Typographie basee sur Inter/Inter Tight, trop frequente dans les interfaces generees.
- Accent secondaire violet/lilas dans les halos, en contradiction avec une direction medicale sobre.
- Tracking negatif global, fragile sur mobile et contraire a la contrainte de lisibilite.
- Palette tres "iOS glass", plaisante mais parfois trop illustrative pour un outil sante operationnel.

Corrections appliquees:

- Passage a Outfit + JetBrains Mono.
- Accent principal plus teal medical, halos refroidis vers cyan/menthe/ambre.
- Tracking custom remis a 0.
- Dashboard patient recentre sur des decisions et signaux operationnels.

## Mobile-first

Points forts:

- Shell mobile avec topbar sticky et bottom navigation.
- Touch targets globalement grands.
- Auth wizard mobile et onboarding adaptes au petit ecran.

Risque restant:

- Plusieurs pages dashboard utilisent beaucoup de cartes; sur 320 px, certaines grilles et labels longs doivent continuer a etre verifies regulierement.
- Les dashboards pro peuvent devenir denses sur mobile si les donnees reelles sont volumineuses.

## Fonctionnel

Points forts:

- Auth email/password.
- Signup patient localise Senegal avec regions/villes.
- OTP demo.
- Triage IA via edge function.
- Annuaire base sur profils + roles.
- Dashboards role-based.

Risques restants:

- Le triage depend de la disponibilite de l'edge function Supabase.
- Les paiements Mobile Money sont annonces comme futurs; ne pas les presenter comme live.
- Les pages legales ajoutees sont des contenus produit structurants, a faire relire juridiquement.
- Les etats erreur/retry Supabase peuvent etre renforces avec skeletons et empty states plus specifiques sur toutes les pages.

## Priorites suivantes

1. Ajouter tests de navigation pour les raccourcis publics et le retour apres login.
2. Extraire les appels Supabase metier dans des hooks testables.
3. Ajouter etats loading/error/empty specifiques sur annuaire, pharmacie, dossier medical et consultations.
4. Verifier responsive 320/375/414/768 sur les pages dashboard les plus denses.
5. Brancher le paiement Senegal uniquement lorsque PayDunya/Wave/Orange Money est implemente et teste.
