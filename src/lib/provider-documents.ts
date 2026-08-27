import { supabase } from "@/integrations/supabase/client";

/**
 * Client layer for the professional document subsystem.
 *
 * A file is never "just uploaded": every deposit stores the binary in its bucket
 * AND registers a metadata row (name, type, size, checksum, owner, category,
 * version, processing status), which is what makes the piece searchable,
 * auditable and reviewable. The platform only ever checks the FORM of a file —
 * whether it is readable at all. Judging what a document proves is a human
 * decision taken by a reviewer, never by this code.
 */

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export type DocumentCategory =
  | "cni" | "cv" | "diploma" | "order" | "legal" | "approval" | "rccm"
  | "manager_cni" | "photo" | "logo" | "complement" | "other";

export type ProcessingStatus = "uploaded" | "processing" | "processed" | "failed";

export interface ProviderDocument {
  id: string;
  owner_user_id: string;
  application_id: string | null;
  category: DocumentCategory;
  label: string | null;
  bucket_id: string;
  file_path: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256: string | null;
  version: number;
  processing_status: ProcessingStatus;
  created_at: string;
}

export interface DepositResult {
  /** Null when the metadata backend is not deployed yet — the file is still stored. */
  documentId: string | null;
  path: string;
}

/** Storage object keys must stay ASCII-safe; keep only a short, clean extension. */
const safeExtension = (filename: string) => {
  const dot = filename.lastIndexOf(".");
  if (dot < 0 || dot === filename.length - 1) return "bin";
  return filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "bin";
};

/** SHA-256 of the file, so a later read can prove the bytes never changed. */
const computeChecksum = async (file: File): Promise<string | null> => {
  if (!globalThis.crypto?.subtle) return null;
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null; // integrity hashing is a bonus, never a reason to reject a deposit
  }
};

export class DocumentTooLargeError extends Error {
  constructor() {
    super("Document exceeds the maximum accepted size");
    this.name = "DocumentTooLargeError";
  }
}

/**
 * `integrations/supabase/types.ts` is generated from the database, so functions
 * shipped by a migration that has not been applied yet are absent from its union
 * and would fail to typecheck. Route this module's calls through one explicit,
 * narrow escape hatch rather than sprinkling casts at each call site.
 */
const callRpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
  const invoke = supabase.rpc as unknown as (
    name: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: T; error: { message: string; code?: string } | null }>;

  const { data, error } = await invoke(fn, args);
  if (error) {
    const failure = new Error(error.message) as Error & { code?: string };
    failure.code = error.code;
    throw failure;
  }
  return data;
};

/**
 * True when the database simply does not expose this function yet — the
 * migration that ships the document subsystem has not been applied. PostgREST
 * answers PGRST202 ("Could not find the function ... in the schema cache").
 *
 * A deposit must never be lost over this: the file itself is stored and a
 * reviewer can already open it. Metadata starts being recorded the moment the
 * migration lands, with no code change.
 */
const isSubsystemNotDeployed = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code;
  if (code === "PGRST202") return true;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("could not find the function") || message.includes("schema cache");
};

/**
 * Deposit a file and register it. Any file type is accepted — refusing a format
 * would mean the system judging the piece, which is the reviewer's job.
 */
export const depositProviderDocument = async (options: {
  file: File;
  userId: string;
  category: DocumentCategory;
  bucket?: "provider-documents" | "public-profiles";
  label?: string;
  applicationId?: string | null;
  /** Existing document this one supersedes — keeps the version history. */
  replacesDocumentId?: string | null;
}): Promise<DepositResult> => {
  const {
    file, userId, category,
    bucket = "provider-documents",
    label, applicationId = null, replacesDocumentId = null,
  } = options;

  if (file.size < 1 || file.size > MAX_DOCUMENT_BYTES) throw new DocumentTooLargeError();

  const path = `${userId}/${category}-${Date.now()}.${safeExtension(file.name)}`;
  const mimeType = file.type || "application/octet-stream";

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: mimeType,
  });
  if (uploadError) throw uploadError;

  const checksum = await computeChecksum(file);

  try {
    const documentId = await callRpc<string>("register_provider_document", {
      _bucket_id: bucket,
      _file_path: path,
      _category: category,
      _original_filename: file.name.slice(0, 255),
      _mime_type: mimeType.slice(0, 128),
      _file_size_bytes: file.size,
      _application_id: applicationId,
      _label: label ?? null,
      _checksum_sha256: checksum,
      _replaces_document_id: replacesDocumentId,
    });
    return { documentId, path };
  } catch (error) {
    // The subsystem not being deployed is our problem, not the applicant's:
    // keep the file they just deposited and let them carry on.
    if (isSubsystemNotDeployed(error)) return { documentId: null, path };

    // Any other failure means the deposit is not usable — do not leave an
    // orphan binary behind with no record of who it belongs to.
    await supabase.storage.from(bucket).remove([path]);
    throw error;
  }
};

/** Archive a document (soft delete — the file is retained for traceability). */
export const archiveProviderDocument = async (documentId: string) => {
  try {
    await callRpc<void>("archive_provider_document", { _document_id: documentId });
  } catch (error) {
    if (!isSubsystemNotDeployed(error)) throw error;
  }
};

/** Record that someone opened or downloaded a document. */
export const logDocumentAccess = async (documentId: string, action: "view" | "download") => {
  try {
    await callRpc<void>("log_provider_document_access", {
      _document_id: documentId,
      _action: action,
    });
  } catch {
    /* logging must never block the reader */
  }
};

/** Attach every still-unattached document of the caller to a submitted application. */
export const attachDocumentsToApplication = async (applicationId: string) =>
  (await callRpc<number>("attach_provider_documents_to_application", {
    _application_id: applicationId,
  })) ?? 0;

/** Search documents by text, owner, application, category, status or date range. */
export const searchProviderDocuments = async (filters: {
  query?: string;
  ownerUserId?: string;
  applicationId?: string;
  category?: DocumentCategory;
  status?: ProcessingStatus;
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<ProviderDocument[]> =>
  (await callRpc<ProviderDocument[]>("search_provider_documents", {
    _query: filters.query ?? null,
    _owner_user_id: filters.ownerUserId ?? null,
    _application_id: filters.applicationId ?? null,
    _category: filters.category ?? null,
    _status: filters.status ?? null,
    _from: filters.from ?? null,
    _to: filters.to ?? null,
    _limit: filters.limit ?? 50,
  })) ?? [];

/** Time-limited signed URL for reading a private document, with the access logged. */
export const getDocumentDownloadUrl = async (
  document: Pick<ProviderDocument, "id" | "bucket_id" | "file_path">,
  expiresInSeconds = 1800,
): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from(document.bucket_id)
    .createSignedUrl(document.file_path, expiresInSeconds);
  if (error) return null;
  await logDocumentAccess(document.id, "download");
  return data?.signedUrl ?? null;
};
