import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DocumentUploadProps {
  label: string;
  description?: string;
  required?: boolean;
  userId: string;
  field: string;
  value: string | null;
  onChange: (path: string | null) => void;
  /** Optional MIME/extension filter. Omitted by default: any file is accepted —
   *  the platform only stores the piece; a human reviewer judges its content. */
  accept?: string;
}

const MAX_SIZE = 20 * 1024 * 1024;

// Keep only characters that are safe inside a Supabase Storage object key.
const safeExt = (name: string) => {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "bin";
  return name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "bin";
};

const DocumentUpload = ({
  label,
  description,
  required,
  userId,
  field,
  value,
  onChange,
  accept,
}: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 20 Mo.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const path = `${userId}/${field}-${Date.now()}.${safeExt(file.name)}`;
    const { error } = await supabase.storage.from("provider-documents").upload(path, file, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });
    setUploading(false);
    if (error) {
      toast({ title: "Échec de l'envoi", description: error.message, variant: "destructive" });
      return;
    }
    onChange(path);
    toast({ title: "Document enregistré" });
  };

  const remove = async () => {
    if (!value) return;
    await supabase.storage.from("provider-documents").remove([value]);
    onChange(null);
  };

  const filename = value?.split("/").pop();

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
