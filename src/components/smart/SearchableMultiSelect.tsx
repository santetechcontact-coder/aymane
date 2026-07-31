import { useMemo, useState } from "react";
import { Check, ChevronDown, X, Plus, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { OptionGroup } from "@/lib/medical-data";

export interface SearchableMultiSelectProps {
  groups: OptionGroup[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  allowOther?: boolean;
  primaryValue?: string;
  onPrimaryChange?: (v: string) => void;
  required?: boolean;
  error?: string;
  emptyLabel?: string;
}

const OTHER = "__other__";

const SearchableMultiSelect = ({
  groups, value, onChange,
  placeholder = "Sélectionner…",
  multiple = true,
  allowOther = true,
  primaryValue, onPrimaryChange,
  required, error,
  emptyLabel = "Aucun résultat",
}: SearchableMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [otherInput, setOtherInput] = useState("");
  const [showOther, setShowOther] = useState(false);

  const allOptions = useMemo(() => groups.flatMap((g) => g.options), [groups]);
  const labelMap = useMemo(() => {
    const m = new Map<string, string>();
    allOptions.forEach((o) => m.set(o.value, o.label));
    return m;
  }, [allOptions]);

  const isCustom = (v: string) => !labelMap.has(v);
  const displayLabel = (v: string) => labelMap.get(v) ?? v;

  const toggle = (v: string) => {
    if (!multiple) {
      onChange([v]);
      setOpen(false);
      return;
    }
    if (value.includes(v)) {
      const next = value.filter((x) => x !== v);
      onChange(next);
      if (primaryValue === v && onPrimaryChange) onPrimaryChange(next[0] ?? "");
    } else {
      onChange([...value, v]);
    }
  };

  const removeTag = (v: string) => {
    const next = value.filter((x) => x !== v);
    onChange(next);
    if (primaryValue === v && onPrimaryChange) onPrimaryChange(next[0] ?? "");
  };

  const addCustom = () => {
    const v = otherInput.trim();
    if (!v) return;
    if (!value.includes(v)) onChange(multiple ? [...value, v] : [v]);
    setOtherInput("");
    setShowOther(false);
    if (!multiple) setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-required={required}
            aria-invalid={!!error}
            className={cn(
              "w-full squircle-lg bg-surface-1/70 hover:bg-surface-1 transition-colors px-4 py-2.5 border text-left flex items-center justify-between gap-2 min-h-[46px]",
              error ? "border-destructive/60" : "border-hairline focus:border-primary/40",
            )}
          >
            <span className={cn("text-[14.5px] truncate", value.length === 0 && "text-ink-4")}>
              {value.length === 0
                ? placeholder
                : multiple
                ? `${value.length} sélectionné${value.length > 1 ? "s" : ""}`
                : displayLabel(value[0])}
            </span>
            <ChevronDown className="h-4 w-4 text-ink-3 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[280px]" align="start">
          <Command>
            <CommandInput placeholder="Rechercher…" />
            <CommandList className="max-h-72">
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              {groups.map((g) => (
                <CommandGroup key={g.category} heading={g.category}>
                  {g.options.map((opt) => {
                    const selected = value.includes(opt.value);
                    return (
                      <CommandItem
                        key={opt.value}
                        value={`${opt.label} ${opt.value}`}
                        onSelect={() => toggle(opt.value)}
                      >
                        <div className={cn("mr-2 size-4 rounded-sm border flex items-center justify-center",
                          selected ? "bg-primary border-primary text-primary-foreground" : "border-ink-3")}>
                          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                        </div>
                        <span>{opt.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
              {allowOther && (
                <CommandGroup heading="Autre">
                  <CommandItem value={OTHER} onSelect={() => setShowOther((s) => !s)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Saisir une valeur personnalisée
                  </CommandItem>
                  {showOther && (
                    <div className="px-2 pb-2 flex gap-2">
                      <input
                        autoFocus
                        value={otherInput}
                        onChange={(e) => setOtherInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
                        placeholder="Tapez puis Entrée"
                        className="flex-1 text-[13.5px] px-2 py-1.5 rounded-md border border-hairline bg-background outline-none focus:border-primary/50"
                      />
                      <button type="button" onClick={addCustom} className="text-[12.5px] font-medium text-primary px-2">Ajouter</button>
                    </div>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => {
            const isPrimary = primaryValue === v;
            return (
              <span key={v} className={cn(
                "inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-[12px] font-medium border",
                isPrimary
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface-1 text-ink-2 border-hairline",
                isCustom(v) && !isPrimary && "italic",
              )}>
                {onPrimaryChange && multiple && (
                  <button
                    type="button"
                    onClick={() => onPrimaryChange(isPrimary ? "" : v)}
                    aria-label={isPrimary ? "Retirer langue principale" : "Définir comme principale"}
                    className="opacity-80 hover:opacity-100"
                  >
                    <Star className={cn("h-3 w-3", isPrimary && "fill-current")} />
                  </button>
                )}
                {displayLabel(v)}
                <button
                  type="button"
                  onClick={() => removeTag(v)}
                  className="size-4 rounded-full hover:bg-black/10 flex items-center justify-center"
                  aria-label="Retirer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {error && <p className="text-[11.5px] text-destructive px-1">{error}</p>}
    </div>
  );
};

export default SearchableMultiSelect;
