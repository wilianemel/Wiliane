-- ============================================================================
-- Migration: venue_media_bucket_hevc_and_larger_videos
-- Amplia o bucket venue-media (criado em
-- 010_create_owned_venue_and_storage_policies.sql): limite de arquivo de
-- 50 MB para 100 MB, e novos MIME types para vídeo em HEVC/H.265 e imagem
-- em HEIC/HEIF — preservando os 5 tipos originais (image/jpeg, image/png,
-- image/webp, video/mp4, video/webm). Nenhum é removido.
--
-- HEVC/H.265 é aceito para UPLOAD (o bucket libera o arquivo e o Storage
-- guarda normalmente), mas nem todo navegador consegue REPRODUZIR HEVC
-- sem conversão (ex.: Chrome no Linux, várias versões do Firefox) — isso é
-- uma limitação do player de vídeo do navegador de quem VÊ a página
-- pública, não deste bucket nem do upload em si. Ver o mesmo aviso em
-- src/lib/venues/venue-media.ts (ALLOWED_VIDEO_TYPES).
--
-- video/quicktime (.mov) e image/heic|image/heif entram porque o pedido
-- original menciona explicitamente ".mov codificados em HEVC" e "HEIC/HEIF,
-- se o navegador conseguir identificar corretamente" — sem esses MIME
-- types aqui, o Storage rejeitaria esses arquivos mesmo que o frontend já
-- os aceitasse, quebrando o pedido.
--
-- Não apaga nada: só amplia file_size_limit e allowed_mime_types do
-- bucket. Nenhuma linha de storage.objects, RLS, plano comercial ou
-- limite de QUANTIDADE de vídeo/foto por plano é tocado aqui — aqueles
-- continuam só nos gatilhos _enforce_venue_media_video_limit/
-- _enforce_venue_media_image_limit e em venue_plan_definitions.
-- ============================================================================

update storage.buckets
set
  file_size_limit = 104857600, -- 100 MB, em bytes (era 50 MB = 52428800)
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/hevc',
    'video/h265',
    'video/x-h265'
  ]
where id = 'venue-media';
