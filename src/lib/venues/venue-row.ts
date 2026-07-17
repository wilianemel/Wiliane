/** Representação manual de uma linha de `public.venues`. */
export interface VenueRow {
  id: string;
  slug: string;
  name: string;
  city: string;
  neighborhood: string;
  address: string;
  category: string;
  description: string;
  cuisine_types: string[] | null;
  tags: string[] | null;
  music_styles: string[] | null;
  atmospheres: string[] | null;
  intentions: string[] | null;
  companions: string[] | null;
  menu_highlights: string[] | null;
  schedule: string[] | null;
  price_range: string | null;
  average_price_per_person: number | null;
  average_price_for_couple: number | null;
  distance_km: number | null;
  whatsapp_number: string | null;
  instagram_url: string | null;
  menu_url: string | null;
  cover_image_url: string | null;
  video_url: string | null;
  data_confidence: number;
  is_published: boolean;
  is_featured: boolean;
  open_now: boolean;
  is_demo: boolean;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}
