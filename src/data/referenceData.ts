// Reference data cache — Phase B of the enterprise architecture upgrade.
//
// Small, near-static lookup tables (<100 rows, change rarely) are fetched ONCE
// per session and shared across the app via React Query's cache. This removes
// thousands of redundant calls per day to:
//   - contract_service_rates  (#6 slowest query, ~8.2k calls / 80 rows)
//   - airlines / airports     (lateral-joined on every flight list)
//   - delay_codes, aircraft_types_ref  (static enums in disguise)
//
// Rules:
//   - 24h staleTime — these tables change weekly at most.
//   - gcTime: Infinity — never evicted from cache during the session.
//   - refetchOnWindowFocus / refetchOnMount: OFF — single source of truth.
//   - Auth-gated via useAuth().session.
//
// Mutations to any of these tables MUST invalidate the matching key
// (queryClient.invalidateQueries({ queryKey: refKeys.airlines })).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const refKeys = {
  airlines: ["ref", "airlines"] as const,
  airports: ["ref", "airports"] as const,
  contractServiceRates: ["ref", "contract_service_rates"] as const,
  delayCodes: ["ref", "delay_codes"] as const,
  aircraftTypes: ["ref", "aircraft_types_ref"] as const,
  servicesCatalog: ["ref", "services_catalog"] as const,
  countries: ["ref", "countries"] as const,
} as const;

const REF_OPTIONS = {
  staleTime: 24 * 60 * 60 * 1000, // 24h
  gcTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  retry: 2,
} as const;

function useRefTable<T = any>(
  key: readonly unknown[],
  table: string,
  select = "*",
  orderBy?: string,
) {
  const { session } = useAuth();
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase.from(table as any).select(select);
      if (orderBy) q = q.order(orderBy, { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
    enabled: !!session,
    ...REF_OPTIONS,
  });
}

export const useAirlinesRef = () =>
  useRefTable<{ id: string; name: string; iata_code: string | null; icao_code: string | null; code: string | null; status: string | null }>(
    refKeys.airlines,
    "airlines",
    "id,code,name,iata_code,icao_code,status,billing_currency,credit_terms",
    "name",
  );

export const useAirportsRef = () =>
  useRefTable<{ id: string; name: string; iata_code: string | null; icao_code: string | null; city: string | null; country_id: string | null; status: string | null }>(
    refKeys.airports,
    "airports",
    "id,name,iata_code,icao_code,city,country_id,status",
    "iata_code",
  );

export const useContractServiceRatesRef = () =>
  useRefTable(refKeys.contractServiceRates, "contract_service_rates");

export const useDelayCodesRef = () =>
  useRefTable(refKeys.delayCodes, "delay_codes", "*", "code");

export const useAircraftTypesRef = () =>
  useRefTable(refKeys.aircraftTypes, "aircraft_types_ref", "*", "code");

export const useServicesCatalogRef = () =>
  useRefTable(refKeys.servicesCatalog, "services_catalog");

export const useCountriesRef = () =>
  useRefTable(refKeys.countries, "countries", "*", "name");
