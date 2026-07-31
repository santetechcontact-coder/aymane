import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileText } from "lucide-react";
import logo from "@/assets/aymane-logo.png";
import { supabase } from "@/integrations/supabase/client";

type InvoiceData = {
  id: string;
  invoice_number: string;
  patient_id: string;
  provider_id: string;
  amount_fcfa: number;
  currency: string;
  issued_at: string;
  metadata: Record<string, unknown>;
  provider_services: { title: string; description: string | null } | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  professional_address: string | null;
};

const Invoice = () => {
  const { id } = useParams();
  const db: SupabaseClient = supabase;
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Facture AYMANE";
    const load = async () => {
      if (!id) return;
      const { data } = await db.from("invoices").select("*, provider_services(title, description)").eq("id", id).maybeSingle();
      if (data) {
        setInvoice(data as InvoiceData);
        const { data: profileData } = await db.from("profiles").select("id, full_name, phone, city, professional_address").in("id", [data.patient_id, data.provider_id]);
        setProfiles(Object.fromEntries(((profileData ?? []) as Profile[]).map((profile) => [profile.id, profile])));
      }
      setLoading(false);
    };
    void load();
  }, [id]);

  if (loading) return <main className="min-h-[100dvh] bg-background p-6"><p className="text-center text-[13px] text-ink-3">Ouverture de la facture…</p></main>;

  if (!invoice) {
    return (
      <main className="min-h-[100dvh] bg-background p-5">
        <section className="mx-auto mt-16 max-w-md rounded-[1rem] border border-hairline bg-surface-0 p-6 text-center">
          <FileText className="mx-auto h-6 w-6 text-ink-4" />
          <h1 className="mt-3 font-display text-2xl text-ink">Facture indisponible.</h1>
          <Link to="/dashboard/invoices" className="mt-4 inline-flex text-[12px] font-semibold text-primary">Retour aux factures</Link>
        </section>
      </main>
    );
  }

  const patient = profiles[invoice.patient_id];
  const provider = profiles[invoice.provider_id];

  return (
    <main className="invoice-page min-h-[100dvh] bg-background px-4 py-5 text-ink sm:px-6 sm:py-8">
      <div className="invoice-actions mx-auto mb-4 flex max-w-3xl items-center justify-between">
        <Link to="/dashboard/invoices" className="flex h-10 items-center gap-2 rounded-full border border-hairline bg-surface-0 px-3 text-[11.5px] font-semibold text-ink-2"><ArrowLeft className="h-3.5 w-3.5" /> Retour</Link>
        <button type="button" onClick={() => window.print()} className="flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[11.5px] font-semibold text-white"><Download className="h-3.5 w-3.5" /> Imprimer / PDF</button>
      </div>

      <article className="invoice-sheet mx-auto max-w-3xl rounded-[1rem] border border-hairline bg-white p-5 shadow-sm sm:p-8">
        <header className="flex items-start justify-between gap-5 border-b border-hairline pb-6">
          <div>
            <img src={logo} alt="AYMANE" className="h-9 w-auto object-contain" />
            <p className="mt-3 text-[11px] text-ink-3">Plateforme de santé numérique · Sénégal</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-ink-4">Facture</p>
            <p className="mt-1 font-display text-xl text-ink">{invoice.invoice_number}</p>
            <p className="mt-1 text-[10.5px] text-ink-3">{new Date(invoice.issued_at).toLocaleDateString("fr-SN", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
        </header>

        <div className="grid gap-5 border-b border-hairline py-6 sm:grid-cols-2">
          <Party label="Prestataire" profile={provider} />
          <Party label="Patient" profile={patient} />
        </div>

        <div className="py-6">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-hairline pb-2 text-[10px] font-mono uppercase tracking-[0.08em] text-ink-4">
            <span>Service</span><span>Montant</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
            <div>
              <p className="text-[13.5px] font-semibold text-ink">{invoice.provider_services?.title || "Service de santé"}</p>
              {invoice.provider_services?.description && <p className="mt-1 text-[11.5px] text-ink-3">{invoice.provider_services.description}</p>}
            </div>
            <p className="text-[14px] font-semibold text-ink">{new Intl.NumberFormat("fr-SN").format(invoice.amount_fcfa)} FCFA</p>
          </div>
        </div>

        <div className="ml-auto max-w-xs border-t border-ink pt-3">
          <div className="flex items-center justify-between gap-8">
            <span className="text-[12px] font-semibold text-ink">Total payé</span>
            <span className="font-display text-2xl text-primary">{new Intl.NumberFormat("fr-SN").format(invoice.amount_fcfa)} FCFA</span>
          </div>
        </div>

        <footer className="mt-10 border-t border-hairline pt-4 text-center">
          <p className="text-[10.5px] leading-relaxed text-ink-4">Facture générée après confirmation du paiement. Conservez ce document pour votre suivi.</p>
        </footer>
      </article>
    </main>
  );
};

const Party = ({ label, profile }: { label: string; profile?: Profile }) => (
  <div>
    <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-ink-4">{label}</p>
    <p className="mt-2 text-[13.5px] font-semibold text-ink">{profile?.full_name || "Compte AYMANE"}</p>
    {profile?.professional_address && <p className="mt-0.5 text-[11px] text-ink-3">{profile.professional_address}</p>}
    {profile?.city && <p className="mt-0.5 text-[11px] text-ink-3">{profile.city}, Sénégal</p>}
    {profile?.phone && <p className="mt-0.5 text-[11px] text-ink-3">{profile.phone}</p>}
  </div>
);

export default Invoice;
