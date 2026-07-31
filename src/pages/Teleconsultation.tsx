import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Phone, Copy, ShieldCheck, Wifi,
  Calendar, Stethoscope, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Consultation = { id: string; reason: string; scheduled_at: string; doctor_id: string | null; status: string };
type Room = { id: string; consultation_id: string; room_code: string; started_at: string | null; ended_at: string | null };

const Teleconsultation = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const consultationId = params.get("c");
  const [upcoming, setUpcoming] = useState<Consultation[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [inCall, setInCall] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => { document.title = "Téléconsultation — AYMANE"; }, []);

  // Load upcoming consultations (patient side)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("consultations")
        .select("id, reason, scheduled_at, doctor_id, status")
        .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`)
        .gte("scheduled_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(10);
      setUpcoming((data ?? []) as Consultation[]);
    })();
  }, [user]);

  // Load or create room when a consultation is selected
  useEffect(() => {
    if (!user || !consultationId) { setRoom(null); return; }
    (async () => {
      const { data: existing } = await supabase.from("video_rooms")
        .select("*").eq("consultation_id", consultationId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) { setRoom(existing as Room); return; }
      const { data: created, error } = await supabase.from("video_rooms")
        .insert({ consultation_id: consultationId, created_by: user.id }).select().single();
      if (error) { toast({ title: "Salle indisponible", description: error.message, variant: "destructive" }); return; }
      setRoom(created as Room);
    })();
  }, [user, consultationId]);

  const startCall = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.current = s;
      if (localVideoRef.current) localVideoRef.current.srcObject = s;
      setInCall(true);
      setDuration(0);
      timer.current = window.setInterval(() => setDuration((d) => d + 1), 1000);
      if (room && !room.started_at) {
        await supabase.from("video_rooms").update({ started_at: new Date().toISOString() }).eq("id", room.id);
      }
    } catch (e: any) {
      toast({ title: "Caméra/micro indisponible", description: e.message ?? "Autorisez l'accès à la caméra.", variant: "destructive" });
    }
  };

  const endCall = async () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setInCall(false);
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
    if (room) {
      await supabase.from("video_rooms").update({ ended_at: new Date().toISOString() }).eq("id", room.id);
    }
  };

  const toggleCam = () => {
    const v = stream.current?.getVideoTracks()[0];
    if (v) { v.enabled = !v.enabled; setCamOn(v.enabled); }
  };
  const toggleMic = () => {
    const a = stream.current?.getAudioTracks()[0];
    if (a) { a.enabled = !a.enabled; setMicOn(a.enabled); }
  };

  const copyLink = async () => {
    if (!room) return;
    const url = `${window.location.origin}/dashboard/teleconsultation?c=${room.consultation_id}`;
    try { await navigator.clipboard.writeText(url); toast({ title: "Lien copié" }); } catch { /* ignore */ }
  };

  useEffect(() => () => { stream.current?.getTracks().forEach((t) => t.stop()); if (timer.current) window.clearInterval(timer.current); }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <DashboardLayout title="Téléconsultation">
      <header className="mb-8">
        <div className="label text-ink-3 mb-2">Visioconsultation sécurisée</div>
        <h1 className="font-display text-3xl md:text-5xl tracking-display text-ink leading-[1.05]">
          Consultez un <span className="text-gradient-primary">professionnel</span> à distance.
        </h1>
        <p className="mt-3 text-[14.5px] text-ink-3 max-w-xl flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-secondary" />
          Connexion chiffrée de bout en bout · audio et vidéo de haute qualité.
        </p>
      </header>

      {!consultationId ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-headline text-ink">Mes prochaines consultations</h2>
          {upcoming.length === 0 ? (
            <div className="state-panel">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Aucune consultation programmée.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {upcoming.map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => setParams({ c: c.id })}
                  className="group text-left squircle-xl glass-strong ring-inner shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all ease-spring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="label text-ink-3 mb-1.5">
                        {new Date(c.scheduled_at).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-[15px] font-semibold text-ink">{c.reason}</div>
                      <div className="text-[12px] text-ink-3 mt-1 inline-flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" /> Statut : {c.status}
                      </div>
                    </div>
                    <div className="size-10 squircle bg-primary-soft text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Video className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <button onClick={() => setParams({})} className="text-[13px] text-ink-3 hover:text-ink inline-flex items-center gap-1">
            ← Retour aux consultations
          </button>

          <div className="squircle-xl bg-ink ring-inner shadow-lg overflow-hidden relative aspect-video">
            {/* Remote placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-paper/60 gap-3">
              {inCall ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-secondary animate-pulse" />
                    <span className="label text-paper/80">En attente du correspondant…</span>
                  </div>
                  <Wifi className="h-12 w-12 opacity-40" />
                </>
              ) : (
                <>
                  <Video className="h-12 w-12 opacity-40" />
                  <p className="text-sm">Démarrez l'appel pour activer votre caméra.</p>
                </>
              )}
            </div>

            {/* Local PiP */}
            <video
              ref={localVideoRef}
              autoPlay muted playsInline
              className={cn(
                "absolute bottom-4 right-4 w-32 md:w-48 aspect-video squircle-lg object-cover bg-black ring-2 ring-paper/20 shadow-lg",
                !inCall && "hidden", !camOn && "opacity-30"
              )}
            />

            {/* Top bar */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <div className="px-3 py-1.5 squircle-full glass-strong text-[12px] font-medium text-ink flex items-center gap-2">
                <span className={cn("size-1.5 rounded-full", inCall ? "bg-secondary animate-pulse" : "bg-ink-3")} />
                {inCall ? `En appel · ${fmt(duration)}` : "Salle prête"}
              </div>
              {room && (
                <button onClick={copyLink} className="px-3 py-1.5 squircle-full glass-strong text-[12px] font-medium text-ink flex items-center gap-1.5">
                  <Copy className="h-3 w-3" /> Code : {room.room_code.slice(0, 8)}
                </button>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 py-2">
            {inCall && (
              <>
                <ControlButton onClick={toggleMic} active={micOn} icon={micOn ? Mic : MicOff} label={micOn ? "Couper micro" : "Activer micro"} />
                <ControlButton onClick={toggleCam} active={camOn} icon={camOn ? Video : VideoOff} label={camOn ? "Couper caméra" : "Activer caméra"} />
              </>
            )}
            {!inCall ? (
              <button onClick={startCall} className="btn-pill bg-secondary text-secondary-foreground h-12 px-6 shadow-md hover:shadow-lg">
                <Phone className="h-4 w-4" /> Démarrer l'appel
              </button>
            ) : (
              <button onClick={endCall} className="btn-pill bg-accent text-accent-foreground h-12 px-6 shadow-md hover:shadow-lg">
                <PhoneOff className="h-4 w-4" /> Terminer
              </button>
            )}
          </div>

          <div className="squircle-lg glass ring-inner p-4 flex items-start gap-3 text-[13px] text-ink-2">
            <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <strong className="text-ink">Astuce :</strong> partagez le code de la salle à votre médecin/patient pour rejoindre la consultation.
              Cette téléconsultation reste accessible jusqu'à la fin du créneau prévu.
            </div>
          </div>
        </section>
      )}
    </DashboardLayout>
  );
};

const ControlButton = ({ onClick, active, icon: Icon, label }: { onClick: () => void; active: boolean; icon: any; label: string }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={cn(
      "size-12 squircle-full flex items-center justify-center tap shadow-sm transition-colors",
      active ? "bg-surface-0 text-ink ring-1 ring-hairline" : "bg-accent text-accent-foreground"
    )}
  >
    <Icon className="h-5 w-5" strokeWidth={2.2} />
  </button>
);

export default Teleconsultation;
