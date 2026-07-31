import { useState } from "react";
import { Loader2, Camera, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  label: string;
  required?: boolean;
  userId: string;
  field: string;
  value: string | null;
  onChange: (path: string | null) => void;
  shape?: "circle" | "square";
}

const MAX_SIZE = 3 * 1024 * 1024;

const PhotoUpload = ({
  label,
  required,
  userId,
  field,
  value,
  onChange,
  shape = "circle",
}: PhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const publicUrl = value
    ? supabase.storage.from("public-profiles").getPublicUrl(value).data.publicUrl
    : null;

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Fichier invalide", description: "Image uniquement (JPG/PNG/WebP).", variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "Trop volumineux", description: "Maximum 3 Mo.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("public-profiles").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) {
      toast({ title: "Échec", description: error.message, variant: "destructive" });
      return;
    }
    onChange(path);
  };

  const remove = async () => {
    if (!value) return;
    await supabase.storage.from("public-profiles").remove([value]);
    onChange(null);
  };

  return (
    <div>
      <p className="text-[10.5px] font-mono uppercase tracking-widest text-ink-3 mb-2">
        {label} {required && <span className="text-primary">*</span>}
      </p>
      <div className="flex items-center gap-4">
        <label
          className={cn(
            "relative size-24 cursor-pointer overflow-hidden flex items-center justify-center bg-surface-1 border border-hairline tap group",
            shape === "circle" ? "rounded-full" : "squircle-lg"
          )}
        >
          {publicUrl ? (
            <img src={publicUrl} alt="" className="w-full h-full object-cover" />
          ) : uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-ink-3" />
          ) : (
            <Camera className="h-5 w-5 text-ink-3 group-hover:text-ink transition-colors" strokeWidth={2} />
          )}
          <input type="file" accept="image/*" className="hidden" onChange={handle} disabled={uploading} />
        </label>
        <div className="flex-1 min-w-0">
          {publicUrl ? (
            <button type="button" onClick={remove} className="text-[12.5px] font-medium text-ink-3 hover:text-primary tap inline-flex items-center gap-1">
              <X className="h-3 w-3" /> Retirer
            </button>
          ) : (
            <p className="text-[12.5px] text-ink-3 leading-relaxed">
              JPG, PNG ou WebP — 3 Mo max.
              <br />
              <span className="text-ink-4">Photo professionnelle nette, fond neutre.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;
