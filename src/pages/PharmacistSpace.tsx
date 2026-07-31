import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Package, Plus, Search, AlertTriangle, Pill, TrendingUp, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Med = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  stock: number;
  requires_prescription: boolean;
};

const PharmacistSpace = () => {
  const { hasRole, loading } = useAuth();
  const [meds, setMeds] = useState<Med[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out" | "rx">("all");
  const [form, setForm] = useState({
    name: "", description: "", category: "",
    price: "", stock: "", requires_prescription: false,
  });

  const load = async () => {
    const { data } = await supabase.from("medications").select("*").order("name");
    setMeds((data as Med[]) ?? []);
  };

  useEffect(() => {
    document.title = "Espace pharmacien — AYMANE";
    if (hasRole("pharmacist") || hasRole("admin")) load();
  }, [hasRole]);

  const stats = useMemo(() => {
    const total = meds.length;
    const low = meds.filter((m) => m.stock > 0 && m.stock < 10).length;
    const out = meds.filter((m) => m.stock === 0).length;
    const rx = meds.filter((m) => m.requires_prescription).length;
    return { total, low, out, rx };
  }, [meds]);

  const filtered = useMemo(() => {
    let base = meds;
    if (filter === "low") base = base.filter((m) => m.stock > 0 && m.stock < 10);
    if (filter === "out") base = base.filter((m) => m.stock === 0);
    if (filter === "rx") base = base.filter((m) => m.requires_prescription);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q),
      );
    }
    return base;
  }, [meds, search, filter]);

  if (loading) return null;
  if (!hasRole("pharmacist") && !hasRole("admin")) {
    return (
      <DashboardLayout title="Espace pharmacien">
        <div className="state-panel">
          <div className="size-12 squircle bg-warning-soft grid place-items-center mx-auto mb-4">
            <Package className="h-5 w-5 text-warning" />
          </div>
          <h2 className="font-display text-xl text-ink mb-2">Accès réservé aux pharmaciens</h2>
          <p className="text-[13.5px] text-ink-3">
            Demandez à un administrateur le rôle « pharmacien » pour accéder à cet espace.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const add = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("medications").insert({
      name: form.name.trim(),
      description: form.description || null,
      category: form.category || null,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      requires_prescription: form.requires_prescription,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Médicament ajouté" });
    setOpen(false);
    setForm({ name: "", description: "", category: "", price: "", stock: "", requires_prescription: false });
    load();
  };

  return (
    <DashboardLayout title="Pharmacie">
      <motion.header
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="mb-8 flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-7 squircle bg-secondary-soft grid place-items-center">
              <Pill className="h-3.5 w-3.5 text-secondary" strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-ink-3">
              Catalogue & stock
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl tracking-display text-ink leading-[1.05]">
            Votre <span className="text-gradient-primary">officine</span>.
          </h1>
          <p className="mt-3 text-[15px] text-ink-3 max-w-xl">
            Gérez votre catalogue, surveillez les ruptures et traitez les ordonnances en un coup d'œil.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-pill h-11 px-5 bg-ink text-white hover:bg-ink-2 shadow-md">
              <Plus className="h-4 w-4 mr-1.5" /> Ajouter un médicament
            </Button>
          </DialogTrigger>
          <DialogContent className="squircle-xl glass-strong ring-inner border-0">
            <DialogHeader>
              <DialogTitle className="font-display tracking-headline">Nouveau médicament</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-ink-3">Nom commercial</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-11 squircle-lg bg-surface-1/80 border-hairline" placeholder="Ex. Doliprane 500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-ink-3">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="squircle-lg bg-surface-1/80 border-hairline" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-ink-3">Catégorie</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-11 squircle-lg bg-surface-1/80 border-hairline" placeholder="Antalgique, antibiotique…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-ink-3">Prix (FCFA)</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="h-11 squircle-lg bg-surface-1/80 border-hairline" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-ink-3">Stock</Label>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="h-11 squircle-lg bg-surface-1/80 border-hairline" />
                </div>
              </div>
              <label className="flex items-center gap-2 squircle-lg bg-surface-1/60 border border-hairline px-4 py-3 cursor-pointer">
                <input type="checkbox" className="size-4 accent-primary"
                  checked={form.requires_prescription}
                  onChange={(e) => setForm({ ...form, requires_prescription: e.target.checked })} />
                <span className="text-[13px] text-ink-2">Nécessite une ordonnance</span>
              </label>
              <Button onClick={add} className="btn-pill w-full h-11 bg-ink text-white mt-2">
                Ajouter au catalogue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.header>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Stat icon={Package} label="Références" value={stats.total} tone="primary" />
        <Stat icon={AlertTriangle} label="Stock faible" value={stats.low} tone="warning" hint="< 10 unités" />
        <Stat icon={TrendingUp} label="Ruptures" value={stats.out} tone="accent" />
        <Stat icon={ShieldCheck} label="Sur ordonnance" value={stats.rx} tone="secondary" />
      </section>

      {/* Filters */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {([
            { k: "all", l: `Tous (${stats.total})` },
            { k: "low", l: `Stock faible (${stats.low})` },
            { k: "out", l: `Ruptures (${stats.out})` },
            { k: "rx", l: `Sur ordonnance (${stats.rx})` },
          ] as const).map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={cn(
                "squircle-full px-4 h-9 text-[13px] font-medium tap whitespace-nowrap transition-colors",
                filter === f.k ? "bg-ink text-white" : "glass ring-inner text-ink-2 hover:text-ink",
              )}
            >
              {f.l}
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un médicament…"
            className="pl-9 h-10 squircle-lg glass ring-inner border-0" />
        </div>
      </section>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="state-panel">
          <div className="size-10 squircle bg-surface-1 grid place-items-center mx-auto mb-3">
            <Pill className="h-4 w-4 text-ink-3" />
          </div>
          <p className="text-[13.5px] text-ink-3">Aucun médicament dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((m, i) => {
            const stockTone =
              m.stock === 0 ? "bg-accent-soft text-accent"
              : m.stock < 10 ? "bg-warning-soft text-warning"
              : "bg-secondary-soft text-secondary";
            const stockLabel = m.stock === 0 ? "Rupture" : m.stock < 10 ? "Faible" : "OK";
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
                className="squircle-lg glass ring-inner shadow-xs p-5 hover:shadow-md hover:-translate-y-0.5 transition-all ease-spring"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="size-9 squircle bg-primary-soft text-primary grid place-items-center">
                    <Pill className="h-4 w-4" strokeWidth={2.2} />
                  </div>
                  <Badge className={cn("squircle-full border-0 px-2 py-0.5 text-[10.5px] font-semibold", stockTone)}>
                    {stockLabel}
                  </Badge>
                </div>
                <h3 className="font-semibold text-ink text-[15px] truncate">{m.name}</h3>
                {m.category && <p className="text-[11.5px] text-ink-3 mt-0.5">{m.category}</p>}
                {m.description && <p className="text-[12.5px] text-ink-3 mt-2 line-clamp-2">{m.description}</p>}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-hairline">
                  <span className="font-display text-[17px] tabular text-ink">
                    {Number(m.price).toLocaleString("fr-FR")} <span className="text-[11px] text-ink-3 font-sans">FCFA</span>
                  </span>
                  <span className="text-[12px] text-ink-3 tabular">
                    Stock <span className="font-semibold text-ink-2">{m.stock}</span>
                  </span>
                </div>
                {m.requires_prescription && (
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] text-secondary font-medium">
                    <ShieldCheck className="h-3 w-3" /> Ordonnance requise
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

const Stat = ({ icon: Icon, label, value, tone, hint }: {
  icon: any; label: string; value: number; tone: "primary" | "secondary" | "accent" | "warning"; hint?: string;
}) => {
  const toneCls = {
    primary: "bg-primary-soft text-primary",
    secondary: "bg-secondary-soft text-secondary",
    accent: "bg-accent-soft text-accent",
    warning: "bg-warning-soft text-warning",
  }[tone];
  return (
    <div className="squircle-lg glass ring-inner shadow-xs p-5">
      <div className={cn("size-9 squircle grid place-items-center mb-3", toneCls)}>
        <Icon className="h-4 w-4" strokeWidth={2.4} />
      </div>
      <div className="font-display text-3xl tabular text-ink leading-none">{value}</div>
      <div className="text-[12px] text-ink-3 mt-1.5 font-medium">
        {label}{hint && <span className="text-ink-4"> · {hint}</span>}
      </div>
    </div>
  );
};

export default PharmacistSpace;
