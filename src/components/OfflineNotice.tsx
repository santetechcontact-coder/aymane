import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function OfflineNotice() {
  const online = useNetworkStatus();

  if (online) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] pb-safe-bottom sm:inset-x-auto sm:right-4 sm:w-[360px]">
      <div className="flex items-start gap-3 rounded-[0.95rem] border border-warning/20 bg-warning-soft px-4 py-3 text-warning shadow-lg">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} />
        <div>
          <p className="text-[13px] font-semibold">Connexion instable</p>
          <p className="mt-0.5 text-[12px] leading-relaxed">
            Les pages déjà ouvertes restent accessibles. Les demandes sensibles attendent le retour du réseau.
          </p>
        </div>
      </div>
    </div>
  );
}
