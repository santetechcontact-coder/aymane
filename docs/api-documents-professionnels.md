# API — Documents des professionnels et structures

Backend complet du dépôt de pièces justificatives (inscription professionnelle,
compléments de dossier, photos et logos).

**Principe non négociable :** la plateforme ne juge jamais la véracité d'une
pièce. Elle vérifie uniquement la *forme* (poids, intégrité, appartenance) et
conserve la trace. L'acceptation ou le rejet d'un professionnel est une décision
**humaine**, prise par un `admin` ou un `application_reviewer`.

Migration : `supabase/migrations/20260801120000_provider_document_subsystem.sql`
Client : `src/lib/provider-documents.ts`

---

## Modèle de données

### `provider_documents`

| Colonne | Type | Rôle |
|---|---|---|
| `id` | uuid | Identifiant |
| `owner_user_id` | uuid | Propriétaire (le professionnel) |
| `application_id` | uuid \| null | Dossier de candidature rattaché |
| `structure_id` | uuid \| null | Structure rattachée |
| `linked_entity_type` / `linked_entity_id` | text / uuid | Rattachement générique (consultation, prescription, vaccination, analyse…) |
| `category` | text | `cni`, `cv`, `diploma`, `order`, `legal`, `approval`, `rccm`, `manager_cni`, `photo`, `logo`, `complement`, `other` |
| `label` | text | Libellé lisible |
| `bucket_id` / `file_path` | text | Emplacement de stockage (unique) |
| `original_filename` | text | Nom d'origine tel que déposé |
| `mime_type` | text | Type déclaré |
| `file_size_bytes` | bigint | Poids — 1 octet à 20 Mo |
| `checksum_sha256` | text | Empreinte d'intégrité |
| `version` / `parent_document_id` | int / uuid | Versionnement |
| `processing_status` | enum | `uploaded` → `processing` → `processed` \| `failed` |
| `extracted_text` / `extracted_data` | text / jsonb | Résultat OCR |
| `uploaded_by`, `created_at`, `updated_at`, `deleted_at` | | Traçabilité et archivage |

### `provider_document_access_logs`

Journal immuable : `document_id`, `actor_id`, `action`
(`upload`, `view`, `download`, `replace`, `archive`, `process`), `metadata`, `created_at`.

---

## Endpoints (RPC PostgREST)

Tous réservés au rôle `authenticated` (`REVOKE … FROM anon`).

### `register_provider_document(...) → uuid`
Enregistre les métadonnées après le dépôt du binaire.
Valide le poids, impose que `file_path` commence par l'uid de l'appelant, gère le
versionnement via `_replaces_document_id`, journalise `upload`/`replace`.

### `attach_provider_documents_to_application(_application_id) → integer`
Rattache les pièces encore orphelines de l'appelant au dossier qu'il vient de
déposer. Retourne le nombre de pièces rattachées.

### `log_provider_document_access(_document_id, _action)`
Journalise `view` ou `download`. Refuse si l'appelant n'a pas le droit de lire la
pièce.

### `archive_provider_document(_document_id)`
Archivage logique (`deleted_at`). **Aucune suppression physique** n'est possible :
les policies `RESTRICTIVE` bloquent `DELETE` et `UPDATE` directs.

### `set_provider_document_processing(_document_id, _status, …)`
Pilote le statut OCR. Réservé `admin` / `application_reviewer`. Sur `failed`,
notifie le professionnel pour qu'il remplace la pièce.

### `search_provider_documents(...) → setof provider_documents`
Recherche plein texte (français) sur nom de fichier, libellé et texte extrait,
plus filtres propriétaire / dossier / catégorie / statut / période. `SECURITY
INVOKER` : la RLS restreint d'elle-même le périmètre visible.

---

## Permissions

| Acteur | Droits |
|---|---|
| Propriétaire | lit, dépose, remplace et archive ses pièces (tant que le dossier est `pending`) |
| `application_reviewer` | lit toutes les pièces, pilote le statut de traitement |
| `admin` | idem, plus archivage sur dossier clos |
| `anon` | aucun accès |

---

## Utilisation côté client

```ts
import {
  depositProviderDocument,
  attachDocumentsToApplication,
  searchProviderDocuments,
  getDocumentDownloadUrl,
} from "@/lib/provider-documents";

// Dépôt (stockage + métadonnées + empreinte, en un appel)
const { documentId, path } = await depositProviderDocument({
  file, userId, category: "diploma", label: "Diplôme",
});

// Après création du dossier
await attachDocumentsToApplication(applicationId);

// Revue : recherche puis lecture tracée
const docs = await searchProviderDocuments({ applicationId, status: "uploaded" });
const url = await getDocumentDownloadUrl(docs[0]); // journalise le téléchargement
```

Si l'enregistrement des métadonnées échoue, le binaire déposé est supprimé : le
stockage ne conserve jamais de fichier orphelin.

---

## Tests

`src/lib/provider-documents.test.ts` couvre : enregistrement des métadonnées,
acceptation de tout format, refus au-delà de la taille limite, nettoyage du
binaire en cas d'échec, versionnement, cloisonnement par dossier utilisateur.

---

## Reste à faire

- **Service d'extraction OCR** : `set_provider_document_processing` est prêt et
  attend un worker (edge function ou service) qui passe `uploaded` → `processing`
  → `processed`/`failed`.
- **Reprise de l'existant** : les pièces déposées avant cette migration n'ont que
  leur chemin dans `provider_applications.document_*_url`. Une reprise pourra
  créer les lignes de métadonnées correspondantes.
