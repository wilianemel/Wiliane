import type {
  AtmosphereId,
  CompanionId,
  IntentionId,
  MusicPreferenceId,
} from "@/types/discovery";

/**
 * Dados de demonstração (mock).
 *
 * Estes estabelecimentos são fictícios e servem apenas para ilustrar o
 * layout e o funcionamento do produto nesta fase de MVP. Nenhuma
 * informação aqui reflete um negócio real, e nenhum dado é obtido de
 * banco de dados, API externa ou serviço de terceiros.
 *
 * Os campos abaixo também alimentam o motor de afinidade determinístico
 * usado em `/descobrir` (ver `src/lib/match-engine.ts`).
 */

export type PriceRange = "$" | "$$" | "$$$";

export interface Venue {
  id: string;
  name: string;
  category: string;
  neighborhood: string;
  priceRange: PriceRange;
  description: string;
  tags: string[];
  schedule: string[];
  /** Percentual demonstrativo de compatibilidade com o momento do usuário. */
  compatibility: number;
  /** Classes de gradiente usadas como área reservada para imagem futura. */
  gradient: string;
  /** Gasto médio por pessoa, em reais, usado no cálculo de orçamento. */
  averagePricePerPerson: number;
  /** Distância demonstrativa até o usuário, em quilômetros. */
  distanceKm: number;
  /** Momentos com os quais este local combina. */
  intentions: IntentionId[];
  /** Tipos de companhia para os quais este local é adequado. */
  companions: CompanionId[];
  /** Ambientes que descrevem este local. */
  atmospheres: AtmosphereId[];
  /** Estilos musicais presentes na programação do local. */
  musicStyles: MusicPreferenceId[];
  /** Indica se o local está demonstrativamente aberto agora. */
  openNow: boolean;
  /** Confiabilidade demonstrativa dos dados cadastrais, de 0 a 100. */
  dataConfidence: number;
  /** Data de referência da última atualização demonstrativa dos dados. */
  updatedAt: string;
}

export const venues: Venue[] = [
  {
    id: "pub-do-vale",
    name: "Pub do Vale",
    category: "Bar & Pub",
    neighborhood: "Vila Ema",
    priceRange: "$$",
    description:
      "Chopp artesanal, petiscos encorpados e música ao vivo em um ambiente descontraído para juntar a turma depois do trabalho.",
    tags: ["Chopp artesanal", "Música ao vivo", "Ambiente descontraído"],
    schedule: ["Sexta: Rock ao vivo às 21h", "Sábado: Cover acústico às 20h"],
    compatibility: 92,
    gradient: "from-amber-500/30 via-zinc-900 to-black",
    averagePricePerPerson: 70,
    distanceKm: 6.5,
    intentions: ["amigos", "musica-ao-vivo", "comemorar", "surpreenda"],
    companions: ["amigos", "casal"],
    atmospheres: ["animado", "casual"],
    musicStyles: ["rock", "mpb"],
    openNow: true,
    dataConfidence: 90,
    updatedAt: "2026-07-10",
  },
  {
    id: "bella-serra",
    name: "Bella Serra",
    category: "Restaurante Italiano",
    neighborhood: "Jardim Aquarius",
    priceRange: "$$$",
    description:
      "Massas artesanais, carta de vinhos selecionada e iluminação intimista, perfeito para um jantar a dois sem pressa.",
    tags: ["Culinária italiana", "Ambiente romântico", "Vinhos selecionados"],
    schedule: ["Terça a domingo: Jantar a partir das 19h"],
    compatibility: 88,
    gradient: "from-rose-500/20 via-zinc-900 to-black",
    averagePricePerPerson: 180,
    distanceKm: 9.8,
    intentions: ["casal", "comemorar", "surpreenda"],
    companions: ["casal"],
    atmospheres: ["romantico", "sofisticado"],
    musicStyles: ["ambiente"],
    openNow: true,
    dataConfidence: 95,
    updatedAt: "2026-07-12",
  },
  {
    id: "rooftop-360",
    name: "Rooftop 360",
    category: "Bar & Rooftop",
    neighborhood: "Centro",
    priceRange: "$$$",
    description:
      "Vista panorâmica da cidade, drinks autorais e pôr do sol garantido. Ideal para comemorar ou simplesmente aproveitar a noite.",
    tags: ["Vista panorâmica", "Drinks autorais", "Pôr do sol"],
    schedule: ["Quinta a sábado: DJ set às 22h"],
    compatibility: 95,
    gradient: "from-yellow-400/25 via-zinc-900 to-black",
    averagePricePerPerson: 150,
    distanceKm: 4.2,
    intentions: ["casal", "comemorar", "amigos", "novidade", "surpreenda"],
    companions: ["casal", "amigos"],
    atmospheres: ["sofisticado", "animado", "romantico"],
    musicStyles: ["eletronica", "mpb"],
    openNow: true,
    dataConfidence: 97,
    updatedAt: "2026-07-14",
  },
  {
    id: "cafe-aurora",
    name: "Café Aurora",
    category: "Café & Brunch",
    neighborhood: "Jardim Satélite",
    priceRange: "$",
    description:
      "Brunch caprichado, café coado na hora e um pátio arborizado para relaxar sem pressa em qualquer dia da semana.",
    tags: ["Brunch", "Ambiente tranquilo", "Pet friendly"],
    schedule: ["Todos os dias: Café da manhã e brunch até 12h"],
    compatibility: 84,
    gradient: "from-orange-400/20 via-zinc-900 to-black",
    averagePricePerPerson: 45,
    distanceKm: 3.1,
    intentions: ["relaxar", "familia", "novidade", "surpreenda"],
    companions: ["sozinho", "casal", "familia", "amigos"],
    atmospheres: ["tranquilo", "casual", "familiar"],
    musicStyles: ["ambiente"],
    openNow: true,
    dataConfidence: 92,
    updatedAt: "2026-07-13",
  },
  {
    id: "quintal-da-familia",
    name: "Quintal da Família",
    category: "Restaurante Familiar",
    neighborhood: "Urbanova",
    priceRange: "$$",
    description:
      "Espaço amplo com área externa, buffet variado e estrutura kids para reunir todas as gerações da família em um só lugar.",
    tags: ["Espaço kids", "Buffet variado", "Área externa"],
    schedule: ["Domingo: Almoço em família das 12h às 16h"],
    compatibility: 90,
    gradient: "from-lime-500/20 via-zinc-900 to-black",
    averagePricePerPerson: 65,
    distanceKm: 12.4,
    intentions: ["familia", "comemorar", "surpreenda"],
    companions: ["familia", "amigos"],
    atmospheres: ["familiar", "casual"],
    musicStyles: ["sertanejo", "mpb"],
    openNow: true,
    dataConfidence: 88,
    updatedAt: "2026-07-08",
  },
  {
    id: "casa-do-rock",
    name: "Casa do Rock",
    category: "Casa de Shows",
    neighborhood: "Vila Adyana",
    priceRange: "$$",
    description:
      "Bandas autorais, tributos e cerveja artesanal em um espaço feito para quem quer curtir uma boa música ao vivo.",
    tags: ["Bandas autorais", "Cerveja artesanal", "Pista de dança"],
    schedule: [
      "Sexta: Banda de rock nacional às 22h",
      "Sábado: Tributo anos 80 às 21h",
    ],
    compatibility: 87,
    gradient: "from-red-500/20 via-zinc-900 to-black",
    averagePricePerPerson: 90,
    distanceKm: 18.5,
    intentions: ["amigos", "musica-ao-vivo", "comemorar", "novidade", "surpreenda"],
    companions: ["amigos", "casal"],
    atmospheres: ["animado", "casual"],
    musicStyles: ["rock"],
    openNow: true,
    dataConfidence: 85,
    updatedAt: "2026-07-05",
  },
];
