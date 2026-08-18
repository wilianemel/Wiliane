"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { SP_CITIES } from "@/lib/venues/sp-cities";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// text-base (16px): abaixo disso o iOS Safari aplica zoom automático ao focar o campo.
const fieldClasses =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none";

const MAX_SUGGESTIONS = 40;

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

interface CityAutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  /** Aplicada no wrapper (ex.: "mt-2") — o campo já tem seu próprio estilo completo embutido. */
  wrapperClassName?: string;
  /**
   * Opção extra no topo da lista, fora dos 645 municípios oficiais (ex.:
   * "Todas as cidades" no filtro de Buscar). Selecioná-la chama onChange("").
   */
  allOption?: string;
}

/**
 * Campo de cidade com sugestões dos 645 municípios de São Paulo
 * (src/lib/venues/sp-cities.ts) — um <select> comum com 645 opções fica
 * ruim no celular, então isso é um <input> de texto livre (mesmo
 * comportamento de sempre, não quebra cidades já salvas que não estejam
 * na lista) com uma lista de sugestões filtradas por cima. Escolher uma
 * sugestão preenche o nome oficial com acento; digitar livre também
 * funciona e dispara onChange a cada tecla, como um input comum.
 */
export function CityAutocomplete({
  id,
  value,
  onChange,
  placeholder,
  required = false,
  wrapperClassName = "",
  allOption,
}: CityAutocompleteProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = normalize(value);
  const options = allOption ? [allOption, ...SP_CITIES] : SP_CITIES;
  const suggestions = (
    normalizedQuery
      ? options.filter((city) => normalize(city).includes(normalizedQuery))
      : options
  ).slice(0, MAX_SUGGESTIONS);

  function commit(city: string) {
    // `allOption` (ex.: "Todas as cidades") representa "nenhum filtro" —
    // vira string vazia pro chamador, não o texto literal da opção.
    onChange(city === allOption ? "" : city);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0) {
        event.preventDefault();
        commit(suggestions[activeIndex]);
      } else {
        setOpen(false);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function optionId(index: number): string {
    return `${listboxId}-option-${index}`;
  }

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(-1);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        className={`${fieldClasses} ${focusRing}`}
      />

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-background-elevated py-1 shadow-lg shadow-black/20"
        >
          {suggestions.map((city, index) => (
            <li
              key={city}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => {
                // preventDefault mantém o foco no input, então o blur não
                // dispara antes de comitarmos a escolha -- funciona igual
                // no toque (o navegador emula mousedown a partir do tap).
                event.preventDefault();
                commit(city);
              }}
              className={`cursor-pointer px-4 py-2 text-base ${
                index === activeIndex ? "bg-accent/15 text-accent" : "text-foreground"
              } hover:bg-accent/10`}
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
