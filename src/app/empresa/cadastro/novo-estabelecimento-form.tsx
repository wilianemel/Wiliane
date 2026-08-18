"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { VENUE_CATEGORIES, OTHER_CATEGORY, combineCategoryValue } from "@/lib/venues/venue-categories";
import { CityAutocomplete } from "@/components/shared/city-autocomplete";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;

type Status = "idle" | "loading" | "error";

interface CreateOwnedVenueResult {
  venue_id: string;
  slug: string;
}

interface NovoEstabelecimentoFormProps {
  userEmail: string;
  onCreated: (venueId: string) => void;
}

/** Traduz o texto já amigável levantado pela função (RAISE EXCEPTION em PT-BR) — nunca expõe código/erro técnico do Postgres. */
function friendlyRpcError(message: string): string {
  const knownMessages = [
    "É necessário estar autenticado para cadastrar um estabelecimento.",
    "O nome do estabelecimento é obrigatório.",
    "A categoria é obrigatória.",
    "A cidade é obrigatória.",
    "O bairro é obrigatório.",
    "O endereço é obrigatório.",
    "A descrição é obrigatória.",
  ];
  if (knownMessages.some((known) => message.includes(known))) {
    return message;
  }
  return "Não foi possível cadastrar o estabelecimento agora. Tente novamente em instantes.";
}

export function NovoEstabelecimentoForm({ userEmail, onCreated }: NovoEstabelecimentoFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit =
    name.trim().length > 0 &&
    category.trim().length > 0 &&
    (category !== OTHER_CATEGORY || customCategory.trim().length > 0) &&
    city.trim().length > 0 &&
    neighborhood.trim().length > 0 &&
    address.trim().length > 0 &&
    description.trim().length > 0 &&
    status !== "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setErrorMessage(null);

    const supabase = createClient();
    // Nunca envia user_id — a função usa auth.uid() internamente.
    const { data, error } = await supabase.rpc("create_owned_venue", {
      p_name: name.trim(),
      p_category: combineCategoryValue(category, customCategory).trim(),
      p_city: city.trim(),
      p_neighborhood: neighborhood.trim(),
      p_address: address.trim(),
      p_description: description.trim(),
    });

    if (error) {
      setErrorMessage(friendlyRpcError(error.message));
      setStatus("error");
      return;
    }

    const result = (Array.isArray(data) ? data[0] : data) as CreateOwnedVenueResult | undefined;
    if (!result?.venue_id) {
      setErrorMessage("Não foi possível cadastrar o estabelecimento agora. Tente novamente em instantes.");
      setStatus("error");
      return;
    }

    onCreated(result.venue_id);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Cadastrar meu estabelecimento
      </h1>
      <p className="mt-2 text-sm text-muted">
        Conectado como <strong className="text-foreground">{userEmail}</strong>. Preencha os dados
        básicos do seu estabelecimento — ele nasce como rascunho, não publicado.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="venue-name" className="text-sm font-medium text-foreground">
            Nome do estabelecimento
          </label>
          <input
            id="venue-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Garagem do Espeto"
            className={`mt-2 ${inputClasses}`}
            required
          />
        </div>

        <div>
          <label htmlFor="venue-category" className="text-sm font-medium text-foreground">
            Categoria
          </label>
          <select
            id="venue-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={`mt-2 ${inputClasses}`}
            required
          >
            <option value="" disabled>
              Selecione uma categoria
            </option>
            {VENUE_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {category === OTHER_CATEGORY && (
          <div>
            <label htmlFor="venue-custom-category" className="text-sm font-medium text-foreground">
              Qual categoria descreve melhor seu estabelecimento?
            </label>
            <input
              id="venue-custom-category"
              type="text"
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value)}
              placeholder="Ex.: Casa de shows, Vinícola, Empório..."
              className={`mt-2 ${inputClasses}`}
              required
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="venue-city" className="text-sm font-medium text-foreground">
              Cidade
            </label>
            <CityAutocomplete
              id="venue-city"
              value={city}
              onChange={setCity}
              wrapperClassName="mt-2"
              required
            />
          </div>
          <div>
            <label htmlFor="venue-neighborhood" className="text-sm font-medium text-foreground">
              Bairro
            </label>
            <input
              id="venue-neighborhood"
              type="text"
              value={neighborhood}
              onChange={(event) => setNeighborhood(event.target.value)}
              className={`mt-2 ${inputClasses}`}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="venue-address" className="text-sm font-medium text-foreground">
            Endereço
          </label>
          <input
            id="venue-address"
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Rua, número"
            className={`mt-2 ${inputClasses}`}
            required
          />
        </div>

        <div>
          <label htmlFor="venue-description" className="text-sm font-medium text-foreground">
            Descrição
          </label>
          <textarea
            id="venue-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Conte o que torna seu estabelecimento especial."
            rows={4}
            className={`mt-2 ${inputClasses} resize-none`}
            required
          />
        </div>

        {errorMessage && (
          <p className="rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
        >
          {status === "loading" ? "Cadastrando..." : "Cadastrar estabelecimento"}
        </button>
      </form>
    </div>
  );
}
