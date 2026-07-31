import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowLeft, FileText, Lock, Scale, ShieldCheck } from "lucide-react";

type LegalType = "privacy" | "terms" | "mentions" | "security";

const CONTENT: Record<LegalType, {
  title: string;
  intro: string;
  icon: typeof ShieldCheck;
  sections: { title: string; body: string }[];
}> = {
  privacy: {
    title: "Politique de confidentialité",
    intro: "AYMANE traite les données de santé comme des données sensibles. Cette page résume nos engagements de confidentialité.",
    icon: Lock,
    sections: [
      { title: "Données collectées", body: "Identité, coordonnées, informations médicales déclarées, documents de santé, rendez-vous, messages et traces de sécurité nécessaires au service." },
      { title: "Finalité", body: "Coordonner les soins, sécuriser l'accès au dossier médical, faciliter les consultations, pharmacies, laboratoires et demandes SOS." },
      { title: "Contrôle utilisateur", body: "Chaque patient doit pouvoir consulter, corriger et demander la suppression de ses données selon le cadre légal applicable." },
    ],
  },
  terms: {
    title: "Conditions générales d'utilisation",
    intro: "AYMANE est un outil de coordination et d'orientation. Il ne remplace pas une consultation médicale ni les services d'urgence.",
    icon: FileText,
    sections: [
      { title: "Usage du service", body: "L'utilisateur s'engage à fournir des informations exactes et à contacter un professionnel ou les secours en cas de signe grave." },
      { title: "Orientation santé", body: "L'orientation aide à prioriser un parcours de soins; elle ne constitue pas un diagnostic autonome." },
      { title: "Professionnels", body: "Les comptes soignants et structures doivent être vérifiés avant visibilité publique ou prise de rendez-vous." },
    ],
  },
  mentions: {
    title: "Mentions légales",
    intro: "Informations éditoriales AYMANE au Sénégal.",
    icon: Scale,
    sections: [
      { title: "Éditeur", body: "AYMANE, service numérique de coordination et d'orientation santé." },
      { title: "Contact", body: "Pour toute demande administrative ou partenariale, vous pouvez écrire à santetech.contact@gmail.com." },
      { title: "Hébergement", body: "Service hébergeable chez un prestataire compatible avec les exigences de confidentialité, de disponibilité et de protection des données de santé." },
    ],
  },
  security: {
    title: "Sécurité",
    intro: "La sécurité est intégrée au parcours: identité vérifiée, accès limités, documents protégés et actions sensibles traçables.",
    icon: ShieldCheck,
    sections: [
      { title: "Accès", body: "Chaque espace limite les informations affichées aux personnes autorisées: patient, praticien, pharmacie, laboratoire, structure ou administration." },
      { title: "Données", body: "Les données médicales restent protégées pendant leur transmission et leur consultation, avec un accès réservé aux acteurs concernés." },
      { title: "Traçabilité", body: "Les actions sensibles sont conservées pour contrôle: consultation d'un dossier, ajout de document, urgence SOS ou validation d'un prestataire." },
    ],
  },
};

const Legal = ({ type }: { type: LegalType }) => {
  const page = CONTENT[type];
  const Icon = page.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-content" className="px-5 md:px-8 pt-28 pb-20">
        <div className="mx-auto max-w-3xl">
          <Link to="/" className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-3 hover:text-ink tap">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>

          <header className="mt-8">
            <div className="size-12 squircle-lg bg-primary-soft text-primary grid place-items-center mb-5">
              <Icon className="h-5 w-5" strokeWidth={2.3} />
            </div>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.02] text-ink text-balance">
              {page.title}
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-ink-3 max-w-2xl">
              {page.intro}
            </p>
          </header>

          <section className="mt-10 divide-y divide-hairline border-y border-hairline">
            {page.sections.map((section) => (
              <article key={section.title} className="py-5 md:py-6">
                <h2 className="font-display text-xl text-ink">{section.title}</h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">{section.body}</p>
              </article>
            ))}
          </section>

          <p className="mt-8 text-[12.5px] leading-relaxed text-ink-4">
            Note : ces informations peuvent évoluer et seront tenues à jour avant l'ouverture publique du service.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Legal;
