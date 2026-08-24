"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  /** Rótulo curto pro log — identifica qual seção quebrou (ex.: "vídeo do perfil", "galeria"). */
  label: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Isola uma seção da página — se algo dentro dela lançar uma exceção durante
 * o render (ex.: mídia com URL inválida chegando em <Image>/<video>), só
 * essa seção cai pro `fallback`; o resto da página (dados, contato,
 * horários etc.) continua aparecendo normalmente em vez da página inteira
 * quebrar com o erro genérico "A server error occurred". Só React Error
 * Boundaries (via componentDidCatch, exclusivo de class components — não
 * existe hook equivalente) pegam esse tipo de exceção; um try/catch comum
 * não funciona para erros de render.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error(
      `[ErrorBoundary] Falha ao renderizar "${this.props.label}" — mostrando fallback, resto da página intacto.`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
