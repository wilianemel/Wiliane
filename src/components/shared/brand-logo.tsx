import Image from "next/image";

/**
 * Origem quadrada (1254×1254) das duas versões do logo em `public/brand/`.
 * A arte fica inscrita com folga (raio ~576px de 627px disponíveis), então
 * o recorte circular abaixo nunca corta o desenho, só a moldura de fundo.
 */
const VARIANT_SRC = {
  dark: "/brand/logo-bora-dark.jpeg",
  yellow: "/brand/logo-bora-yellow.jpeg",
} as const;

const SIZE_CLASSES = {
  small: "h-9 w-9 sm:h-10 sm:w-10",
  medium: "h-[72px] w-[72px] md:h-[104px] md:w-[104px]",
  large: "h-24 w-24 md:h-32 md:w-32",
} as const;

const SIZE_SIZES_ATTR = {
  small: "40px",
  medium: "(min-width: 768px) 104px, 72px",
  large: "(min-width: 768px) 128px, 96px",
} as const;

const ALT_TEXT = "Bora pra onde — plataforma de descoberta de experiências";

export type BrandLogoVariant = keyof typeof VARIANT_SRC;
export type BrandLogoSize = keyof typeof SIZE_CLASSES;

interface BrandLogoProps {
  variant: BrandLogoVariant;
  size: BrandLogoSize;
  priority?: boolean;
  className?: string;
}

export function BrandLogo({ variant, size, priority = false, className = "" }: BrandLogoProps) {
  return (
    <Image
      src={VARIANT_SRC[variant]}
      alt={ALT_TEXT}
      width={1254}
      height={1254}
      priority={priority}
      sizes={SIZE_SIZES_ATTR[size]}
      className={`shrink-0 rounded-full object-contain transition-transform duration-200 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100 ${SIZE_CLASSES[size]} ${className}`}
    />
  );
}
