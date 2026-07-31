import { DAYS } from "@/lib/medical-data";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}

const DaysPicker = ({ value, onChange, error }: Props) => {
  const allSelected = value.length === DAYS.length;
  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  const toggleAll = () => onChange(allSelected ? [] : DAYS.map((d) => d.value));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((d) => {
          const active = value.includes(d.value);
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => toggle(d.value)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-all",
                active
                  ? "bg-ink text-white border-ink shadow-sm"
                  : "bg-surface-1 text-ink-2 border-hairline hover:bg-surface-2",
              )}
            >
              {active && <Check className="h-3 w-3" strokeWidth={3} />}
              {d.short}
            </button>
          );
        })}
      </div>
      <label className="inline-flex items-center gap-2 text-[12.5px] text-ink-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="size-3.5 accent-primary"
        />
        Disponible tous les jours
      </label>
      {error && <p className="text-[11.5px] text-destructive">{error}</p>}
    </div>
  );
};

export default DaysPicker;
