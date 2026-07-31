import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Clock3, Copy, Crown, Mail, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type SubscriptionRow = {
  id: string;
  plan_id: "essentiel" | "premium" | "famille";
  billing_interval: "monthly" | "yearly";
  status: string;
  starts_at: string;
  renews_at: string | null;
};

type FamilyMember = {
  id: string;
  invited_email: string;
  full_name: string;
  relationship: string;
  is_minor: boolean;
  status: "invited" | "active" | "declined" | "removed";
  invitation_token: string;
  invited_at: string;
};

const planNames = { essentiel: "Essentiel", premium: "Premium", famille: "Famille" };
const inputClass =
  "h-11 w-full rounded-[0.75rem] border border-hairline bg-surface-1 px-3 text-[14px] text-ink outline-none transition focus:border-primary/50";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("fr-SN", { day: "2-digit", month: "long", year: "numeric" });

const Subscription = () => {
  const { user } = useAuth();
  const db: SupabaseClient = supabase;
  const [searchParams, setSearchParams] = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", relationship: "", minor: false });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [subscriptionResult, memberResult] = await Promise.all([
      db.from("subscriptions").select("*").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("family_members").select("*").eq("owner_id", user.id).neq("status", "removed").order("invited_at", { ascending: false }),
    ]);
    setSubscription((subscriptionResult.data ?? null) as SubscriptionRow | null);
    setMembers((memberResult.data ?? []) as FamilyMember[]);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Mon abonnement - AYMANE";
    void load();
  }, [user]);

  useEffect(() => {
    const invitation = searchParams.get("invitation");
    if (!user || !invitation) return;
    const accept = async () => {
      setWorking(true);
      const { error } = await db.rpc("accept_family_invitation", { _token: invitation });
      setWorking(false);
      if (error) {
        toast({
          title: "Invitation non acceptée",
          description: "Connectez-vous avec l'adresse qui a reçu l'invitation, ou demandez un nouveau lien.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Vous avez rejoint l'espace Famille" });
      }
      searchParams.delete("invitation");
      setSearchParams(searchParams, { replace: true });
      await load();
    };
    void accept();
  }, [user, searchParams]);

  const activeMembers = useMemo(() => members.filter((member) => member.status === "active").length, [members]);
  const canInvite = subscription?.plan_id === "famille" && subscription.status === "active";

  const inviteMember = async () => {
    if (!inviteForm.email.includes("@") || inviteForm.name.trim().length < 2 || inviteForm.relationship.trim().length < 2) {
      toast({ title: "Invitation incomplète", description: "Indiquez le nom, le lien familial et une adresse valide.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { data, error } = await db.rpc("invite_family_member", {
      _email: inviteForm.email.trim(),
      _full_name: inviteForm.name.trim(),
      _relationship: inviteForm.relationship.trim(),
      _is_minor: inviteForm.minor,
    });
    setWorking(false);
    if (error || !data) {
      toast({
        title: "Invitation non créée",
        description: canInvite ? "Vérifiez l'adresse ou le nombre de membres." : "La formule Famille doit être active.",
        variant: "destructive",
      });
      return;
    }
    const url = `${window.location.origin}/dashboard/subscription?invitation=${data}`;
    await navigator.clipboard?.writeText(url);
    setInviteForm({ name: "", email: "", relationship: "", minor: false });
    toast({ title: "Invitation prête", description: "Le lien a été copié. Vous pouvez l'envoyer à votre proche." });
    await load();
  };

  const copyInvitation = async (token: string) => {
    await navigator.clipboard?.writeText(`${window.location.origin}/dashboard/subscription?invitation=${token}`);
    toast({ title: "Lien d'invitation copié" });
  };

  const removeMember = async (id: string) => {
    const { error } = await db.from("family_members").update({ status: "removed" }).eq("id", id);
    if (error) {
      toast({ title: "Action non terminée", description: "Réessayez dans quelques instants.", variant: "destructive" });
      return;
    }
    toast({ title: "Membre retiré de l'espace Famille" });
    await load();
  };

  return (
    <DashboardLayout title="Abonnement" back>
      <header className="mb-6">
        <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-primary">Mon offre AYMANE</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">Une formule claire, sans surprise.</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
          Suivez votre formule et réunissez vos proches dans un même espace quand l'offre Famille est active.
        </p>
      </header>

      {loading ? (
        <div className="state-panel"><p className="text-[14px] text-ink-3">Vérification de votre formule…</p></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-5">
            {subscription ? (
              <section className="rounded-[1rem] bg-ink p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-[0.8rem] bg-white/10"><Crown className="h-5 w-5" /></span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                    <Check className="h-3 w-3" /> Active
                  </span>
                </div>
                <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.12em] text-white/50">Votre formule</p>
                <h2 className="mt-1 font-display text-4xl">{planNames[subscription.plan_id]}</h2>
                <p className="mt-2 text-[13px] text-white/60">
                  Paiement {subscription.billing_interval === "yearly" ? "annuel" : "mensuel"}
                </p>
                <div className="mt-6 border-t border-white/15 pt-4">
                  <p className="text-[10px] uppercase text-white/45">Prochain renouvellement</p>
                  <p className="mt-1 text-[14px] font-semibold">
                    {subscription.renews_at ? formatDate(subscription.renews_at) : "À confirmer"}
                  </p>
                </div>
              </section>
            ) : (
              <section className="rounded-[1rem] border border-hairline bg-surface-0 p-5">
                <span className="grid size-11 place-items-center rounded-[0.8rem] bg-primary-soft text-primary"><Crown className="h-5 w-5" /></span>
                <h2 className="mt-5 font-display text-2xl text-ink">Aucune formule active</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-3">Choisissez la couverture qui correspond à votre quotidien et à votre famille.</p>
                <Link to="/tarifs" className="mt-5 flex h-11 items-center justify-center rounded-full bg-ink px-4 text-[13px] font-semibold text-white">
                  Voir les formules
                </Link>
              </section>
            )}

            <section className="rounded-[1rem] border border-hairline bg-surface-0 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-[0.7rem] bg-primary-soft text-primary"><ShieldCheck className="h-4 w-4" /></span>
                <div>
                  <p className="text-[13px] font-semibold text-ink">Paiements suivis</p>
                  <p className="text-[11.5px] text-ink-3">Wave, Orange Money, Free Money et carte.</p>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-[1rem] border border-hairline bg-surface-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-primary">Espace Famille</p>
                <h2 className="mt-1 font-display text-2xl text-ink">Vos proches, au même endroit.</h2>
              </div>
              <span className="rounded-full bg-surface-1 px-2.5 py-1 text-[11px] font-semibold text-ink-3">{activeMembers}/8</span>
            </div>

            {!canInvite ? (
              <div className="mt-5 rounded-[0.9rem] bg-surface-1 p-4">
                <p className="text-[13px] font-semibold text-ink">Disponible avec la formule Famille</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">Invitez jusqu'à huit proches et gardez les accès séparés pour chacun.</p>
                <Link to="/tarifs" className="mt-3 inline-flex text-[12px] font-semibold text-primary">Découvrir la formule</Link>
              </div>
            ) : (
              <div className="mt-5 rounded-[0.9rem] bg-surface-1 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nom complet"><input className={inputClass} value={inviteForm.name} onChange={(event) => setInviteForm({ ...inviteForm, name: event.target.value })} /></Field>
                  <Field label="Lien familial"><input className={inputClass} value={inviteForm.relationship} onChange={(event) => setInviteForm({ ...inviteForm, relationship: event.target.value })} placeholder="Ex. Mère, enfant" /></Field>
                </div>
                <Field label="Adresse e-mail">
                  <input type="email" inputMode="email" className={inputClass} value={inviteForm.email} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} placeholder="proche@exemple.sn" />
                </Field>
                <label className="mt-3 flex items-center gap-2.5 text-[12.5px] text-ink-2">
                  <input type="checkbox" checked={inviteForm.minor} onChange={(event) => setInviteForm({ ...inviteForm, minor: event.target.checked })} className="size-4 accent-primary" />
                  Cette personne est mineure
                </label>
                <button type="button" disabled={working} onClick={() => void inviteMember()} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">
                  <Plus className="h-4 w-4" /> Préparer l'invitation
                </button>
              </div>
            )}

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-ink">Membres et invitations</h3>
                <Users className="h-4 w-4 text-ink-4" />
              </div>
              {members.length === 0 ? (
                <div className="rounded-[0.8rem] border border-dashed border-hairline px-4 py-6 text-center">
                  <p className="text-[12.5px] text-ink-3">Aucun proche invité pour le moment.</p>
                </div>
              ) : members.map((member) => (
                <article key={member.id} className="flex items-center gap-3 border-b border-hairline py-3.5 last:border-0">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary-soft text-secondary">
                    {member.status === "active" ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{member.full_name}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-ink-3">{member.relationship} · {member.status === "active" ? "Actif" : "Invitation envoyée"}</p>
                  </div>
                  {member.status === "invited" && (
                    <button type="button" onClick={() => void copyInvitation(member.invitation_token)} className="grid size-9 place-items-center rounded-full bg-surface-1 text-ink-2" aria-label={`Copier l'invitation pour ${member.full_name}`}><Copy className="h-3.5 w-3.5" /></button>
                  )}
                  <button type="button" onClick={() => void removeMember(member.id)} className="grid size-9 place-items-center rounded-full text-ink-4 hover:bg-accent-soft hover:text-accent" aria-label={`Retirer ${member.full_name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="mt-3 block min-w-0 first:mt-0">
    <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3">{label}</span>
    {children}
  </label>
);

export default Subscription;
