import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  MapPin,
  MessageCircle,
  Pill,
  Search,
  Stethoscope,
  Wallet,
} from "lucide-react";
import heroPhoto from "@/assets/hero.jpg";

const commonNeeds = [
  "Fièvre enfant depuis hier",
  "Tension élevée",
  "Ordonnance à préparer",
] as const;

const productSignals = [
  { label: "Orientation", value: "à faire aujourd'hui", icon: Stethoscope },
  { label: "Pharmacie", value: "stock à confirmer", icon: Pill },
  { label: "Paiement", value: "Wave prêt", icon: Wallet },
] as const;

const careSteps = [
  { label: "Poste de santé", detail: "structure adaptée", icon: MapPin },
  { label: "Pédiatrie", detail: "consultation conseillée", icon: Stethoscope },
  { label: "Carnet prêt", detail: "documents regroupés", icon: FileText },
] as const;

const SenegalProductHero = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/triage?q=${encodeURIComponent(q)}` : "/triage");
  };

  return (
    <section className="relative overflow-hidden bg-surface-1/45 pb-3 pt-[76px] md:bg-transparent md:pb-16 md:pt-28">

      <div className="relative mx-auto max-w-6xl px-4 sm:px-5 md:px-8">
        <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="min-w-0"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-ink-2">
                <span className="size-2 rounded-full bg-secondary" />
                Santé mobile au Sénégal
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-3">
                <MapPin className="h-3.5 w-3.5 text-primary" strokeWidth={2.3} />
                Dakar et régions
              </span>
            </div>

            <h1 className="mt-4 max-w-2xl text-balance font-display text-[35px] leading-[0.96] text-ink sm:text-5xl md:text-6xl">
              Le bon soin, la bonne adresse, le bon suivi.
            </h1>

            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-ink-3 md:text-lg">
              Décrivez le besoin. AYMANE indique la prochaine étape et ce qu'il faut préparer
              avant de partir.
            </p>

            <form onSubmit={submit} className="mt-4 rounded-[1.2rem] border border-hairline bg-surface-0 p-2 shadow-md md:mt-5 md:rounded-[1.35rem]">
              <label htmlFor="hero-care-input" className="sr-only">
                Décrivez votre besoin de santé
              </label>
              <div className="flex items-center gap-2 rounded-[0.95rem] border border-hairline bg-surface-1 px-3">
                <Search className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.4} />
                <input
                  id="hero-care-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-4 md:h-12"
                  placeholder="Ex. fièvre, ordonnance, rendez-vous..."
                />
              </div>
              <button type="submit" className="btn-pill mt-2 h-11 w-full bg-ink text-[14.5px] font-semibold text-white md:h-12">
                Voir quoi faire
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </form>

            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {commonNeeds.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => navigate(`/triage?q=${encodeURIComponent(item)}`)}
                  className="shrink-0 rounded-full border border-hairline bg-surface-0 px-3 py-2 text-[11.5px] font-semibold text-ink-2 tap"
                >
                  {item}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.82, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="min-w-0"
          >
            <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr] lg:gap-4">
              <div className="hidden overflow-hidden rounded-[1.4rem] bg-ink p-3 text-white shadow-xl md:block">
                <div className="relative min-h-[360px] overflow-hidden rounded-[1.05rem]">
                  <img
                    src={heroPhoto}
                    alt="Professionnelle de santé consultant un téléphone"
                    className="absolute inset-0 h-full w-full object-cover object-[50%_28%]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />
                  <div className="absolute left-4 top-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/94 px-3 py-1.5 text-[11.5px] font-semibold text-ink">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      Dakar et régions
                    </span>
                  </div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <p className="text-[12px] text-white/68">Avant de partir</p>
                    <h2 className="mt-2 max-w-md font-display text-3xl leading-none">
                      Vérifier, orienter, suivre.
                    </h2>
                  </div>
                </div>
              </div>

              <ProductPreview />
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
};

const ProductPreview = () => (
  <div className="relative mx-auto w-full max-w-[420px] rounded-[1.25rem] border border-hairline bg-surface-0 p-2 shadow-xl md:max-w-none md:rounded-[1.55rem] md:p-3">
    <div className="rounded-[1.05rem] bg-ink p-3 text-white md:rounded-[1.25rem] md:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-primary-glow md:text-[11px]">Aujourd'hui</p>
          <h2 className="mt-1.5 font-display text-xl leading-none md:mt-2 md:text-2xl">Parcours patient</h2>
        </div>
        <span className="grid size-9 place-items-center rounded-[0.8rem] bg-white/10 md:size-10 md:rounded-[0.85rem]">
          <Stethoscope className="h-4 w-4 text-primary-glow" strokeWidth={2.4} />
        </span>
      </div>

      <div className="mt-3 rounded-[0.9rem] bg-white p-3 text-ink md:mt-4 md:rounded-[1rem] md:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-primary md:text-[11px]">Orientation prête</p>
            <h3 className="mt-1 font-display text-lg leading-tight md:text-xl">Fièvre chez un enfant</h3>
          </div>
          <span className="rounded-full bg-warning-soft px-2 py-1 text-[9.5px] font-bold text-warning md:px-2.5 md:text-[10.5px]">
            aujourd'hui
          </span>
        </div>
        <p className="mt-3 hidden text-[12.5px] leading-relaxed text-ink-3 sm:block">
          Carnet médical, pharmacie proche et rendez-vous restent regroupés.
        </p>

        <div className="mt-3 divide-y divide-hairline md:mt-4">
          {careSteps.map(({ label, detail, icon: Icon }, index) => (
            <div
              key={label}
              className={`items-center gap-2.5 py-2 first:pt-0 last:pb-0 md:gap-3 md:py-3 ${
                index === 2 ? "hidden min-[341px]:flex" : "flex"
              }`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-[0.75rem] bg-primary-soft text-primary md:size-9 md:rounded-[0.85rem]">
                <Icon className="h-4 w-4" strokeWidth={2.35} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold md:text-[13.5px]">{label}</p>
                <p className="text-[10.5px] text-ink-3 max-[340px]:hidden md:text-[11.5px]">{detail}</p>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2.5} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 hidden grid-cols-3 gap-2 md:grid">
        {productSignals.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[0.9rem] border border-white/10 bg-white/6 p-3">
            <Icon className="h-4 w-4 text-primary-glow" strokeWidth={2.35} />
            <p className="mt-3 text-[11.5px] font-semibold text-white">{label}</p>
            <p className="mt-1 text-[10.5px] leading-tight text-white/58">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 hidden items-center gap-2 rounded-[0.95rem] bg-white/8 p-3 md:flex">
        <MessageCircle className="h-4 w-4 shrink-0 text-primary-glow" strokeWidth={2.35} />
        <p className="min-w-0 flex-1 truncate text-[12px] text-white/74">
          AYMANE oriente. Le soignant confirme la prise en charge.
        </p>
        <CalendarClock className="h-4 w-4 shrink-0 text-white/45" strokeWidth={2.2} />
      </div>
    </div>
  </div>
);

export default SenegalProductHero;
