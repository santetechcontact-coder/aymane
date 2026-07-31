import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FlaskConical, Search, Filter, Plus, Clock, CheckCircle2, AlertCircle,
  Beaker, FileText, MessageCircle, Send, X, ChevronRight, Activity, Users,
  TrendingUp, Calendar, Loader2, Download, Microscope,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = "pending" | "sample_collection" | "processing" | "results_ready" | "delivered" | "cancelled";
type Priority = "routine" | "urgent" | "stat";

interface Analysis {
  id: string; code: string; name: string; category: string | null;
  sample_type: string | null; turnaround_hours: number; price: number;
  description: string | null; active: boolean;
}
interface RequestItem {
  id: string; analysis_id: string; unit_price: number;
  result_value: string | null; result_unit: string | null;
  reference_range: string | null; result_flag: string | null;
  result_notes: string | null; completed_at: string | null;
  lab_analyses?: Analysis;
}
interface LabRequest {
  id: string; patient_id: string; doctor_id: string | null;
  status: Status; priority: Priority; clinical_notes: string | null;
  internal_notes: string | null; total: number;
  scheduled_at: string | null; collected_at: string | null;
  completed_at: string | null; delivered_at: string | null;
  created_at: string; updated_at: string;
  patient?: { full_name: string | null; phone: string | null };
  doctor?: { full_name: string | null };
  items?: RequestItem[];
}
interface Message {
  id: string; sender_id: string; recipient_id: string;
  content: string; created_at: string; read_at: string | null;
}

const STATUS_META: Record<Status, { label: string; tone: string; icon: any }> = {
  pending: { label: "En attente", tone: "bg-amber-500/10 text-amber-700 border-amber-200", icon: Clock },
  sample_collection: { label: "Prélèvement", tone: "bg-blue-500/10 text-blue-700 border-blue-200", icon: Beaker },
  processing: { label: "En cours", tone: "bg-violet-500/10 text-violet-700 border-violet-200", icon: Microscope },
  results_ready: { label: "Résultats prêts", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  delivered: { label: "Livré", tone: "bg-slate-500/10 text-slate-700 border-slate-200", icon: FileText },
  cancelled: { label: "Annulé", tone: "bg-rose-500/10 text-rose-700 border-rose-200", icon: X },
};
const PRIORITY_META: Record<Priority, { label: string; tone: string }> = {
  routine: { label: "Routine", tone: "bg-slate-100 text-slate-700" },
  urgent: { label: "Urgent", tone: "bg-orange-100 text-orange-700" },
  stat: { label: "STAT", tone: "bg-rose-100 text-rose-700" },
};

const Stat = ({ icon: Icon, label, value, tone = "primary" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-center justify-between mb-3">
      <div className={cn("size-10 rounded-xl grid place-items-center",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "warning" && "bg-amber-500/10 text-amber-600",
        tone === "success" && "bg-emerald-500/10 text-emerald-600",
        tone === "danger" && "bg-rose-500/10 text-rose-600",
      )}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
    <div className="text-3xl font-display font-semibold tracking-tight">{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </motion.div>
);

export default function LaboratorySpace() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [selected, setSelected] = useState<LabRequest | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [reqRes, anaRes] = await Promise.all([
      supabase.from("lab_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("lab_analyses").select("*").eq("active", true).order("name"),
    ]);
    if (reqRes.error) toast.error("Erreur chargement demandes");
    if (anaRes.error) toast.error("Erreur catalogue");

    const reqs = (reqRes.data || []) as LabRequest[];
    // Hydrate patient & items
    const patientIds = [...new Set(reqs.map(r => r.patient_id))];
    const reqIds = reqs.map(r => r.id);
    const [profilesRes, itemsRes] = await Promise.all([
      patientIds.length
        ? supabase.from("profiles").select("id, full_name, phone").in("id", patientIds)
        : Promise.resolve({ data: [], error: null } as any),
      reqIds.length
        ? supabase.from("lab_request_items").select("*, lab_analyses(*)").in("request_id", reqIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    const profMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const itemsByReq = new Map<string, RequestItem[]>();
    (itemsRes.data || []).forEach((it: any) => {
      const arr = itemsByReq.get(it.request_id) || [];
      arr.push(it); itemsByReq.set(it.request_id, arr);
    });
    setRequests(reqs.map(r => ({
      ...r,
      patient: profMap.get(r.patient_id) as any,
      items: itemsByReq.get(r.id) || [],
    })));
    setAnalyses((anaRes.data || []) as Analysis[]);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("lab-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "lab_requests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "lab_request_items" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (tab !== "all" && r.status !== tab) return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const inPatient = r.patient?.full_name?.toLowerCase().includes(s);
        const inItems = r.items?.some(i => i.lab_analyses?.name.toLowerCase().includes(s) || i.lab_analyses?.code.toLowerCase().includes(s));
        if (!inPatient && !inItems) return false;
      }
      return true;
    });
  }, [requests, tab, priorityFilter, search]);

  const stats = useMemo(() => ({
    pending: requests.filter(r => r.status === "pending").length,
    processing: requests.filter(r => ["sample_collection", "processing"].includes(r.status)).length,
    ready: requests.filter(r => r.status === "results_ready").length,
    today: requests.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length,
  }), [requests]);

  const advance = async (req: LabRequest, status: Status) => {
    const patch: any = { status };
    if (status === "sample_collection") patch.collected_at = new Date().toISOString();
    if (status === "results_ready") patch.completed_at = new Date().toISOString();
    if (status === "delivered") patch.delivered_at = new Date().toISOString();
    const { error } = await supabase.from("lab_requests").update(patch).eq("id", req.id);
    if (error) return toast.error(error.message);
    toast.success(`Statut mis à jour : ${STATUS_META[status].label}`);
    if (selected?.id === req.id) setSelected({ ...req, ...patch });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8"
        >
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-background/80 backdrop-blur px-3 py-1 text-xs text-muted-foreground border border-border/50 mb-3">
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
                Laboratoire d'analyses médicales
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight">Espace Laboratoire</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">Gérez les demandes, suivez les prélèvements et délivrez les résultats en toute sécurité.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="rounded-xl">
                <Link to="/dashboard/messages"><MessageCircle className="h-4 w-4 mr-2" />Messagerie</Link>
              </Button>
              <Button onClick={() => setNewOpen(true)} className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />Nouvelle demande
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Stat icon={Clock} label="En attente" value={stats.pending} tone="warning" />
          <Stat icon={Microscope} label="En traitement" value={stats.processing} tone="primary" />
          <Stat icon={CheckCircle2} label="Résultats prêts" value={stats.ready} tone="success" />
          <Stat icon={TrendingUp} label="Aujourd'hui" value={stats.today} tone="primary" />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher patient, analyse, code…" className="pl-9 rounded-xl" />
            </div>
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-44 rounded-xl"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="stat">STAT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="w-full overflow-x-auto justify-start flex-nowrap">
              <TabsTrigger value="all">Tout ({requests.length})</TabsTrigger>
              {(Object.keys(STATUS_META) as Status[]).map(s => (
                <TabsTrigger key={s} value={s} className="whitespace-nowrap">
                  {STATUS_META[s].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 py-16 text-center">
            <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Aucune demande dans cette catégorie.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((r, i) => {
              const Sm = STATUS_META[r.status];
              const pm = PRIORITY_META[r.priority];
              return (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => setSelected(r)}
                  className="group text-left rounded-2xl border border-border/60 bg-card p-4 sm:p-5 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("size-12 rounded-xl grid place-items-center shrink-0", Sm.tone)}>
                      <Sm.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium truncate">{r.patient?.full_name || "Patient"}</span>
                        <Badge variant="outline" className={cn("text-[10px] font-medium border-0", pm.tone)}>{pm.label}</Badge>
                        <Badge variant="outline" className={cn("text-[10px] font-medium", Sm.tone)}>{Sm.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.items?.length || 0} analyse(s) • {r.items?.slice(0, 2).map(i => i.lab_analyses?.code).join(", ")}
                        {(r.items?.length || 0) > 2 && ` +${(r.items?.length || 0) - 2}`}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display font-semibold">{r.total.toLocaleString()} <span className="text-xs text-muted-foreground">FCFA</span></div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground inline-block mt-2 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Detail sheet */}
        <RequestSheet
          request={selected}
          onClose={() => setSelected(null)}
          onAdvance={advance}
          onSaveResults={load}
          currentUserId={user?.id}
        />

        {/* New request */}
        <NewRequestDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          analyses={analyses}
          onCreated={() => { setNewOpen(false); load(); }}
          patientId={user?.id || ""}
        />
      </div>
    </DashboardLayout>
  );
}

/* ---------- Detail Sheet ---------- */

function RequestSheet({ request, onClose, onAdvance, onSaveResults, currentUserId }: {
  request: LabRequest | null;
  onClose: () => void;
  onAdvance: (r: LabRequest, s: Status) => void;
  onSaveResults: () => void;
  currentUserId?: string;
}) {
  const [internalNotes, setInternalNotes] = useState("");
  const [results, setResults] = useState<Record<string, Partial<RequestItem>>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState("");
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    if (!request) return;
    setInternalNotes(request.internal_notes || "");
    const r: Record<string, Partial<RequestItem>> = {};
    request.items?.forEach(i => { r[i.id] = { ...i }; });
    setResults(r);
    loadMessages();
  }, [request?.id]);

  const loadMessages = async () => {
    if (!request || !currentUserId) return;
    const other = request.patient_id;
    const { data } = await supabase
      .from("messages").select("*")
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${currentUserId})`)
      .order("created_at", { ascending: true }).limit(50);
    setMessages((data || []) as Message[]);
  };

  useEffect(() => {
    if (!request || !currentUserId) return;
    const ch = supabase.channel(`lab-msg-${request.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p: any) => {
        const m = p.new as Message;
        if ((m.sender_id === currentUserId && m.recipient_id === request.patient_id) ||
            (m.recipient_id === currentUserId && m.sender_id === request.patient_id)) {
          setMessages(prev => [...prev, m]);
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [request?.id, currentUserId]);

  const sendMessage = async () => {
    if (!msg.trim() || !request || !currentUserId) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: currentUserId, recipient_id: request.patient_id, content: msg.trim(),
    });
    if (error) return toast.error(error.message);
    setMsg("");
  };

  const saveNotes = async () => {
    if (!request) return;
    const { error } = await supabase.from("lab_requests").update({ internal_notes: internalNotes }).eq("id", request.id);
    if (error) return toast.error(error.message);
    toast.success("Notes enregistrées");
  };

  const saveResults = async () => {
    if (!request) return;
    const updates = Object.values(results);
    let ok = 0;
    for (const it of updates) {
      if (!it.id) continue;
      const { error } = await supabase.from("lab_request_items").update({
        result_value: it.result_value || null,
        result_unit: it.result_unit || null,
        reference_range: it.reference_range || null,
        result_flag: it.result_flag || null,
        result_notes: it.result_notes || null,
        completed_at: it.result_value ? new Date().toISOString() : null,
      }).eq("id", it.id);
      if (!error) ok++;
    }
    toast.success(`${ok} résultat(s) enregistré(s)`);
    onSaveResults();
  };

  if (!request) return null;
  const Sm = STATUS_META[request.status];
  const next: Record<Status, Status | null> = {
    pending: "sample_collection",
    sample_collection: "processing",
    processing: "results_ready",
    results_ready: "delivered",
    delivered: null, cancelled: null,
  };
  const nextStatus = next[request.status];

  return (
    <Sheet open={!!request} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={cn("border", Sm.tone)} variant="outline">{Sm.label}</Badge>
                <Badge variant="outline" className={cn("text-[10px]", PRIORITY_META[request.priority].tone)}>{PRIORITY_META[request.priority].label}</Badge>
              </div>
              <div className="text-lg font-display">{request.patient?.full_name || "Patient"}</div>
              <div className="text-xs text-muted-foreground font-normal">
                Créée le {new Date(request.created_at).toLocaleString("fr-FR")}
              </div>
            </SheetTitle>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 grid grid-cols-3">
            <TabsTrigger value="info">Détails</TabsTrigger>
            <TabsTrigger value="results">Résultats</TabsTrigger>
            <TabsTrigger value="chat">Messagerie</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 m-0">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Analyses demandées</div>
              <div className="space-y-2">
                {request.items?.map(it => (
                  <div key={it.id} className="flex items-center justify-between text-sm py-1">
                    <div>
                      <span className="font-medium">{it.lab_analyses?.code}</span>
                      <span className="text-muted-foreground ml-2">{it.lab_analyses?.name}</span>
                    </div>
                    <span>{it.unit_price.toLocaleString()} FCFA</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Total</span><span>{request.total.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>

            {request.clinical_notes && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Notes cliniques</div>
                <p className="text-sm">{request.clinical_notes}</p>
              </div>
            )}

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Notes internes (laboratoire)</div>
              <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Observations, incidents, contrôle qualité…" className="rounded-xl" rows={3} />
              <Button size="sm" variant="outline" onClick={saveNotes} className="mt-2 rounded-lg">Enregistrer notes</Button>
            </div>
          </TabsContent>

          <TabsContent value="results" className="flex-1 overflow-y-auto px-6 py-4 space-y-3 m-0">
            {request.items?.map(it => (
              <div key={it.id} className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{it.lab_analyses?.code}</span>
                    <span className="text-muted-foreground text-sm ml-2">{it.lab_analyses?.name}</span>
                  </div>
                  {results[it.id]?.completed_at && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Valeur" value={results[it.id]?.result_value || ""}
                    onChange={(e) => setResults(p => ({ ...p, [it.id]: { ...p[it.id], result_value: e.target.value } }))} />
                  <Input placeholder="Unité" value={results[it.id]?.result_unit || ""}
                    onChange={(e) => setResults(p => ({ ...p, [it.id]: { ...p[it.id], result_unit: e.target.value } }))} />
                  <Select value={results[it.id]?.result_flag || "normal"}
                    onValueChange={(v) => setResults(p => ({ ...p, [it.id]: { ...p[it.id], result_flag: v } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Bas</SelectItem>
                      <SelectItem value="high">Élevé</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Valeurs de référence" value={results[it.id]?.reference_range || ""}
                  onChange={(e) => setResults(p => ({ ...p, [it.id]: { ...p[it.id], reference_range: e.target.value } }))} />
                <Textarea placeholder="Commentaires…" rows={2} value={results[it.id]?.result_notes || ""}
                  onChange={(e) => setResults(p => ({ ...p, [it.id]: { ...p[it.id], result_notes: e.target.value } }))} />
              </div>
            ))}
            <Button onClick={saveResults} className="w-full rounded-xl"><CheckCircle2 className="h-4 w-4 mr-2" />Enregistrer les résultats</Button>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-2">
                {messages.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">Aucun message — démarrez la conversation.</div>}
                {messages.map(m => (
                  <div key={m.id} className={cn("flex", m.sender_id === currentUserId ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      m.sender_id === currentUserId ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {m.content}
                      <div className={cn("text-[10px] mt-1 opacity-70")}>
                        {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t flex gap-2">
              <Input value={msg} onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Message sécurisé au patient…" className="rounded-xl" />
              <Button onClick={sendMessage} size="icon" className="rounded-xl shrink-0"><Send className="h-4 w-4" /></Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="p-4 border-t flex gap-2 bg-muted/30">
          {nextStatus && (
            <Button onClick={() => onAdvance(request, nextStatus)} className="flex-1 rounded-xl">
              Marquer : {STATUS_META[nextStatus].label}
            </Button>
          )}
          {request.status !== "cancelled" && request.status !== "delivered" && (
            <Button variant="outline" onClick={() => onAdvance(request, "cancelled")} className="rounded-xl">Annuler</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- New Request Dialog ---------- */

function NewRequestDialog({ open, onOpenChange, analyses, onCreated, patientId }: {
  open: boolean; onOpenChange: (b: boolean) => void;
  analyses: Analysis[]; onCreated: () => void; patientId: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [priority, setPriority] = useState<Priority>("routine");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const total = useMemo(() =>
    analyses.filter(a => selected.has(a.id)).reduce((s, a) => s + Number(a.price), 0),
  [selected, analyses]);

  const filtered = useMemo(() => analyses.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase())
  ), [analyses, search]);

  const toggle = (id: string) => {
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const submit = async () => {
    if (selected.size === 0) return toast.error("Sélectionnez au moins une analyse");
    setSaving(true);
    const { data: req, error } = await supabase.from("lab_requests").insert({
      patient_id: patientId, priority, clinical_notes: notes || null, total,
    }).select().single();
    if (error || !req) { setSaving(false); return toast.error(error?.message || "Erreur"); }
    const items = analyses.filter(a => selected.has(a.id)).map(a => ({
      request_id: req.id, analysis_id: a.id, unit_price: a.price,
    }));
    const { error: e2 } = await supabase.from("lab_request_items").insert(items);
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success("Demande créée");
    setSelected(new Set()); setNotes(""); setPriority("routine");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Nouvelle demande d'analyse</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 -mx-2 px-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Priorité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="stat">STAT (immédiat)</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une analyse…" className="pl-9 rounded-xl" />
            </div>
          </div>

          <Textarea placeholder="Notes cliniques pour le laboratoire (symptômes, contexte…)"
            value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" rows={2} />

          <div className="rounded-xl border divide-y max-h-80 overflow-y-auto">
            {filtered.map(a => {
              const checked = selected.has(a.id);
              return (
                <button key={a.id} type="button" onClick={() => toggle(a.id)}
                  className={cn("w-full text-left p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors",
                    checked && "bg-primary/5")}>
                  <div className={cn("size-5 rounded-md border-2 grid place-items-center shrink-0",
                    checked ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                    {checked && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{a.code}</span>
                      <span className="text-sm text-muted-foreground truncate">{a.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.sample_type} • {a.turnaround_hours}h
                    </div>
                  </div>
                  <div className="text-sm font-medium shrink-0">{Number(a.price).toLocaleString()} FCFA</div>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex-1 text-left">
            <div className="text-xs text-muted-foreground">Total ({selected.size} analyse{selected.size > 1 ? "s" : ""})</div>
            <div className="text-xl font-display font-semibold">{total.toLocaleString()} FCFA</div>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Annuler</Button>
          <Button onClick={submit} disabled={saving || selected.size === 0} className="rounded-xl">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Créer la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
