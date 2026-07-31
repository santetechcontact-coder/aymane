import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link, useParams } from "react-router-dom";
import { Building2, FileHeart, LockKeyhole, Pill, ShieldCheck, Syringe } from "lucide-react";
import logo from "@/assets/aymane-logo.png";
import { supabase } from "@/integrations/supabase/client";

type SharedSummary = {
  profile: { full_name: string | null; city: string | null } | null;
  medical_record: {
    blood_group?: string | null;
    allergies?: string[] | null;
    chronic_diseases?: string[] | null;
    current_medications?: string[] | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
  } | null;
  vaccinations: {
    vaccine_name: string;
    dose_label: string | null;
    administered_on: string;
    next_due_on: string | null;
  }[];
  hospitalizations: {
    facility_name: string;
    reason: string;
    admitted_on: string;
    discharged_on: string | null;
    discharge_summary: string | null;
  }[];
  prescriptions: {
    medication_name: string;
    dosage: string;
    duration: string | null;
    instructions: string | null;
    created_at: string;
  }[];
};

const formatDate = (value: string) =>
  new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const SharedMedicalRecord = () => {
  const { token } = useParams();
  const db: SupabaseClient = supabase;
  const [summary, setSummary] = useState<SharedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    document.title = "Dossier santé partagé - AYMANE";
    const load = async () => {
      if (!token) {
        setInvalid(true);
        setLoading(false);
        return;
      }
      const { data, error } = await db.rpc("get_shared_medical_summary", { _token: token });
      if (error || !data) setInvalid(true);
      else setSummary(data as SharedSummary);
      setLoading(false);
    };
    void load();
  }, [token]);

  return (
    <main id="main-content" className="min-h-[100dvh] bg-background px-4 py-5 text-ink sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="AYMANE" className="h-8 w-auto object-contain" />
            <span className="font-display text-[16px]">AYMANE</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700">
            <LockKeyhole className="h-3 w-3" />
            Accès temporaire
          </span>
        </header>

        {loading ? (
          <section className="mt-16 text-center">
            <div className="mx-auto size-10 animate-pulse rounded-full bg-primary-soft" />
            <p className="mt-4 text-[13px] text-ink-3">Ouverture du dossier partagé…</p>
          </section>
        ) : invalid || !summary ? (
          <section className="mx-auto mt-16 max-w-md rounded-[1rem] border border-hairline bg-surface-0 p-6 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-1 text-ink-3"><LockKeyhole className="h-5 w-5" /></span>
            <h1 className="mt-4 font-display text-2xl">Ce partage n'est plus disponible.</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-3">Le lien a expiré ou son propriétaire a arrêté le partage. Demandez-lui un nouveau lien.</p>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-[1rem] bg-ink p-5 text-white sm:p-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/55">Résumé médical partagé</p>
                  <h1 className="mt-2 font-display text-3xl leading-tight">{summary.profile?.full_name || "Patient AYMANE"}</h1>
                  <p className="mt-1 text-[13px] text-white/60">{summary.profile?.city || "Sénégal"}</p>
                </div>
                <span className="grid size-12 shrink-0 place-items-center rounded-[0.85rem] bg-white/10"><FileHeart className="h-5 w-5" /></span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/15 pt-4">
                <Metric label="Groupe" value={summary.medical_record?.blood_group || "Non indiqué"} />
                <Metric label="Vaccins" value={String(summary.vaccinations.length)} />
                <Metric label="Ordonnances" value={String(summary.prescriptions.length)} />
              </div>
            </section>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Section icon={ShieldCheck} title="Repères importants">
                <InfoList label="Allergies" values={summary.medical_record?.allergies} empty="Aucune allergie indiquée" />
                <InfoList label="Maladies suivies" values={summary.medical_record?.chronic_diseases} empty="Aucune maladie indiquée" />
                <InfoList label="Traitements actuels" values={summary.medical_record?.current_medications} empty="Aucun traitement indiqué" />
              </Section>

              <Section icon={Syringe} title="Vaccinations">
                {summary.vaccinations.length === 0 ? <Empty text="Aucun vaccin partagé." /> : summary.vaccinations.map((item, index) => (
                  <div key={`${item.vaccine_name}-${index}`} className="border-b border-hairline py-2.5 first:pt-0 last:border-0 last:pb-0">
                    <p className="text-[13.5px] font-semibold text-ink">{item.vaccine_name}</p>
                    <p className="text-[11.5px] text-ink-3">{item.dose_label || "Dose"} · {formatDate(item.administered_on)}</p>
                  </div>
                ))}
              </Section>

              <Section icon={Pill} title="Ordonnances récentes">
                {summary.prescriptions.length === 0 ? <Empty text="Aucune ordonnance partagée." /> : summary.prescriptions.map((item, index) => (
                  <div key={`${item.medication_name}-${index}`} className="border-b border-hairline py-2.5 first:pt-0 last:border-0 last:pb-0">
                    <p className="text-[13.5px] font-semibold text-ink">{item.medication_name}</p>
                    <p className="text-[11.5px] text-ink-3">{item.dosage}{item.duration ? ` · ${item.duration}` : ""}</p>
                  </div>
                ))}
              </Section>

              <Section icon={Building2} title="Hospitalisations">
                {summary.hospitalizations.length === 0 ? <Empty text="Aucun séjour partagé." /> : summary.hospitalizations.map((item, index) => (
                  <div key={`${item.facility_name}-${index}`} className="border-b border-hairline py-2.5 first:pt-0 last:border-0 last:pb-0">
                    <p className="text-[13.5px] font-semibold text-ink">{item.facility_name}</p>
                    <p className="text-[11.5px] text-ink-3">{item.reason} · {formatDate(item.admitted_on)}</p>
                  </div>
                ))}
              </Section>
            </div>

            <p className="mx-auto mt-6 max-w-xl text-center text-[10.5px] leading-relaxed text-ink-4">
              Ce résumé a été partagé volontairement par le patient. En cas d'urgence, suivez les protocoles médicaux habituels.
            </p>
          </>
        )}
      </div>
    </main>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <p className="text-[9.5px] uppercase text-white/45">{label}</p>
    <p className="mt-1 truncate text-[13px] font-semibold">{value}</p>
  </div>
);

const Section = ({ icon: Icon, title, children }: { icon: typeof ShieldCheck; title: string; children: React.ReactNode }) => (
  <section className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-[0.6rem] bg-primary-soft text-primary"><Icon className="h-3.5 w-3.5" /></span>
      <h2 className="font-display text-lg text-ink">{title}</h2>
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

const InfoList = ({ label, values, empty }: { label: string; values?: string[] | null; empty: string }) => (
  <div className="border-b border-hairline py-2.5 first:pt-0 last:border-0">
    <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3">{label}</p>
    <p className="mt-1 text-[13px] leading-relaxed text-ink">{values?.length ? values.join(", ") : empty}</p>
  </div>
);

const Empty = ({ text }: { text: string }) => <p className="text-[12.5px] text-ink-3">{text}</p>;

export default SharedMedicalRecord;
