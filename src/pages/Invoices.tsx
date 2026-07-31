import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, ReceiptText } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  patient_id: string;
  provider_id: string;
  amount_fcfa: number;
  currency: string;
  issued_at: string;
  provider_services: { title: string } | null;
};

type Profile = { id: string; full_name: string | null };

const Invoices = () => {
  const db: SupabaseClient = supabase;
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Mes factures - AYMANE";
    const load = async () => {
      const { data } = await db.from("invoices").select("*, provider_services(title)").order("issued_at", { ascending: false }).limit(100);
      const invoices = (data ?? []) as InvoiceRow[];
      setItems(invoices);
      const ids = Array.from(new Set(invoices.flatMap((item) => [item.patient_id, item.provider_id])));
      if (ids.length) {
        const { data: profileData } = await db.from("profiles").select("id, full_name").in("id", ids);
        setProfiles(Object.fromEntries(((profileData ?? []) as Profile[]).map((profile) => [profile.id, profile])));
      }
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <DashboardLayout title="Factures" back>
      <header className="mb-6">
        <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-primary">Paiements confirmés</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">Vos factures, faciles à retrouver.</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">Chaque service payé génère une facture consultable par le patient et le prestataire.</p>
      </header>

      {loading ? (
        <div className="state-panel"><p className="text-[14px] text-ink-3">Recherche de vos factures…</p></div>
      ) : items.length === 0 ? (
        <section className="rounded-[1rem] border border-dashed border-hairline bg-surface-0 px-5 py-12 text-center">
          <ReceiptText className="mx-auto h-6 w-6 text-ink-4" />
          <h2 className="mt-3 font-display text-xl text-ink">Aucune facture disponible.</h2>
          <p className="mt-1 text-[12.5px] text-ink-3">Les factures apparaissent après confirmation du paiement d'un service.</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[1rem] border border-hairline bg-surface-0">
          {items.map((invoice) => (
            <Link key={invoice.id} to={`/dashboard/invoices/${invoice.id}`} className="flex items-center gap-3 border-b border-hairline p-4 transition hover:bg-surface-1 last:border-0 sm:p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-[0.7rem] bg-primary-soft text-primary"><FileText className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">{invoice.provider_services?.title || "Service de santé"}</p>
                <p className="mt-0.5 truncate text-[10.5px] text-ink-3">{invoice.invoice_number} · {profiles[invoice.provider_id]?.full_name || "Prestataire AYMANE"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-bold text-ink">{new Intl.NumberFormat("fr-SN").format(invoice.amount_fcfa)} F</p>
                <p className="mt-0.5 text-[10px] text-ink-4">{new Date(invoice.issued_at).toLocaleDateString("fr-SN")}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-4" />
            </Link>
          ))}
        </section>
      )}
    </DashboardLayout>
  );
};

export default Invoices;
