import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  archiveProviderDocument,
  depositProviderDocument,
  DocumentTooLargeError,
  MAX_DOCUMENT_BYTES,
  type DocumentCategory,
} from "@/lib/provider-documents";

interface DocumentUploadProps {
  label: string;
  description?: string;
  required?: boolean;
  userId: string;
  /** Document category — also used as the storage key prefix. */
  field: DocumentCategory | string;
  value: string | null;
  onChange: (path: string | null) => void;
  /** Reports the registered metadata row, so the parent can link it later. */
  onRegistered?: (documentId: string | null) => void;
  /** Optional MIME/extension filter. Omitted by default: any file is accepted —
   *  the platform only stores the piece; a human reviewer judges its content. */
  accept?: string;
}

const DocumentUpload = ({
  label,
  description,
  required,
  userId,
  field,
  value,
  onChange,
  onRegistered,
  accept,
}: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await depositProviderDocument({
        file,
        userId,
        category: field as DocumentCategory,
        label,
        // Supersede the previous deposit so the history is kept, not overwritten.
        replacesDocumentId: documentId,
      });
      setDocumentId(result.documentId);
      setDisplayName(file.name);
      onChange(result.path);
      onRegistered?.(result.documentId);
      toast({ title: "Document enregistré" });
    } catch (error) {
      const description = error instanceof DocumentTooLargeError
        ? `Maximum ${Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))} Mo.`
        : error instanceof Error ? error.message : "Réessayez dans un instant.";
      toast({ title: "Échec de l'envoi", description, variant: "destructive" });
    } finally {
      setUploading(false);
      // Let the same file be picked again after a failure.
      e.target.value = "";
    }
  };

  const remove = async () => {
    if (!value) return;
    if (documentId) {
      try {
        await archiveProviderDocument(documentId);
      } catch {
        /* archiving is best-effort: the applicant must still be able to move on */
      }
    }
    setDocumentId(null);
    setDisplayName(null);
    onChange(null);
    onRegistered?.(null);
  };

  const filename = displayName ?? value?.split("/").pop();

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="label text-stone">
          {label} {required && <span className="serif-italic text-accent">*</span>}
        </span>
        {value && <span className="label text-primary">Reçu</span>}
      </div>
      {description && <p className="text-xs text-stone mb-2">{description}</p>}
      <div
        className={cn(
          "border-b transition-colors py-3",
          value ? "border-primary" : "border-ink-10 hover:border-ink"
        )}
      >
        {value ? (
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="serif-italic text-lg text-ink truncate">{filename}</div>
            </div>
            <button type="button" onClick={remove} className="label text-stone hover:text-accent link-underline tap inline-flex items-center gap-1">
              <X className="h-3 w-3" /> Retirer
            </button>
          </div>
        ) : (
          <label className="flex items-baseline justify-between cursor-pointer tap">
            <span className="serif-italic text-lg text-stone">
              {uploading ? "Envoi en cours…" : "Téléverser un fichier"}
            </span>
            <span className="label text-stone inline-flex items-center gap-2">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>Tous formats · 20 Mo</span>}
              <span className="text-stone">→</span>
            </span>
            <input type="file" accept={accept} className="hidden" onChange={handle} disabled={uploading} />
          </label>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
