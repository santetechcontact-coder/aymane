# Déploiement AYMANE

## Prérequis

- Node.js 22 pour le développement.
- Docker Engine et Docker Compose pour la production conteneurisée.
- Projet Supabase avec Auth, PostgreSQL, Storage et Edge Functions.
- Nom de domaine avec HTTPS.

## Variables

Créer le fichier d'environnement à partir de `.env.example` et renseigner :

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
AYMANE_IP_HASH_SECRET
AYMANE_WEB_PORT
```

`AYMANE_IP_HASH_SECRET` doit contenir au moins 32 caractères aléatoires.

## Base Supabase

Dans un environnement explicitement lié au bon projet :

```bash
npx supabase link --project-ref <project-ref>
npx supabase migration list
npx supabase db push
npx supabase functions deploy symptom-triage
```

Vérifier ensuite :

- les tables et fonctions des migrations ;
- les buckets privés ;
- les politiques RLS ;
- les URL autorisées pour Auth ;
- les modèles d'e-mail ;
- la configuration MFA.

## Conteneurs

```bash
docker compose build
docker compose up -d
docker compose ps
```

L'application répond par défaut sur `http://localhost:8080`. Le proxy inverse de production doit terminer TLS et relayer vers ce port.

## Contrôles avant mise en ligne

```bash
npm ci
npm exec tsc -- --noEmit
npm run test
npm run server:test
npm run build
```

Tester au minimum :

- inscription et récupération de mot de passe ;
- candidature prestataire avec complément ;
- rendez-vous, téléconsultation, pharmacie, laboratoire et SOS ;
- coffre médical et partage expirant ;
- paiement, abonnement et facture ;
- KYC, MFA et retrait ;
- vues 320, 375, 414, 768 et bureau.

## Sauvegardes

- Activer les sauvegardes Supabase adaptées au niveau de service.
- Sauvegarder chaque jour le volume `aymane-data`.
- Chiffrer les sauvegardes et séparer les droits de restauration.
- Tester une restauration sur un environnement isolé.

## Retour arrière

- Conserver l'image précédente du frontend et du backend.
- Les migrations SQL sont progressives ; préparer une migration corrective au lieu de modifier la base manuellement.
- En cas de défaut frontend, redéployer l'image précédente.
- En cas de défaut métier, désactiver la route concernée au proxy et appliquer une migration corrective validée.
