# Modèle de données

## Identité et rôles

- `profiles` : identité d'usage.
- `user_roles` : rôles applicatifs.
- `provider_applications` : candidature professionnelle.
- `provider_application_reviews` : avis motivés des agents.
- `provider_application_complement_requests` : demandes et réponses de complément.
- `provider_application_complement_documents` : pièces ajoutées après la candidature.
- `admin_audit_log` : décisions administratives.

## Santé

- `medical_records` : synthèse médicale.
- `medical_documents` : métadonnées du coffre documentaire.
- `vaccinations` : vaccins du patient ou d'un enfant rattaché.
- `hospitalizations` : séjours et résumés de sortie.
- `prescriptions` : ordonnances.
- `medication_schedules` et `medication_intakes` : rappels et observance.
- `vital_signs` et tables de télésurveillance : mesures et alertes.
- `pregnancy_profiles` : suivi grossesse.
- `menstrual_cycles` : historique du cycle.
- `dependents` et `growth_records` : enfants, croissance et étapes.
- `medical_access_grants` : autorisations nominatives.
- `medical_share_links` : partages temporaires.
- `medical_access_logs` : accès et partages.

## Soins et réseau

- `consultations` : rendez-vous.
- `teleconsultation_sessions` : séances à distance.
- `messages` : messagerie.
- `health_structures` : établissements.
- `pharmacy_orders` : commandes pharmacie.
- `lab_requests` : analyses.
- `emergencies` : SOS et dispatch.
- `health_contents` : prévention publiée par l'administration.

## Abonnements et famille

- `local_payment_requests` : demandes de paiement avec référence.
- `subscriptions` : formule active après paiement.
- `family_members` : invitations et membres rattachés.
- `notifications` : événements persistants.

## Marché et portefeuille

- `provider_services` : catalogue et tarifs.
- `wallets` : identité du portefeuille et état KYC.
- `wallet_transactions` : registre des crédits et débits.
- `payout_accounts` : destinations de retrait.
- `withdrawals` : demandes et décisions.
- `commissions` : commission matérialisée après validation.
- `invoices` : factures partagées entre patient et prestataire.
- `kyc_documents` et `kyc_validations` : pièces et avis.
- `financial_audits` : journal financier.

## Invariants

- Une demande de paiement crédite au plus une fois un portefeuille.
- Une demande de retrait produit au plus un débit.
- Le montant brut d'un retrait est égal à la commission plus le net.
- Une candidature ne peut être décidée avec un complément ouvert.
- Après réponse à un complément, un nouvel avis agent est requis.
- Un membre Famille ne peut rejoindre qu'avec l'adresse invitée.
- Un lien médical expiré ou révoqué ne retourne aucune donnée.
