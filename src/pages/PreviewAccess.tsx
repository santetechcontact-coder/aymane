import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PreviewMode = "mobile" | "web";

type PreviewAccessProps = {
  mode: PreviewMode;
};

const previewConfig = {
  mobile: {
    label: "Vue mobile",
    title: "AYMANE en main.",
    subtitle: "Aperçu téléphone, pensé pour un patient qui cherche vite un soin, une pharmacie ou une orientation claire.",
    directLabel: "Ouvrir le produit",
    icon: Smartphone,
    width: 410,
    height: 864,
    frameClass: "rounded-[2rem] bg-ink p-[10px] shadow-xl",
    screenClass: "rounded-[1.25rem]",
    src: "/investisseurs?apercu=mobile",
  },
  web: {
    label: "Vue web",
    title: "AYMANE en grand.",
    subtitle: "Aperçu bureau pour investisseur, équipe médicale ou partenaire qui veut lire, comparer et décider vite.",
    directLabel: "Ouvrir en plein écran",
    icon: Monitor,
    width: 1280,
    height: 820,
    frameClass: "rounded-[1.1rem] border border-hairline bg-surface-0 shadow-xl",
    screenClass: "rounded-[0.9rem]",
    src: "/investisseurs?apercu=web",
  },
} satisfies Record<PreviewMode, {
  label: string;
  title: string;
  subtitle: string;
  directLabel: string;
  icon: typeof Smartphone;
  width: number;
  height: number;
  frameClass: string;
  screenClass: string;
  src: string;
}>;

const relatedLinks = [
  { label: "Accueil", href: "/" },
  { label: "Triage", href: "/triage" },
  { label: "Annuaire", href: "/annuaire" },
  { label: "Pharmacie", href: "/pharmacie" },
];

function useScaledFrame(width: number, height: number) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const isMobileViewport = window.innerWidth < 768;
      const sideSpace = isMobileViewport ? 64 : 64;
      const availableWidth = Math.max(280, window.innerWidth - sideSpace);
      const widthScale = availableWidth / width;
      if (!isMobileViewport) {
        setScale(Math.min(widthScale, 1));
        return;
      }

      const availableHeight = Math.max(360, window.innerHeight - 250);
      setScale(Math.min(widthScale, availableHeight / height, 1));
    };

    updateScale();
    window.addEventListener("resize", updateScale, { passive: true });
    return () => window.removeEventListener("resize", updateScale);
  }, [height, width]);

  return scale;
}

export default function PreviewAccess({ mode }: PreviewAccessProps) {
  const config = previewConfig[mode];
  const Icon = config.icon;
  const scale = useScaledFrame(config.width, config.height);

  useEffect(() => {
    document.title = `${config.label} AYMANE`;
  }, [config.label]);

  const frameSize = useMemo(
    () => ({
      width: Math.round(config.width * scale),
      height: Math.round(config.height * scale),
    }),
    [config.height, config.width, scale],
  );

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface-0/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            AYMANE
          </Link>
          <div className="flex items-center gap-1 md:gap-2">
            <Button asChild variant={mode === "mobile" ? "default" : "outline"} size="sm" className="px-2.5 md:px-3">
              <Link to="/vue-mobile">Mobile</Link>
            </Button>
            <Button asChild variant={mode === "web" ? "default" : "outline"} size="sm" className="px-2.5 md:px-3">
              <Link to="/vue-web">Web</Link>
            </Button>
          </div>
          <Button asChild size="sm" className="h-9 px-2.5 md:px-3">
            <a href="/investisseurs" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Direct
            </a>
          </Button>
        </div>
      </header>

      <main id="main-content" className="mx-auto flex max-w-7xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-8 md:py-8">
        <section className="grid gap-3 md:gap-4 md:grid-cols-[minmax(0,0.9fr)_auto] md:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-0 px-3 py-1.5 text-xs font-semibold text-ink-3">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              {config.label}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-display text-ink md:mt-4 md:text-5xl">
              {config.title}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink-3 md:mt-3 md:text-lg md:leading-7">
              {config.subtitle}
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:justify-end">
            {relatedLinks.map((link) => (
              <Button asChild key={link.href} variant="outline" size="sm" className="shrink-0">
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </Button>
            ))}
          </div>
        </section>

        <section className="w-full overflow-hidden rounded-[1.1rem] border border-hairline bg-surface-1 p-2 shadow-xs md:rounded-[1.25rem] md:p-4">
          <div
            className="mx-auto overflow-hidden"
            style={{ width: frameSize.width, height: frameSize.height }}
          >
            <div
              className={cn("overflow-hidden", config.frameClass)}
              style={{
                width: config.width,
                height: config.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <iframe
                title={`Aperçu AYMANE - ${config.label}`}
                src={config.src}
                className={cn("h-full w-full border-0 bg-background", config.screenClass)}
              />
            </div>
          </div>
        </section>

        <div className="grid gap-3 pb-safe-bottom md:grid-cols-[1fr_auto] md:items-center">
          <p className="text-xs leading-5 text-ink-3 md:text-sm md:leading-6">
            Cette vue permet de relire le parcours comme il se présente sur un téléphone ou sur un grand écran.
          </p>
          <Button asChild className="h-11">
            <a href={config.src} target="_blank" rel="noreferrer">
              {config.directLabel}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </main>
    </div>
  );
}
