"use client";

import { createClient } from "@/lib/supabase/client";

export const MEDIA_BUCKET = "venue-media";

/** HEIC/HEIF só entra quando o navegador consegue identificar o MIME type corretamente — sem fallback por extensão para imagem (diferente de vídeo, ver ALLOWED_VIDEO_EXTENSIONS). */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

/**
 * video/quicktime cobre .mov (inclusive quando o conteúdo interno está
 * codificado em HEVC/H.265 — o navegador só expõe o container .mov, não o
 * codec). video/hevc, video/h265 e video/x-h265 são os MIME types que
 * alguns navegadores/SOs relatam para HEVC "puro" (.hevc/.h265).
 *
 * HEVC/H.265 é aceito para UPLOAD, mas nem todo navegador consegue
 * REPRODUZIR HEVC sem conversão (ex.: Chrome no Linux, várias versões do
 * Firefox) — isso é uma limitação de player de quem VÊ a página pública
 * depois, não deste upload. O mesmo aviso está na migration do bucket
 * (venue_media_bucket_hevc_and_larger_videos.sql).
 */
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/hevc",
  "video/h265",
  "video/x-h265",
] as const;

/**
 * Fallback por extensão pra vídeo — muitos navegadores não relatam
 * `file.type` corretamente pra HEVC/H.265/.mov (vem vazio ou genérico tipo
 * "application/octet-stream"), então o formato só seria rejeitado por
 * engano se dependêssemos só do MIME type. Nunca usado pra imagem.
 */
const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".hevc", ".h265"];

function hasAllowedVideoExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_VIDEO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/** Mesmo teto configurado no bucket venue-media para imagem — validado aqui só para feedback rápido; a aplicação real do limite é no servidor. */
export const MAX_IMAGE_FILE_SIZE_BYTES = 50 * 1024 * 1024;
/** 100 MB — HEVC/H.265 e vídeos mais longos pedem mais espaço que imagem. Mesmo teto do bucket (venue_media_bucket_hevc_and_larger_videos.sql). */
export const MAX_VIDEO_FILE_SIZE_BYTES = 100 * 1024 * 1024;
/** Limite de duração de vídeo, verificado no navegador antes do envio (ver validateVideoDuration) — nunca imposto pelo banco (nenhuma forma segura de validar duração real no servidor sem decodificar o arquivo). */
export const MAX_VIDEO_DURATION_SECONDS = 60;

export type MediaKind = "image" | "video";

export interface VenueEffectiveLimits {
  planType: string;
  videoLimit: number;
  imageLimit: number;
  viewLimit: number | null;
  viewCount: number;
}

interface VenueEffectiveLimitsRow {
  plan_type: string;
  video_limit: number;
  image_limit: number;
  view_limit: number | null;
  view_count: number;
}

const FREE_PLAN_FALLBACK: VenueEffectiveLimits = {
  planType: "free",
  videoLimit: 1,
  imageLimit: 1,
  viewLimit: 300,
  viewCount: 0,
};

/**
 * Limites efetivos do plano ativo do venue (vídeo/imagem/visualização), via
 * RPC get_venue_effective_limits — a autoridade real continua sendo o banco
 * (gatilhos de limite, migration venue_commercial_plans); isto só existe
 * pra mostrar "X/Y" no painel sem esperar um upload falhar. A RPC já roda o
 * downgrade automático (lazy) do plano partner vencido antes de responder,
 * então o painel nunca mostra um plano vencido como se ainda estivesse ativo.
 */
export async function getVenueEffectiveLimits(venueId: string): Promise<VenueEffectiveLimits> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_venue_effective_limits", { p_venue_id: venueId });

  if (error || !data || data.length === 0) return FREE_PLAN_FALLBACK;

  const row = data[0] as VenueEffectiveLimitsRow;
  return {
    planType: row.plan_type,
    videoLimit: row.video_limit,
    imageLimit: row.image_limit,
    viewLimit: row.view_limit,
    viewCount: row.view_count,
  };
}

/** Limite de vídeos do plano ativo — atalho fino sobre getVenueEffectiveLimits. */
export async function getVenueVideoLimit(venueId: string): Promise<number> {
  return (await getVenueEffectiveLimits(venueId)).videoLimit;
}

/** Limite de imagens da galeria do plano ativo — atalho fino sobre getVenueEffectiveLimits. */
export async function getVenueImageLimit(venueId: string): Promise<number> {
  return (await getVenueEffectiveLimits(venueId)).imageLimit;
}

interface VenueMediaUploadAccessRow {
  is_authenticated: boolean;
  venue_exists: boolean;
  has_active_owner: boolean;
  current_user_can_manage: boolean;
}

/**
 * Confere, imediatamente antes de qualquer upload de capa/vídeo: (1) existe
 * sessão autenticada, (2) o venueId corresponde a um estabelecimento real,
 * (3) o usuário atual tem vínculo ativo (owner/manager) ou é admin. Via RPC
 * (check_venue_media_upload_access) porque a RLS de venue_members só deixa
 * cada usuário ler a própria membership — não dá pra saber, direto do
 * cliente, se ALGUÉM (outra pessoa) é o dono ativo, distinção necessária
 * pra escolher a mensagem certa. VenueAccessGate já faz uma checagem
 * parecida ao carregar a página, mas só uma vez — isto reconfirma na hora
 * exata do envio, cobrindo o caso do vínculo ter sido removido (ex.: admin
 * removeu o proprietário) enquanto o painel já estava aberto numa aba.
 */
export async function verifyVenueUploadAccess(
  venueId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("check_venue_media_upload_access", { p_venue_id: venueId })
    .single<VenueMediaUploadAccessRow>();

  if (error || !data) {
    return { ok: false, error: "Não foi possível confirmar sua permissão agora. Tente novamente." };
  }
  if (!data.is_authenticated) {
    return {
      ok: false,
      error: "Você precisa estar autenticado para enviar mídia. Entre novamente e tente de novo.",
    };
  }
  if (!data.venue_exists) {
    return {
      ok: false,
      error: "Não foi possível confirmar este estabelecimento agora. Atualize a página e tente novamente.",
    };
  }
  if (!data.has_active_owner) {
    return {
      ok: false,
      error:
        'Este estabelecimento ainda não está vinculado à sua conta. Volte ao fluxo "Meu estabelecimento já está cadastrado" para assumir o controle antes de enviar mídias.',
    };
  }
  if (!data.current_user_can_manage) {
    return { ok: false, error: "Você não tem permissão para editar este estabelecimento." };
  }

  return { ok: true };
}

export function validateMediaFile(file: File, kind: MediaKind): string | null {
  if (kind === "image") {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return "Formato inválido. Envie um arquivo JPG, PNG, WebP ou HEIC/HEIF.";
    }
    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      return "Arquivo muito grande. O limite é 50 MB.";
    }
    return null;
  }

  // Vídeo: MIME type reconhecido OU extensão reconhecida — ver
  // ALLOWED_VIDEO_EXTENSIONS (necessário pra HEVC/H.265/.mov, onde o
  // navegador frequentemente não relata um file.type utilizável).
  const hasKnownMimeType = (ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type);
  if (!hasKnownMimeType && !hasAllowedVideoExtension(file.name)) {
    return "Formato de vídeo não suportado.";
  }
  if (file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
    return "O vídeo deve ter no máximo 100 MB.";
  }
  return null;
}

/**
 * Lê a duração real do vídeo no navegador (elemento <video> fora do DOM,
 * só metadata — nunca envia nada, nunca toca o Storage/banco) e devolve a
 * mensagem de erro se passar de MAX_VIDEO_DURATION_SECONDS.
 *
 * HEVC/H.265: alguns navegadores não conseguem DECODIFICAR esse codec
 * (ex.: Chrome no Linux, várias versões do Firefox) — nesse caso o evento
 * de metadata nunca dispara. Um timeout evita travar o formulário pra
 * sempre; quando a duração não pôde ser confirmada (timeout ou erro de
 * decodificação), a checagem é PULADA em vez de bloquear um vídeo válido
 * só porque este navegador específico não sabe ler esse arquivo — o
 * limite de 60s continua sendo a regra, só não foi possível confirmá-la
 * aqui. Nunca inventa um limite de duração no banco: esta validação é
 * inteiramente client-side, best-effort.
 */
export async function validateVideoDuration(file: File): Promise<string | null> {
  try {
    const duration = await readVideoDurationSeconds(file);
    if (Number.isFinite(duration) && duration > MAX_VIDEO_DURATION_SECONDS) {
      return "O vídeo deve ter no máximo 60 segundos.";
    }
    return null;
  } catch (error) {
    console.warn(
      "VALIDATE VIDEO DURATION: não foi possível ler a duração deste vídeo neste navegador (comum com HEVC/H.265 sem suporte de decodificação) — envio segue sem essa checagem.",
      error,
    );
    return null;
  }
}

function readVideoDurationSeconds(file: File, timeoutMs = 8000): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Tempo esgotado ao ler metadados do vídeo."));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    }

    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("O navegador não conseguiu ler os metadados deste vídeo."));
    };

    video.src = objectUrl;
  });
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  return cleaned || "arquivo";
}

export function getMediaPublicUrl(path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Traduz o erro do Storage do Supabase numa mensagem específica quando dá
 * pra reconhecer a causa (tamanho ou formato recusado pelo bucket) — nunca
 * some com a causa real numa mensagem genérica sem tentar identificar o
 * motivo primeiro. `validateMediaFile` já bloqueia esses dois casos antes
 * de chegar aqui na maioria das vezes; isto é a segunda linha de defesa
 * caso o Storage recuse por um motivo que o cliente não pegou.
 */
function describeStorageError(error: { message?: string; statusCode?: string }): string {
  const message = (error.message ?? "").toLowerCase();
  if (
    error.statusCode === "413" ||
    message.includes("exceeded the maximum allowed size") ||
    message.includes("too large") ||
    message.includes("payload too large")
  ) {
    return "Arquivo muito grande para o Storage. O limite é 100 MB para vídeo e 50 MB para imagem.";
  }
  if (message.includes("mime type") || message.includes("not allowed") || message.includes("not supported")) {
    return "Formato de arquivo não aceito pelo Storage.";
  }
  console.error("STORAGE UPLOAD ERROR (motivo não reconhecido — investigar):", error);
  return "Erro ao enviar o arquivo para o Storage. Tente novamente.";
}

/**
 * Slots de mídia únicos (capa, logo, vídeo): envia o arquivo NOVO com um
 * nome único (timestamp) — nunca no lugar do antigo. CORREÇÃO (auditoria
 * 3ª rodada): o arquivo antigo nunca é apagado do Storage em nenhum fluxo
 * — nem aqui, nem depois de confirmada a gravação no banco. Um arquivo
 * órfão trocado de capa/logo/vídeo só fica sem nenhuma linha ativa
 * apontando pra ele; a limpeza física, se um dia existir, será uma
 * rotina segura separada, nunca parte deste fluxo de escrita do usuário.
 */
export async function replaceSingleMedia(
  venueId: string,
  folder: "cover" | "logo" | "video",
  file: File,
): Promise<{ url: string; path: string } | { error: string }> {
  const supabase = createClient();
  const prefix = `${venueId}/${folder}`;
  const path = `${prefix}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
  });

  if (error) {
    return { error: describeStorageError(error) };
  }

  return { url: getMediaPublicUrl(path), path };
}

export interface GalleryItem {
  /** null enquanto a imagem só existe no path antigo do Storage, sem linha em venue_media ainda. */
  id: string | null;
  name: string;
  url: string;
}

interface VenueMediaGalleryRow {
  id: string;
  url: string;
}

/**
 * Galeria do painel (CORREÇÃO — consolidação em venue_media): imagens não
 * destacadas — a capa fica no slot próprio, fora daqui. Une o que já está
 * em venue_media (canônico, com id) com o que ainda só existe no path
 * antigo do Storage (<venue_id>/gallery/..., sem id, pendente de "adoção"
 * na primeira remoção/reenvio) — nunca esconde a galeria antiga enquanto
 * a migração para venue_media não estiver completa. Uma imagem já
 * retirada (is_active=false) some das duas listas: da consulta de ativas
 * (óbvio) e da listagem de Storage (filtrada aqui pela URL retirada) —
 * mesmo que o arquivo continue no bucket, nunca apagado fisicamente.
 */
export async function listGalleryItems(venueId: string): Promise<GalleryItem[]> {
  const supabase = createClient();
  const prefix = `${venueId}/gallery`;

  const [activeResult, retiredResult, storageResult] = await Promise.all([
    supabase
      .from("venue_media")
      .select("id, url")
      .eq("venue_id", venueId)
      .eq("media_type", "image")
      .eq("is_featured", false)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("venue_media")
      .select("url")
      .eq("venue_id", venueId)
      .eq("media_type", "image")
      .eq("is_active", false),
    supabase.storage.from(MEDIA_BUCKET).list(prefix, { sortBy: { column: "created_at", order: "desc" } }),
  ]);

  const canonical = (activeResult.data as VenueMediaGalleryRow[] | null) ?? [];
  const canonicalUrls = new Set(canonical.map((row) => row.url));
  const retiredUrls = new Set(
    ((retiredResult.data as { url: string }[] | null) ?? []).map((row) => row.url),
  );

  const legacyOnly = ((storageResult.data ?? []) as { name: string }[])
    .filter((item) => item.name && !item.name.endsWith("/"))
    .map((item) => ({ name: item.name, url: getMediaPublicUrl(`${prefix}/${item.name}`) }))
    .filter((item) => !canonicalUrls.has(item.url) && !retiredUrls.has(item.url));

  return [
    ...canonical.map((row) => ({ id: row.id, name: row.url.split("/").pop() as string, url: row.url })),
    ...legacyOnly.map((item) => ({ id: null, name: item.name, url: item.url })),
  ];
}

/** Registra/reativa uma imagem de galeria em venue_media via RPC segura (add_venue_gallery_media) — nunca INSERT direto do cliente. */
async function addVenueGalleryMedia(venueId: string, url: string): Promise<{ id: string } | { error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("add_venue_gallery_media", {
    p_venue_id: venueId,
    p_url: url,
  });

  if (error) {
    return { error: describeFeaturedMediaRpcError(error) };
  }
  if (!data || data.length === 0) {
    return { error: "Não foi possível registrar a imagem da galeria agora. Tente novamente." };
  }

  return { id: data[0].id as string };
}

/** imageLimit vem do plano ativo (getVenueImageLimit) — a autoridade real é o gatilho de limite do banco; esta checagem só evita um upload que já falharia. */
export async function uploadGalleryImage(
  venueId: string,
  file: File,
  imageLimit: number,
): Promise<{ item: GalleryItem } | { error: string }> {
  const supabase = createClient();
  const prefix = `${venueId}/gallery`;

  const current = await listGalleryItems(venueId);
  if (current.length >= imageLimit) {
    return { error: `Limite de ${imageLimit} imagem${imageLimit === 1 ? "" : "s"} na galeria atingido.` };
  }

  const path = `${prefix}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
  });

  if (uploadError) {
    return { error: "Não foi possível enviar a imagem agora. Tente novamente." };
  }

  const url = getMediaPublicUrl(path);
  const name = path.split("/").pop() as string;

  // Registra em venue_media (canônico) via RPC — se falhar, o arquivo já
  // enviado permanece no Storage (nunca apagado aqui) e a imagem ainda
  // aparece na galeria pela listagem antiga do path, só sem id canônico
  // até uma nova tentativa (próximo upload/remoção tenta de novo).
  const registered = await addVenueGalleryMedia(venueId, url);
  if ("error" in registered) {
    return { item: { id: null, name, url } };
  }

  return { item: { id: registered.id, name, url } };
}

/**
 * Remove uma imagem da galeria — soft delete em venue_media (CORREÇÃO —
 * nunca mais DELETE físico no Storage). Uma imagem ainda sem linha
 * canônica (só existia no path antigo) é adotada primeiro
 * (add_venue_gallery_media) e retirada em seguida; o arquivo em si nunca
 * é apagado — só passa a não aparecer mais, porque listGalleryItems
 * filtra pela URL retirada.
 */
export async function removeGalleryImage(venueId: string, item: GalleryItem): Promise<{ error: string } | null> {
  let mediaId = item.id;

  if (!mediaId) {
    const registered = await addVenueGalleryMedia(venueId, item.url);
    if ("error" in registered) return registered;
    mediaId = registered.id;
  }

  return retireVenueMediaItem(mediaId);
}

export interface VenueMediaListItem {
  id: string;
  url: string;
  mediaType: MediaKind;
  isFeatured: boolean;
}

interface VenueMediaListRow {
  id: string;
  url: string;
  media_type: MediaKind;
  is_featured: boolean;
}

/** Mídia ativa de um venue — usada pelo painel para listar vídeos/capa atuais. Nunca inclui is_active=false. */
export async function listVenueMedia(venueId: string, mediaType?: MediaKind): Promise<VenueMediaListItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("venue_media")
    .select("id, url, media_type, is_featured")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (mediaType) {
    query = query.eq("media_type", mediaType);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as VenueMediaListRow[]).map((row) => ({
    id: row.id,
    url: row.url,
    mediaType: row.media_type,
    isFeatured: row.is_featured,
  }));
}

// CORREÇÃO (causa real do erro de servidor em /lugares/[slug]): estas duas
// funções eram definidas aqui, mas este arquivo tem "use client" no topo —
// código server-only (venue-repository.ts) que as CHAMAVA diretamente
// derrubava a página inteira ("Attempted to call ... from the server").
// Agora vivem em venue-media-resolve.ts (sem "use client", chamável dos
// dois lados) e só são re-exportadas aqui, pra nenhum import existente
// neste arquivo (ex.: a prévia do painel do dono) precisar mudar.
export {
  resolveFeaturedMediaUrl,
  resolveVenueMainImageUrl,
  type ResolvableMainImage,
} from "./venue-media-resolve";

/**
 * Traduz o erro da RPC de escrita de mídia (replace_featured_venue_media,
 * add_venue_gallery_media) numa mensagem segura pra mostrar direto ao
 * usuário — sem esconder a causa real, mas também sem vazar erro técnico
 * bruto do Postgres.
 *
 * CORREÇÃO (causa real do upload de capa/vídeo sempre mostrando "Não foi
 * possível registrar..."): a versão anterior desta função só reconhecia uma
 * lista fixa de mensagens (whitelist por substring) — quando o banco
 * lançava QUALQUER outra coisa (inclusive um erro real e informativo, como
 * "column reference is ambiguous" causado por um bug de qualificação de
 * coluna em replace_featured_venue_media, corrigido na migration
 * fix_ambiguous_columns_media_write_rpcs, ou a mensagem de limite de FOTO —
 * "...foto ativa (limite do plano)...", que nunca batia com o texto de
 * VÍDEO que a whitelist checava) ela caía sempre na mesma mensagem genérica,
 * escondendo o motivo real. A troca: `RAISE EXCEPTION 'texto'` sem SQLSTATE
 * explícito (o padrão usado em toda RPC deste projeto) sempre chega aqui
 * com code 'P0001' — esse texto já é escrito à mão em português, pensado
 * pra leitura direta do usuário, então é sempre seguro mostrar como está,
 * sem whitelist nenhuma. Qualquer OUTRO code é um erro interno do Postgres
 * (coluna ambígua, violação de constraint, permissão no nível do banco
 * etc.) que nunca foi escrito pra leitura de usuário — nesse caso o texto
 * bruto nunca aparece na tela, mas também nunca é silenciado: vai pro
 * console (developer) e a tela mostra o código do erro, no mesmo formato
 * sugerido pelo produto ("O banco recusou este envio: [mensagem segura]").
 */
function describeFeaturedMediaRpcError(error: { message?: string; code?: string }): string {
  if (error.code === "P0001" && error.message) {
    return error.message;
  }

  console.error("MEDIA WRITE RPC ERROR (não é uma exceção de aplicação — investigar):", error);
  return error.code
    ? `O banco recusou este envio: erro ${error.code}. Tente novamente ou avise o suporte se persistir.`
    : "O banco recusou este envio. Tente novamente ou avise o suporte se persistir.";
}

/**
 * Registra/substitui a mídia canônica destacada (capa de imagem, ou um
 * vídeo) via RPC transacional (replace_featured_venue_media) — nunca
 * manipula venue_media direto do cliente. A RPC insere/reativa a mídia
 * NOVA primeiro e só depois retira o destaque da anterior (nunca a linha
 * recém-(re)ativada), então o estabelecimento nunca fica sem mídia se algo
 * falhar no meio do caminho. Sujeita ao limite de vídeo do plano no banco.
 */
export async function upsertFeaturedVenueMedia(
  venueId: string,
  mediaType: MediaKind,
  url: string,
  isFeatured = true,
): Promise<{ error: string } | null> {
  const supabase = createClient();
  const { error } = await supabase.rpc("replace_featured_venue_media", {
    p_venue_id: venueId,
    p_media_type: mediaType,
    p_url: url,
    p_is_featured: isFeatured,
  });

  if (error) {
    return { error: describeFeaturedMediaRpcError(error) };
  }

  return null;
}

/** Retira (soft delete) uma mídia canônica específica — via RPC, nunca DELETE direto. */
export async function retireVenueMediaItem(mediaId: string): Promise<{ error: string } | null> {
  const supabase = createClient();
  const { error } = await supabase.rpc("retire_venue_media", { p_media_id: mediaId });
  if (error) {
    return { error: "Não foi possível atualizar a mídia do estabelecimento agora." };
  }
  return null;
}

/** Alterna destaque de uma mídia canônica já existente — via RPC (imagem: só uma capa por vez; vídeo: independente). */
export async function setVenueMediaFeatured(mediaId: string, featured: boolean): Promise<{ error: string } | null> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_venue_media_featured", {
    p_media_id: mediaId,
    p_featured: featured,
  });
  if (error) {
    return { error: "Não foi possível atualizar o destaque agora. Tente novamente." };
  }
  return null;
}

/** Retira (soft delete) a mídia destacada ativa do tipo informado — usada quando o dono remove a capa (compatibilidade com o slot único). */
export async function retireFeaturedVenueMedia(
  venueId: string,
  mediaType: MediaKind,
): Promise<{ error: string } | null> {
  const items = await listVenueMedia(venueId, mediaType);
  const featured = items.find((item) => item.isFeatured);
  if (!featured) return null;
  return retireVenueMediaItem(featured.id);
}
