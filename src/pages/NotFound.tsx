import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Home, Search } from "lucide-react";
import logo from "@/assets/aymane-logo.png";

const NotFound = () => {
  useEffect(() => {
    document.title = "Page introuvable · AYMANE";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "Retournez vers l'accueil AYMANE ou démarrez une orientation santé.");
    if (!meta.parentNode) document.head.appendChild(meta);
  }, []);

  return (
    <main id="main-content" className="app-page-gradient min-h-[100dvh] px-5 py-8 flex items-center justify-center">
      <section className="w-full max-w-md border-t-2 border-primary bg-surface-0 p-6 shadow-sm">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <img src={logo} alt="AYMANE" className="h-9 w-auto object-contain" />
          <span className="font-display text-lg text-ink">AYMANE</span>
        </Link>

        <div className="size-12 rounded-[0.8rem] bg-primary-soft text-primary grid place-items-center">
          <Search className="h-6 w-6" strokeWidth={2.35} />
        </div>

        <p className="label text-primary mt-6 mb-3">Page introuvable</p>
        <h1 className="font-display text-4xl tracking-headline text-ink">Revenez à une action utile.</h1>
        <p className="text-[14px] text-ink-3 leading-relaxed mt-4">
          L'adresse demandée n'est pas disponible. Revenez à l'accueil ou démarrez une orientation santé.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Link to="/" className="btn-pill bg-ink text-white h-12 text-[14px]">
            <Home className="h-4 w-4" strokeWidth={2.35} />
            Accueil
          </Link>
          <Link to="/triage" className="btn-pill bg-surface-1 text-ink h-12 text-[14px]">
            <ArrowLeft className="h-4 w-4" strokeWidth={2.35} />
            Me faire guider
          </Link>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
