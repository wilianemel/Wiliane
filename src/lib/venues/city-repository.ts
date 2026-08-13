import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Leitura de regions/cities/city_regions (027_create_regions_and_cities.sql)
 * — preparação de dados para um futuro seletor "Região → Cidade" na
 * Home/Header. Nenhum componente visual consome isto ainda (a tarefa pediu
 * explicitamente para não criar um dropdown simples agora, só a estrutura).
 *
 * Como a migration 027 ainda não foi aplicada no Supabase, qualquer chamada
 * daqui retorna lista vazia em vez de derrubar a página que a usar — mesmo
 * espírito defensivo de getPublishedVenues() em venue-repository.ts.
 */

export interface CityOption {
  id: string;
  slug: string;
  name: string;
}

export interface RegionWithCities {
  id: string;
  slug: string;
  name: string;
  cities: CityOption[];
}

interface RegionRow {
  id: string;
  slug: string;
  name: string;
}

interface CityRegionRow {
  region_id: string;
  cities: { id: string; slug: string; name: string } | { id: string; slug: string; name: string }[] | null;
}

function resolveCity(cities: CityRegionRow["cities"]): CityOption | null {
  if (!cities) return null;
  const row = Array.isArray(cities) ? cities[0] : cities;
  return row ? { id: row.id, slug: row.slug, name: row.name } : null;
}

/**
 * Retorna todas as regiões ativas, cada uma com suas cidades (ordenadas por
 * nome). Pensado para alimentar uma futura experiência em duas etapas
 * (escolher região, depois escolher cidade dentro dela).
 */
export async function getRegionsWithCities(): Promise<RegionWithCities[]> {
  try {
    const supabase = await createClient();

    const { data: regions, error: regionsError } = await supabase
      .from("regions")
      .select("id, slug, name")
      .order("name", { ascending: true });

    if (regionsError) throw regionsError;

    const result: RegionWithCities[] = [];

    for (const region of (regions ?? []) as RegionRow[]) {
      const { data: cityRegions, error: cityRegionsError } = await supabase
        .from("city_regions")
        .select("region_id, cities (id, slug, name)")
        .eq("region_id", region.id);

      if (cityRegionsError) throw cityRegionsError;

      const cities = ((cityRegions ?? []) as unknown as CityRegionRow[])
        .map((row) => resolveCity(row.cities))
        .filter((city): city is CityOption => city !== null)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

      result.push({ id: region.id, slug: region.slug, name: region.name, cities });
    }

    return result;
  } catch {
    console.warn(
      "[city-repository] Não foi possível carregar regiões/cidades (migration 027 provavelmente ainda não aplicada); retornando lista vazia.",
    );
    return [];
  }
}
