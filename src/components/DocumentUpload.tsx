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
  accept?: string;
}

const MAX_SIZE = 5 * 1024 * 1024;

const DocumentUpload = ({
  label,
  description,
  required,
  userId,
  field,
  value,
  onChange,
  accept = "application/pdf,image/png,image/jpeg",
}: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 5 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("provider-documents").upload(path, file, { upsert: true });
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
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>PDF · JPG · PNG</span>}
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
