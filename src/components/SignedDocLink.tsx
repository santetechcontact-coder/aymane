import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2 } from "lucide-react";

interface Props {
  path: string | null | undefined;
  label: string;
  bucket?: string;
}

const SignedDocLink = ({ path, label, bucket = "provider-documents" }: Props) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) return;
    let cancel = false;
    setLoading(true);
    supabase.storage.from(bucket).createSignedUrl(path, 60 * 30).then(({ data }) => {
      if (!cancel) { setUrl(data?.signedUrl ?? null); setLoading(false); }
    });
    return () => { cancel = true; };
  }, [path, bucket]);

  if (!path) {
    return (
      <div className="flex items-baseline justify-between py-3 border-b border-ink-10">
        <span className="serif-italic text-ink-soft">{label}</span>
        <span className="label text-stone">Non fourni</span>
      </div>
    );
  }

  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="group flex items-baseline justify-between py-3 border-b border-ink-10 hover:border-ink transition-colors tap"
    >
      <span className="flex items-center gap-2 text-ink">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <span className="serif-italic text-lg">{label}</span>
      </span>
      <span className="label text-primary inline-flex items-center gap-1.5 group-hover:translate-x-0.5 transition-transform">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <>Consulter →</>}
      </span>
    </a>
  );
};

export default SignedDocLink;
