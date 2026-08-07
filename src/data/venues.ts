import type { IntentionId, MusicPreferenceId } from "@/types/discovery";
import type { VenueAtmosphereTag, VenueCompanionTag } from "@/lib/venues/venue-tags";

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
  /** Cidade demonstrativa onde o local está localizado. */
  city: string;
  neighborhood: string;
  /** Endereço demonstrativo, usado apenas para exibição e busca de rota. */
  address: string;
  priceRange: PriceRange;
  description: string;
  tags: string[];
  /** Tipos de culinária demonstrativos, usados na busca direta. */
  cuisineTypes: string[];
  schedule: string[];
  /**
   * Percentual de compatibilidade cosmético usado apenas nos dados de
   * demonstração mais antigos. Não existe coluna equivalente no Supabase e
   * não deve ser inventado no mapeamento — por isso é opcional, e a Home
   * não deve exibi-lo. O percentual real de recomendação vem de
   * `MatchResult.score`, calculado em `match-engine.ts` dentro de
   * `/descobrir`.
   */
  compatibility?: number;
  /** Classes de gradiente usadas como área reservada para imagem futura. */
  gradient: string;
  /** Gasto médio por pessoa, em reais, usado no cálculo de orçamento. */
  averagePricePerPerson: number;
  /** Distância até o usuário, em quilômetros; `null` quando desconhecida (sem geolocalização real ainda). */
  distanceKm: number | null;
  /** Momentos com os quais este local combina. */
  intentions: IntentionId[];
  /**
   * Tipos de companhia para os quais este local é adequado. Inclui as
   * opções do questionário de /descobrir (CompanionId) como subconjunto,
   * mais um vocabulário mais amplo (ver venue-tags.ts) coletado no painel
   * da empresa — pensado para alimentar o motor de afinidade com mais
   * sinais de recomendação no futuro, além do que o questionário usa hoje.
   */
  companions: VenueCompanionTag[];
  /**
   * Ambientes/estilo/experiência que descrevem este local. Mesma lógica de
   * `companions`: superset de AtmosphereId, coletado no painel da empresa
   * para uso futuro do motor de afinidade.
   */
  atmospheres: VenueAtmosphereTag[];
  /** Estilos musicais presentes na programação do local. */
  musicStyles: MusicPreferenceId[];
  /** Indica se o local está demonstrativamente aberto agora. */
  openNow: boolean;
  /** Confiabilidade demonstrativa dos dados cadastrais, de 0 a 100. */
  dataConfidence: number;
  /** Data de referência da última atualização demonstrativa dos dados. */
  updatedAt: string;
  /** Data da última verificação declarada no banco, quando disponível. */
  lastVerifiedAt?: string;
  /** Identifica os registros fictícios usados para validar o MVP. */
  isDemo?: boolean;
  /** Itens de cardápio demonstrativos, exibidos no perfil do lugar. */
  menuHighlights: string[];
  /** Número de WhatsApp demonstrativo, em formato internacional (sem "+"). */
  whatsappNumber: string;
  /** URL pública de um vídeo real do estabelecimento, quando cadastrada. */
  videoUrl?: string;
  /** URL pública da imagem de capa real, quando cadastrada. */
  coverImageUrl?: string;
  /** URL pública do logotipo real, quando cadastrado. */
  logoUrl?: string;
  /** URL externa de reserva (ex.: sistema de reservas do estabelecimento), quando cadastrada. */
  reservationUrl?: string;
  /** URLs públicas de imagens da galeria no Supabase Storage, listadas por prefixo (sem coluna própria no banco). Ausente ou vazio quando não há nenhuma. */
  galleryUrls?: string[];
}

export const venues: Venue[] = [
  {
    id: "garagem-do-espeto",
    name: "Garagem do Espeto",
    category: "Hamburgueria e casa de carnes",
    city: "São José dos Campos",
    neighborhood: "Jardim Morumbi",
    address:
      "Av. Benedito Domingues de Oliveira, 467, Jardim Morumbi, São José dos Campos - SP, CEP 12236-700",
    priceRange: "$$",
    description:
      "Hamburgueria e casa de carnes com identidade inspirada em garagens e oficinas retrô. O cardápio reúne hambúrgueres, torresmo, carnes nobres, petiscos, sobremesas artesanais, drinks e cervejas especiais, em um ambiente descontraído, rústico e industrial. O atendimento acontece por ordem de chegada.",
    tags: [
      "Temática automotiva retrô",
      "Atendimento por ordem de chegada",
      "Sem reservas",
      "Sem delivery",
      "Sem iFood",
      "Sem música ao vivo",
      "Sem transmissão de jogos",
      "Não aceita pets",
      "Pedidos para retirada",
    ],
    cuisineTypes: ["Brasileira", "Hambúrgueres", "Carnes", "Petiscos"],
    schedule: ["Terça a sábado, das 17h30 às 22h"],
    gradient: "from-rose-500/20 via-zinc-900 to-black",
    averagePricePerPerson: 90,
    // Sem geolocalização real ainda: distância desconhecida, nunca 0.
    distanceKm: null,
    // "intentions", "atmospheres" e "companions" foram pedidos com valores em
    // português livre que não existem nos union types atuais (IntentionId,
    // AtmosphereId, CompanionId), usados também pelas perguntas de
    // `/descobrir` e pelos Records exaustivos do motor de afinidade. Mapeei
    // para os valores existentes mais próximos, em vez de expandir esses
    // tipos (o que exigiria novas opções de pergunta e novos textos de
    // motivo, fora do escopo desta tarefa). Ver relatório para o de-para
    // completo.
    intentions: ["amigos", "relaxar", "novidade"],
    companions: ["amigos", "casal"],
    atmospheres: ["casual"],
    musicStyles: [],
    openNow: false,
    isDemo: false,
    dataConfidence: 80,
    updatedAt: "2026-07-17",
    menuHighlights: [
      "Hambúrgueres",
      "Torresmo",
      "Carnes nobres",
      "Milk-shake de bacon",
      "Ninho com Nutella",
      "Cheesecake",
      "Cervejas especiais",
      "Drinks autorais",
    ],
    whatsappNumber: "5512988969006",
  },
  {
    id: "bella-serra",
    name: "Bella Serra",
    category: "Restaurante Italiano",
    city: "São José dos Campos",
    neighborhood: "Jardim Aquarius",
    address: "Rua Demonstrativa 480, Jardim Aquarius - São José dos Campos, SP",
    priceRange: "$$$",
    description:
      "Massas artesanais, carta de vinhos selecionada e iluminação intimista, perfeito para um jantar a dois sem pressa.",
    tags: ["Culinária italiana", "Ambiente romântico", "Vinhos selecionados"],
    cuisineTypes: ["Italiana"],
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
    menuHighlights: [
      "Tagliatelle ao ragù de cordeiro — R$ 89",
      "Risoto de funghi — R$ 78",
      "Taça de vinho tinto selecionado — R$ 38",
    ],
    whatsappNumber: "5512999110002",
  },
  {
    id: "rooftop-360",
    name: "Rooftop 360",
    category: "Bar & Rooftop",
    city: "São José dos Campos",
    neighborhood: "Centro",
    address: "Rua Demonstrativa 10, Centro - São José dos Campos, SP",
    priceRange: "$$$",
    description:
      "Vista panorâmica da cidade, drinks autorais e pôr do sol garantido. Ideal para comemorar ou simplesmente aproveitar a noite.",
    tags: ["Vista panorâmica", "Drinks autorais", "Pôr do sol"],
    cuisineTypes: ["Drinks autorais", "Contemporânea"],
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
    menuHighlights: [
      "Drink autoral com pôr do sol — R$ 34",
      "Tábua de queijos e frios — R$ 72",
      "Espumante nacional (taça) — R$ 29",
    ],
    whatsappNumber: "5512999110003",
  },
  {
    id: "cafe-aurora",
    name: "Café Aurora",
    category: "Café & Brunch",
    city: "São José dos Campos",
    neighborhood: "Jardim Satélite",
    address: "Rua Demonstrativa 75, Jardim Satélite - São José dos Campos, SP",
    priceRange: "$",
    description:
      "Brunch caprichado, café coado na hora e um pátio arborizado para relaxar sem pressa em qualquer dia da semana.",
    tags: ["Brunch", "Ambiente tranquilo", "Pet friendly"],
    cuisineTypes: ["Cafeteria", "Brunch"],
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
    menuHighlights: [
      "Brunch completo — R$ 39",
      "Café coado da casa — R$ 12",
      "Bolo de fubá com goiabada — R$ 16",
    ],
    whatsappNumber: "5512999110004",
  },
  {
    id: "quintal-da-familia",
    name: "Quintal da Família",
    category: "Restaurante Familiar",
    city: "São José dos Campos",
    neighborhood: "Urbanova",
    address: "Rua Demonstrativa 900, Urbanova - São José dos Campos, SP",
    priceRange: "$$",
    description:
      "Espaço amplo com área externa, buffet variado e estrutura kids para reunir todas as gerações da família em um só lugar.",
    tags: ["Espaço kids", "Buffet variado", "Área externa"],
    cuisineTypes: ["Brasileira", "Buffet"],
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
    menuHighlights: [
      "Buffet livre em família — R$ 59",
      "Sobremesa infantil cortesia",
      "Suco natural à vontade — R$ 14",
    ],
    whatsappNumber: "5512999110005",
  },
  {
    id: "casa-do-rock",
    name: "Casa do Rock",
    category: "Casa de Shows",
    city: "São José dos Campos",
    neighborhood: "Vila Adyana",
    address: "Rua Demonstrativa 33, Vila Adyana - São José dos Campos, SP",
    priceRange: "$$",
    description:
      "Bandas autorais, tributos e cerveja artesanal em um espaço feito para quem quer curtir uma boa música ao vivo.",
    tags: ["Bandas autorais", "Cerveja artesanal", "Pista de dança"],
    cuisineTypes: ["Petiscos", "Cervejaria"],
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
    menuHighlights: [
      "Cerveja artesanal IPA — R$ 24",
      "Porção de isca de frango — R$ 48",
      "Combo casal (2 chopps + porção) — R$ 89",
    ],
    whatsappNumber: "5512999110006",
  },
];
