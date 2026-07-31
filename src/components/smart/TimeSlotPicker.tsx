import { TIME_OPTIONS } from "@/lib/medical-data";
import { cn } from "@/lib/utils";
import { Plus, X, AlertCircle } from "lucide-react";

export interface TimeSlot { start: string; end: string; }

interface Props {
  value: TimeSlot[];
  onChange: (next: TimeSlot[]) => void;
}

const isValid = (s: TimeSlot) => !!s.start && !!s.end && s.start < s.end;

const TimeSlotPicker = ({ value, onChange }: Props) => {
  const update = (i: number, patch: Partial<TimeSlot>) => {
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const add = () => onChange([...value, { start: "09:00", end: "12:00" }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-[12.5px] text-ink-3">Aucun créneau défini.</p>
      )}
      {value.map((slot, i) => {
        const valid = isValid(slot);
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <select
                value={slot.start}
                onChange={(e) => update(i, { start: e.target.value })}
                className={cn(
                  "flex-1 text-[13.5px] px-3 py-2 rounded-md border bg-surface-1 outline-none",
                  !valid ? "border-destructive/60" : "border-hairline focus:border-primary/40",
                )}
                aria-label="Heure de début"
              >
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <span className="text-ink-3 text-[12px]">→</span>
              <select
                value={slot.end}
                onChange={(e) => update(i, { end: e.target.value })}
                className={cn(
                  "flex-1 text-[13.5px] px-3 py-2 rounded-md border bg-surface-1 outline-none",
                  !valid ? "border-destructive/60" : "border-hairline focus:border-primary/40",
                )}
                aria-label="Heure de fin"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t} disabled={t <= slot.start}>{t}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Supprimer le créneau"
                className="size-9 rounded-md bg-surface-1 hover:bg-surface-2 flex items-center justify-center text-ink-3"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {!valid && (
              <p className="text-[11.5px] text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                L'heure de fin doit être après l'heure de début.
              </p>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
      >
        <Plus className="h-3.5 w-3.5" /> Ajouter un créneau
      </button>
    </div>
  );
};

export default TimeSlotPicker;
