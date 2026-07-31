import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ServiceStatus = "checking" | "online" | "degraded" | "offline";
export type DataSource = "live" | "fallback";

export type LandingStructure = {
  id: string;
  name: string;
  type: string;
  city: string;
  verified?: boolean | null;
};

export type LandingMedication = {
  id: string;
  name: string;
  price: number;
  stock: number;
  requires_prescription: boolean;
};

export type LandingBloodStock = {
  id: string;
  center_name: string;
  city: string;
  blood_group: string;
  units_available: number;
};

export type LandingOperations = {
  status: ServiceStatus;
  source: DataSource;
  checkedAt: Date | null;
  responseMs: number | null;
  errors: string[];
  counts: {
    structures: number;
    medications: number;
    bloodUnits: number;
  };
  structures: LandingStructure[];
  medications: LandingMedication[];
  bloodStocks: LandingBloodStock[];
};

export const publicFallbackData = {
  structures: [
    { id: "fallback-structure-1", name: "Centre de santé de Grand-Yoff", type: "health_center", city: "Dakar", verified: true },
    { id: "fallback-structure-2", name: "Clinique communautaire des Almadies", type: "clinic", city: "Dakar", verified: true },
    { id: "fallback-structure-3", name: "Laboratoire de Pikine", type: "lab", city: "Pikine", verified: true },
  ],
  medications: [
    { id: "fallback-med-1", name: "Paracétamol 500 mg", price: 850, stock: 42, requires_prescription: false },
    { id: "fallback-med-2", name: "Amoxicilline 1 g", price: 2400, stock: 18, requires_prescription: true },
    { id: "fallback-med-3", name: "SRO sachets", price: 500, stock: 65, requires_prescription: false },
  ],
  bloodStocks: [
    { id: "fallback-blood-1", center_name: "Banque nationale de sang", city: "Dakar", blood_group: "O+", units_available: 31 },
    { id: "fallback-blood-2", center_name: "Centre régional", city: "Thiès", blood_group: "A+", units_available: 12 },
    { id: "fallback-blood-3", center_name: "Antenne urgence", city: "Kaolack", blood_group: "B+", units_available: 8 },
  ],
} satisfies Pick<LandingOperations, "structures" | "medications" | "bloodStocks">;

// Les query builders Supabase sont des `PromiseLike` (thenables), pas des
// `Promise` complets — d'où le type élargi ici pour rester correctement typé.
const timeout = <T,>(promise: PromiseLike<T>, ms = 9000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(`La reponse prend plus de ${ms / 1000}s`)), ms);
    }),
  ]);

const emptyState = (): LandingOperations => ({
  status: "checking",
  source: "fallback",
  checkedAt: null,
  responseMs: null,
  errors: [],
  counts: {
    structures: 0,
    medications: 0,
    bloodUnits: 0,
  },
  structures: [],
  medications: [],
  bloodStocks: [],
});

export const useLandingOperations = () => {
  const [state, setState] = useState<LandingOperations>(() => emptyState());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const publicLandingDataEnabled = import.meta.env.VITE_PUBLIC_LANDING_DATA === "true";
    const start = performance.now();
    setLoading(true);
    setState((current) => ({ ...current, status: "checking", errors: [] }));

    if (!publicLandingDataEnabled) {
      setState({
        status: "degraded",
        source: "fallback",
        checkedAt: new Date(),
        responseMs: Math.round(performance.now() - start),
        errors: [],
        counts: {
        structures: publicFallbackData.structures.length,
        medications: publicFallbackData.medications.length,
        bloodUnits: publicFallbackData.bloodStocks.reduce((sum, item) => sum + item.units_available, 0),
      },
        structures: publicFallbackData.structures,
        medications: publicFallbackData.medications,
        bloodStocks: publicFallbackData.bloodStocks,
      });
      setLoading(false);
      return;
    }

    const queries = await Promise.allSettled([
      timeout(
        supabase
          .from("health_structures")
          .select("id, name, type, city, verified", { count: "exact" })
          .eq("verified", true)
          .order("name", { ascending: true })
          .limit(4),
      ),
      timeout(
        supabase
          .from("medications")
          .select("id, name, price, stock, requires_prescription", { count: "exact" })
          .gt("stock", 0)
          .order("name", { ascending: true })
          .limit(5),
      ),
      timeout(
        supabase
          .from("blood_bank")
          .select("id, center_name, city, blood_group, units_available", { count: "exact" })
          .order("units_available", { ascending: true })
          .limit(5),
      ),
    ]);

    const errors: string[] = [];
    const getResult = <T,>(index: number) => {
      const item = queries[index];
      if (item.status === "rejected") {
        errors.push(item.reason instanceof Error ? item.reason.message : "Information indisponible");
        return { data: null, count: null } as { data: T[] | null; count: number | null };
      }
      const value = item.value as { data: T[] | null; count: number | null; error: { message: string } | null };
      if (value.error) {
        errors.push(value.error.message);
        return { data: null, count: null };
      }
      return { data: value.data, count: value.count };
    };

    const structures = getResult<LandingStructure>(0);
    const medications = getResult<LandingMedication>(1);
    const bloodStocks = getResult<LandingBloodStock>(2);
    const livePieces = [structures.data, medications.data, bloodStocks.data].filter(Boolean).length;
    const bloodList = bloodStocks.data ?? publicFallbackData.bloodStocks;

    setState({
      status: livePieces === 3 ? "online" : livePieces > 0 ? "degraded" : "offline",
      source: livePieces === 3 ? "live" : "fallback",
      checkedAt: new Date(),
      responseMs: Math.round(performance.now() - start),
      errors,
      counts: {
        structures: structures.count ?? publicFallbackData.structures.length,
        medications: medications.count ?? publicFallbackData.medications.length,
        bloodUnits: bloodList.reduce((sum, item) => sum + Number(item.units_available ?? 0), 0),
      },
      structures: structures.data?.length ? structures.data : publicFallbackData.structures,
      medications: medications.data?.length ? medications.data : publicFallbackData.medications,
      bloodStocks: bloodList,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { operations: state, loading, refresh };
};
