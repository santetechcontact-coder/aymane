import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Minus, Phone, Pill, Plus, Search, ShoppingBag, Wallet } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import PublicToolLayout from "@/components/PublicToolLayout";
import { Stagger, StaggerItem } from "@/components/Motion";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { publicFallbackData } from "@/hooks/useLandingOperations";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  LOCAL_PAYMENT_METHODS,
  LocalPaymentProviderId,
  formatFCFA,
  isValidPaymentPhone,
  normalizePaymentPhone,
} from "@/lib/local-payments";

type Medication = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  stock: number;
  requires_prescription: boolean;
};

type PharmacyPaymentRpc = {
  rpc: (
    fn: "create_pharmacy_order_with_local_payment",
    args: {
      _items: Json;
      _provider: LocalPaymentProviderId;
      _payer_phone: string;
    },
  ) => Promise<{
    data: { order_id: string; payment_request_id: string } | null;
    error: { message?: string } | null;
  }>;
};

const CART_STORAGE_KEY = "aymane-pharmacy-cart-v1";

const readStoredCart = (): Record<string, number> => {
  try {
    const value = window.sessionStorage.getItem(CART_STORAGE_KEY);
    if (!value) return {};
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] => (
        typeof entry[1] === "number" && Number.isInteger(entry[1]) && entry[1] > 0
      )),
    );
  } catch {
    return {};
  }
};

const Pharmacy = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [cart, setCart] = useState<Record<string, number>>(readStoredCart);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dataSource, setDataSource] = useState<"live" | "fallback">("live");
  const [reloadKey, setReloadKey] = useState(0);
  const [paymentProvider, setPaymentProvider] = useState<LocalPaymentProviderId>("wave");
  const [paymentPhone, setPaymentPhone] = useState("+221");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    document.title = "Pharmacie et médicaments au Sénégal — AYMANE";
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    const fallbackMedications: Medication[] = publicFallbackData.medications.map((medication) => ({
      ...medication,
      description: medication.requires_prescription
        ? "Disponibilité à confirmer avec ordonnance."
        : "Stock indicatif à confirmer avant déplacement.",
      category: null,
    }));

    if (import.meta.env.VITE_PUBLIC_LANDING_DATA !== "true") {
      setMedications(fallbackMedications);
      setDataSource("fallback");
      setLoading(false);
      return () => {
        active = false;
      };
    }

    supabase
      .from("medications")
      .select("*")
      .order("name")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setMedications(fallbackMedications);
          setDataSource("fallback");
        } else {
          setMedications(data?.length ? data : fallbackMedications);
          setDataSource(data?.length ? "live" : "fallback");
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    window.sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? medications.filter((medication) => medication.name.toLowerCase().includes(normalized))
      : medications;
  }, [medications, query]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => ({ medication: medications.find((item) => item.id === id), quantity }))
        .filter((item): item is { medication: Medication; quantity: number } => Boolean(item.medication)),
    [cart, medications],
  );

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.medication.price) * item.quantity, 0),
    [cartItems],
  );
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const add = (id: string) => {
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  };

  const remove = (id: string) => {
    setCart((current) => {
      const next = { ...current };
      if ((next[id] ?? 0) > 1) next[id] -= 1;
      else delete next[id];
      return next;
    });
  };

  const checkout = async () => {
    if (cartItems.length === 0 || checkoutLoading) return;
    if (!user) {
      toast({
        title: "Votre panier est conservé",
        description: "Connectez-vous pour confirmer la commande.",
      });
      navigate("/auth", { state: { from: location } });
      return;
    }

    const phone = normalizePaymentPhone(paymentPhone);
    if (!isValidPaymentPhone(phone)) {
      toast({
        title: "Numéro à vérifier",
        description: "Indiquez le numéro qui recevra la demande de paiement.",
        variant: "destructive",
      });
      return;
    }

    const items = cartItems.map((item) => ({
      medication_id: item.medication.id,
      quantity: item.quantity,
    }));

    setCheckoutLoading(true);
    const pharmacyPaymentClient = supabase as unknown as PharmacyPaymentRpc;
    const { data, error } = await pharmacyPaymentClient.rpc("create_pharmacy_order_with_local_payment", {
      _items: items as Json,
      _provider: paymentProvider,
      _payer_phone: phone,
    });
    setCheckoutLoading(false);

    if (error) {
      toast({
        title: "La commande n'a pas été préparée",
        description: "Vérifiez le panier et le numéro de paiement, puis réessayez.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Commande prête",
      description: data?.payment_request_id
        ? "Le paiement est disponible dans votre suivi."
        : `Montant indicatif : ${total.toLocaleString("fr-SN")} FCFA`,
    });
    setCart({});
    navigate("/dashboard/payments");
  };

  const CartContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-hairline pb-5">
        <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-primary">Votre sélection</p>
        <h2 className="mt-2 font-display text-2xl text-ink">
          {cartCount} article{cartCount > 1 ? "s" : ""}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {cartItems.length === 0 ? (
          <div className="py-10 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-[0.8rem] bg-surface-1 text-ink-3">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[13px] font-semibold text-ink">Votre panier est vide.</p>
            <p className="mt-1 text-[12px] text-ink-3">Ajoutez un médicament pour préparer votre demande.</p>
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {cartItems.map(({ medication, quantity }) => (
              <li key={medication.id} className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{medication.name}</p>
                  <p className="mt-1 text-[11px] tabular-nums text-ink-3">
                    {Number(medication.price).toLocaleString("fr-SN")} FCFA l'unité
                  </p>
                </div>
                <QuantityControl
                  quantity={quantity}
                  onRemove={() => remove(medication.id)}
                  onAdd={() => add(medication.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {cartItems.length > 0 ? (
        <div className="space-y-4 border-t border-hairline pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-semibold text-ink-3">Montant indicatif</span>
            <span className="font-display text-2xl tabular-nums text-ink">
              {formatFCFA(total)}
            </span>
          </div>

          {user ? (
            <div className="space-y-3 rounded-[0.9rem] border border-hairline bg-surface-1 p-3">
              <div className="flex items-start gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-[0.7rem] bg-primary-soft text-primary">
                  <Wallet className="h-3.5 w-3.5" strokeWidth={2.35} />
                </span>
                <div>
                  <p className="text-[12.5px] font-semibold text-ink">Paiement mobile</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-3">
                    Choisissez le compte qui recevra la demande.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {LOCAL_PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentProvider(method.id)}
                    className={`min-h-10 rounded-[0.7rem] border px-2.5 text-left text-[11.5px] font-semibold tap ${
                      paymentProvider === method.id
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-hairline bg-surface-0 text-ink-3"
                    }`}
                    aria-pressed={paymentProvider === method.id}
                    title={method.hint}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 rounded-[0.75rem] border border-hairline bg-surface-0 px-3 py-2.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={2.35} />
                <span className="sr-only">Numéro de paiement</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={paymentPhone}
                  onChange={(event) => setPaymentPhone(event.target.value)}
                  placeholder="+221 77 123 45 67"
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-ink outline-none placeholder:text-ink-4"
                />
              </label>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void checkout()}
            disabled={checkoutLoading}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[0.75rem] bg-primary px-4 text-[13px] font-semibold text-white tap disabled:opacity-60"
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Préparation...
              </>
            ) : user ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirmer et payer
              </>
            ) : (
              "Se connecter pour commander"
            )}
          </button>
          <p className="text-[10.5px] leading-relaxed text-ink-4">
            La disponibilité et le prix final sont confirmés par la pharmacie.
          </p>
        </div>
      ) : null}
    </div>
  );

  const cartAction = (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="relative grid size-9 place-items-center rounded-[0.7rem] border border-hairline bg-surface-0 text-ink-2 tap"
          aria-label={`Ouvrir le panier, ${cartCount} article(s)`}
        >
          <ShoppingBag className="h-4 w-4" />
          {cartCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-white">
              {cartCount}
            </span>
          ) : null}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[88dvh] rounded-t-[1rem] border-t border-hairline bg-background p-5">
        <SheetTitle className="sr-only">Panier pharmacie</SheetTitle>
        <SheetDescription className="sr-only">
          Consultez les médicaments ajoutés, ajustez les quantités et confirmez la commande.
        </SheetDescription>
        {CartContent}
      </SheetContent>
    </Sheet>
  );

  const content = (
    <>
      <PageHeader
        eyebrow="Avant de vous déplacer"
        title="Vérifiez un"
        italic="médicament."
        description="Consultez les stocks et les prix indicatifs, puis préparez votre demande depuis votre téléphone."
      />

      {!user ? (
        <div className="mb-6 flex items-start gap-3 border-y border-hairline py-3 text-[12.5px] text-ink-3">
          <span className="mt-1 size-2 shrink-0 rounded-full bg-secondary" />
          <p>Recherche libre et panier conservé. La connexion est demandée uniquement pour confirmer.</p>
        </div>
      ) : null}

      {dataSource === "fallback" && !loading ? (
        <div className="mb-6 rounded-[0.9rem] border border-hairline bg-surface-0 p-4 text-[12.5px] leading-relaxed text-ink-3">
          Les stocks vérifiés sont en cours de publication. AYMANE affiche pour l'instant les repères de pharmacie disponibles.
        </div>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-label="Catalogue de médicaments" className="min-w-0">
          <label className="relative mb-4 block border-b border-hairline pb-3">
            <span className="sr-only">Rechercher un médicament</span>
            <Search className="absolute left-0 top-3.5 h-4 w-4 text-ink-3" />
            <Input
              placeholder="Nom du médicament"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 rounded-none border-0 bg-transparent pl-7 font-display text-[18px] shadow-none placeholder:text-ink-4 focus-visible:ring-0"
            />
          </label>

          <div className="mb-2 flex items-center justify-between gap-3 text-[11.5px] text-ink-4">
            <p>{loading ? "Vérification du stock" : `${filtered.length} médicament(s) affiché(s)`}</p>
            <p>Prix en FCFA</p>
          </div>

          {loading ? (
            <MedicationSkeleton />
          ) : loadError ? (
            <div className="state-panel">
              <p className="font-semibold text-ink">Le catalogue ne peut pas être chargé.</p>
              <p className="mt-1 text-[13px] text-ink-3">Vérifiez votre connexion puis réessayez.</p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-4 rounded-[0.7rem] bg-ink px-4 py-2.5 text-[12.5px] font-semibold text-white tap"
              >
                Réessayer
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="state-panel">
              <p className="font-semibold text-ink">Aucun médicament ne correspond à cette recherche.</p>
              <p className="mt-1 text-[13px] text-ink-3">Vérifiez l'orthographe ou essayez le nom de la molécule.</p>
            </div>
          ) : (
            <Stagger className="divide-y divide-hairline border-y border-hairline">
              {filtered.map((medication, index) => {
                const quantity = cart[medication.id] ?? 0;
                return (
                  <StaggerItem key={medication.id}>
                    <article className="relative py-4 pr-20 md:grid md:grid-cols-[2rem_minmax(0,1fr)_8rem_7.5rem] md:items-center md:gap-4 md:py-5 md:pr-0">
                      <div className="mb-3 flex items-center justify-between gap-3 md:mb-0 md:block">
                        <span className="font-mono text-[10.5px] tabular-nums text-ink-4">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <StockLabel stock={medication.stock} className="md:hidden" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 hidden size-9 shrink-0 place-items-center rounded-[0.7rem] bg-primary-soft text-primary sm:grid md:hidden">
                            <Pill className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-display text-[20px] leading-tight text-ink md:text-[22px]">{medication.name}</h3>
                            {medication.description ? (
                              <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-3">
                                {medication.description}
                              </p>
                            ) : null}
                            {medication.requires_prescription ? (
                              <p className="mt-2 text-[10.5px] font-semibold text-accent">Ordonnance requise</p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3 md:mt-0 md:block md:text-right">
                        <div>
                          <p className="font-display text-[20px] tabular-nums text-ink">
                            {Number(medication.price).toLocaleString("fr-SN")}
                          </p>
                          <p className="text-[10px] font-semibold text-ink-4">FCFA</p>
                        </div>
                        <StockLabel stock={medication.stock} className="hidden md:inline-flex" />
                      </div>

                      <div className="absolute bottom-4 right-0 flex justify-end md:static md:mt-0">
                        {medication.stock <= 0 ? (
                          <span className="text-[11px] font-semibold text-ink-4">Indisponible</span>
                        ) : quantity > 0 ? (
                          <QuantityControl
                            quantity={quantity}
                            onRemove={() => remove(medication.id)}
                            onAdd={() => add(medication.id)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => add(medication.id)}
                            className="min-h-10 rounded-[0.7rem] bg-ink px-3 text-[12px] font-semibold text-white tap"
                          >
                            Ajouter
                          </button>
                        )}
                      </div>
                    </article>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-24 h-[68dvh] rounded-[1rem] border border-hairline bg-surface-0 p-5 shadow-xs">
            {CartContent}
          </div>
        </aside>
      </div>
    </>
  );

  return user ? (
    <DashboardLayout title="Pharmacie" back mobileAction={cartAction}>{content}</DashboardLayout>
  ) : (
    <PublicToolLayout title="Pharmacie" mobileAction={cartAction}>{content}</PublicToolLayout>
  );
};

const QuantityControl = ({
  quantity,
  onRemove,
  onAdd,
}: {
  quantity: number;
  onRemove: () => void;
  onAdd: () => void;
}) => (
  <div className="inline-flex items-center rounded-[0.7rem] border border-hairline bg-surface-0 p-1">
    <button type="button" onClick={onRemove} className="grid size-8 place-items-center rounded-[0.5rem] text-ink-3 tap" aria-label="Retirer une unité">
      <Minus className="h-3.5 w-3.5" />
    </button>
    <span className="w-7 text-center font-mono text-[12px] font-semibold tabular-nums text-ink">{quantity}</span>
    <button type="button" onClick={onAdd} className="grid size-8 place-items-center rounded-[0.5rem] bg-primary-soft text-primary tap" aria-label="Ajouter une unité">
      <Plus className="h-3.5 w-3.5" />
    </button>
  </div>
);

const StockLabel = ({ stock, className = "" }: { stock: number; className?: string }) => (
  <span className={`items-center gap-1.5 text-[10.5px] font-semibold ${stock > 0 ? "text-secondary" : "text-ink-4"} ${className}`}>
    <span className={`size-1.5 rounded-full ${stock > 0 ? "bg-secondary" : "bg-ink-4"}`} />
    {stock > 0 ? `${stock} disponible(s)` : "Rupture"}
  </span>
);

const MedicationSkeleton = () => (
  <div className="divide-y divide-hairline border-y border-hairline">
    {[0, 1, 2, 3].map((item) => (
      <div key={item} className="flex items-center gap-4 py-5">
        <div className="flex-1 space-y-2">
          <div className="h-5 w-2/5 animate-pulse rounded-full bg-surface-2" />
          <div className="h-3 w-3/4 animate-pulse rounded-full bg-surface-1" />
        </div>
        <div className="h-9 w-20 animate-pulse rounded-[0.7rem] bg-surface-2" />
      </div>
    ))}
  </div>
);

export default Pharmacy;
