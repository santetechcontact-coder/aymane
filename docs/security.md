# Sécurité AYMANE

## Principes

- Accès minimal par rôle.
- Données médicales privées par défaut.
- Décisions sensibles exécutées par fonctions SQL contrôlées.
- Historique immuable des accès médicaux et décisions financières.
- Aucun secret de service dans le navigateur.
- Les messages visibles restent orientés utilisateur et ne révèlent pas les détails internes.

## Authentification

- Sessions Supabase avec jetons courts et renouvellement géré par le client.
- Confirmation d'adresse selon la configuration du projet.
- Mot de passe de 12 caractères minimum dans l'interface.
- MFA TOTP pour les opérations sensibles.
- Niveau `aal2` obligatoire pour demander un retrait.
- Fermeture des autres sessions depuis l'espace Sécurité.

## Autorisation

| Rôle | Accès principal |
| --- | --- |
| `patient` | Ses données, ses proches, ses paiements et ses partages |
| Professionnel | Patients autorisés, agenda, catalogue, KYC et portefeuille |
| `application_reviewer` | Dossiers prestataires, compléments, avis et KYC |
| `admin` | Décision finale, rôles, finance, contenus et audit |

Les politiques RLS restent actives même si une route frontend est appelée directement. Les mutations financières, décisions de compte et partages utilisent des fonctions `SECURITY DEFINER` avec contrôles explicites.

## Documents

- Buckets `medical-documents`, `provider-documents` et `kyc-documents` privés.
- Chemin préfixé par l'identifiant du propriétaire.
- Types autorisés côté interface : PDF, JPG et PNG.
- Taille maximale : 10 Mo pour KYC et compléments, 15 Mo pour le coffre médical.
- Consultation par URL signée de courte durée.
- Suppression du fichier si l'enregistrement métier échoue.

## Dossier médical

- Le propriétaire conserve l'accès.
- Un professionnel n'accède qu'avec une consultation active ou une autorisation valide.
- Le partage public utilise un jeton UUID, une expiration maximale de sept jours et une révocation.
- Le résumé partagé exclut les identifiants internes.
- Les créations de partage et lectures sont journalisées.

## Finance

- Les soldes sont calculés à partir d'un registre de transactions, pas d'un champ modifiable.
- Un paiement ne crédite le portefeuille qu'après passage à `paid`.
- Une contrainte unique empêche le double crédit d'une même demande.
- Un retrait exige KYC validé, AAL2, solde disponible et compte appartenant au prestataire.
- La commission est calculée côté base.
- Chaque validation et confirmation produit une trace d'audit.

## API compte

- Jeton Bearer vérifié auprès de Supabase.
- Corps JSON limité à 16 Ko.
- Limitation à 60 requêtes par fenêtre de 15 minutes et par empreinte IP.
- Adresses IP hachées par HMAC.
- Réponses sans cache et en-têtes `DENY`, `nosniff`, `no-referrer`.
- Erreurs internes remplacées par un message neutre et un identifiant de requête.

## Secrets

Variables publiques autorisées :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Secret serveur obligatoire :

- `AYMANE_IP_HASH_SECRET`

Les clés `service_role`, secrets opérateurs et jetons de déploiement doivent rester dans le gestionnaire de secrets de l'hébergeur.

## Exploitation

- Activer les sauvegardes PostgreSQL.
- Sauvegarder le volume SQLite chiffré.
- Vérifier chaque mois les agents et administrateurs actifs.
- Examiner les audits médicaux et financiers.
- Appliquer les migrations via CI ou une procédure d'exploitation approuvée.
- Tester la restauration au moins chaque trimestre.
