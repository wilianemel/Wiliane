"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VENUE_CATEGORIES, OTHER_CATEGORY, combineCategoryValue } from "@/lib/venues/venue-categories";
import {
  buildCuisineTypesToSave,
  hasEmptyCustomCuisineDescription,
} from "@/lib/venues/venue-cuisine";
import { CityAutocomplete } from "@/components/shared/city-autocomplete";
import { CuisineFields } from "@/components/empresa/cuisine-fields";
import { UpgradeToBasicoNotice } from "@/components/empresa/upgrade-to-basico-cta";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;

type Status = "idle" | "loading" | "error";
type PlanChoice = "free" | "basico" | "master";

const PLAN_WHATSAPP_COPY: Record<Exclude<PlanChoice, "free">, { label: string; supportText: string }> = {
  basico: {
    label: "Contratar o plano Essencial por R$ 97/mês",
    supportText: "Fale com o Bora pra onde pelo WhatsApp para concluir o pagamento e ativar seu plano.",
  },
  master: {
    label: "Contratar o plano Master por R$ 187/mês",
    supportText: "Fale com o Bora pra onde pelo WhatsApp para concluir o pagamento e ativar seu plano.",
  },
};

interface CreateOwnedVenueResult {
  venue_id: string | null;
  slug: string | null;
  possible_duplicate_id: string | null;
  possible_duplicate_name: string | null;
  possible_duplicate_slug: string | null;
  is_exact_duplicate: boolean;
}

interface NovoEstabelecimentoFormProps {
  userEmail: string;
  /** Telefone/WhatsApp já coletado no cadastro da conta (user_metadata.phone) — nunca pedido de novo aqui. */
  userPhone: string | null;
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

export function NovoEstabelecimentoForm({ userEmail, userPhone, onCreated }: NovoEstabelecimentoFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  // Estabelecimento novo, sem culinária existente pra preservar — começa
  // vazio. Mesmo padrão de "Outro" das outras 2 telas (venue-cuisine.ts).
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([]);
  const [customCuisineDescription, setCustomCuisineDescription] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ id: string; name: string; isExact: boolean } | null>(null);
  const [continuingClaim, setContinuingClaim] = useState(false);
  // Free por padrão — o usuário pode trocar para Essencial ou Master antes
  // de finalizar. A escolha só é gravada (request_venue_plan) depois que o
  // estabelecimento é criado com sucesso; nunca ativa o plano pago sozinha
  // (sem gateway de pagamento configurado ainda) — só registra "aguardando
  // ativação" (pending_payment).
  const [selectedPlan, setSelectedPlan] = useState<PlanChoice>("free");

  const canSubmit =
    name.trim().length > 0 &&
    category.trim().length > 0 &&
    (category !== OTHER_CATEGORY || customCategory.trim().length > 0) &&
    city.trim().length > 0 &&
    neighborhood.trim().length > 0 &&
    address.trim().length > 0 &&
    description.trim().length > 0 &&
    !hasEmptyCustomCuisineDescription(customCuisineDescription) &&
    status !== "loading";

  async function createVenue(confirmDespiteDuplicate: boolean) {
    setStatus("loading");
    setErrorMessage(null);
    setDuplicate(null);

    const supabase = createClient();
    // Nunca envia user_id — a função usa auth.uid() internamente.
    // p_whatsapp reaproveita o telefone já coletado no cadastro da conta —
    // grava em whatsapp_number e também serve de evidência forte de
    // duplicata exata (nome+cidade+endereço, OU telefone+cidade).
    const { data, error } = await supabase.rpc("create_owned_venue", {
      p_name: name.trim(),
      p_category: combineCategoryValue(category, customCategory).trim(),
      p_city: city.trim(),
      p_neighborhood: neighborhood.trim(),
      p_address: address.trim(),
      p_description: description.trim(),
      p_confirm_despite_duplicate: confirmDespiteDuplicate,
      p_whatsapp: userPhone,
    });

    if (error) {
      setErrorMessage(friendlyRpcError(error.message));
      setStatus("error");
      return;
    }

    const result = (Array.isArray(data) ? data[0] : data) as CreateOwnedVenueResult | undefined;

    if (result?.possible_duplicate_id) {
      setDuplicate({
        id: result.possible_duplicate_id,
        name: result.possible_duplicate_name ?? "",
        isExact: Boolean(result.is_exact_duplicate),
      });
      setStatus("idle");
      return;
    }

    if (!result?.venue_id) {
      setErrorMessage("Não foi possível cadastrar o estabelecimento agora. Tente novamente em instantes.");
      setStatus("error");
      return;
    }

    // Culinária: mesma lógica de "salvar só depois de criado com sucesso" do
    // plano, abaixo. create_owned_venue não tem parâmetro pra isso (RPC
    // não alterada — ver venue-cuisine.ts), então é um UPDATE direto do
    // cliente logo em seguida; RLS já libera isso pro dono recém-vinculado
    // (mesma policy que editar/page.tsx já usa em produção). Só chama se
    // houver algo a salvar, e nunca trava o resto do fluxo se falhar.
    const cuisineTypesToSave = buildCuisineTypesToSave(cuisineTypes, customCuisineDescription);
    if (cuisineTypesToSave.length > 0) {
      const { error: cuisineError } = await supabase
        .from("venues")
        .update({ cuisine_types: cuisineTypesToSave })
        .eq("id", result.venue_id);
      if (cuisineError) {
        console.error("SAVE VENUE CUISINE TYPES ERROR:", cuisineError);
      }
    }

    // Grava a escolha do plano SÓ depois do estabelecimento criado com
    // sucesso — nunca antes. Para "free" não há nada a fazer aqui: o plano
    // ativo free já é garantido por _ensure_venue_plan dentro de
    // create_owned_venue. Para um plano pago, só registra a intenção
    // (pending_payment, idempotente); nunca ativa o limite sozinha. Falha
    // aqui não deve travar o resto do cadastro, já concluído com sucesso.
    if (selectedPlan !== "free") {
      const { error: planError } = await supabase.rpc("request_venue_plan", {
        p_venue_id: result.venue_id,
        p_plan_type: selectedPlan,
      });
      if (planError) {
        console.error("REQUEST VENUE PLAN ERROR:", planError);
      }
    }

    onCreated(result.venue_id);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    await createVenue(false);
  }

  /**
   * "Este é meu estabelecimento": já autenticado (este formulário só
   * aparece depois do login/cadastro), então segue direto para o fluxo de
   * estabelecimento existente — mesma chamada de start_or_resume_venue_claim
   * usada em /empresa/reivindicar, sem passar pela busca de novo.
   */
  async function handleThisIsMine() {
    if (!duplicate || continuingClaim) return;
    setContinuingClaim(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("start_or_resume_venue_claim", {
      p_venue_id: duplicate.id,
    });

    if (error) {
      console.error("START OR RESUME VENUE CLAIM ERROR:", error);
      setErrorMessage("Não foi possível continuar agora. Tente novamente em instantes.");
      setContinuingClaim(false);
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as { claim_request_id: string } | undefined;
    if (!row?.claim_request_id) {
      setErrorMessage("Não foi possível continuar agora. Tente novamente em instantes.");
      setContinuingClaim(false);
      return;
    }

    router.push(`/empresa/reivindicar/preencher?solicitacao=${row.claim_request_id}`);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Cadastrar meu estabelecimento
      </h1>
      <p className="mt-2 text-sm text-muted">
        Conectado como <strong className="text-foreground">{userEmail}</strong>. Preencha os dados
        básicos do seu estabelecimento — ele nasce como rascunho, não publicado.
        {userPhone && (
          <>
            {" "}
            O telefone <strong className="text-foreground">{userPhone}</strong> já cadastrado na
            sua conta será usado como contato — você pode alterá-lo depois no painel.
          </>
        )}
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

        <fieldset>
          <legend className="text-sm font-medium text-foreground">Tipos de culinária</legend>
          <div className="mt-3">
            <CuisineFields
              cuisineTypes={cuisineTypes}
              onCuisineTypesChange={setCuisineTypes}
              customDescription={customCuisineDescription}
              onCustomDescriptionChange={setCustomCuisineDescription}
            />
          </div>
        </fieldset>

        {errorMessage && (
          <p className="rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        {duplicate && (
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
            <p className="text-sm text-foreground">
              {duplicate.isExact
                ? `Já existe um estabelecimento com esses mesmos dados${duplicate.name ? ` (${duplicate.name})` : ""}. Localize e assuma o cadastro existente — não é possível criar outro igual.`
                : `Encontramos um estabelecimento parecido já cadastrado${duplicate.name ? ` (${duplicate.name})` : ""}. Confira se ele é o seu antes de criar um novo.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleThisIsMine}
                disabled={continuingClaim}
                className={`inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
              >
                {continuingClaim ? "Continuando..." : "Este é meu estabelecimento"}
              </button>
              {/* CORREÇÃO (auditoria final): duplicata exata nunca pode ser confirmada manualmente — sem este botão, a única saída é assumir o existente. */}
              {!duplicate.isExact && (
                <button
                  type="button"
                  onClick={() => createVenue(true)}
                  disabled={status === "loading" || continuingClaim}
                  className={`inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                >
                  Cadastrar outro estabelecimento
                </button>
              )}
            </div>
          </div>
        )}

        {!duplicate && (
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Escolha como seu estabelecimento aparecerá
            </h2>
            <p className="mt-1 text-xs text-muted">
              Dá para trocar depois — o cadastro sempre começa no plano Free enquanto o
              pagamento de um plano pago não é confirmado.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <PlanCard
                title="Free"
                price="Grátis"
                selected={selectedPlan === "free"}
                onSelect={() => setSelectedPlan("free")}
                features={[
                  "1 vídeo",
                  "1 foto",
                  "300 visualizações nas recomendações",
                  "Depois disso, continua na Busca e no Explorar, mas não aparece mais nas recomendações",
                ]}
              />
              <PlanCard
                title="Plano Essencial"
                price="R$ 97,00/mês"
                selected={selectedPlan === "basico"}
                onSelect={() => setSelectedPlan("basico")}
                features={["3 vídeos", "3 fotos", "Recomendações sem limite de visualizações"]}
              />
              <PlanCard
                title="Plano Master"
                price="R$ 187,00/mês"
                selected={selectedPlan === "master"}
                onSelect={() => setSelectedPlan("master")}
                features={[
                  "5 vídeos",
                  "5 fotos",
                  "Dashboard completo",
                  "Diagnóstico do estabelecimento",
                  "Relatórios a cada 30 dias",
                ]}
              />
            </div>

            {selectedPlan !== "free" && (
              <UpgradeToBasicoNotice
                className="mt-3"
                label={PLAN_WHATSAPP_COPY[selectedPlan].label}
                supportText={PLAN_WHATSAPP_COPY[selectedPlan].supportText}
              />
            )}
          </div>
        )}

        {!duplicate && (
          <button
            type="submit"
            disabled={!canSubmit}
            className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
          >
            {status === "loading" ? "Cadastrando..." : "Cadastrar estabelecimento"}
          </button>
        )}
      </form>
    </div>
  );
}

interface PlanCardProps {
  title: string;
  price: string;
  selected: boolean;
  onSelect: () => void;
  features: string[];
}

function PlanCard({ title, price, selected, onSelect, features }: PlanCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-colors ${focusRing} ${
        selected ? "border-accent bg-accent/5" : "border-border hover:border-accent/60"
      }`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <span
          aria-hidden="true"
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            selected ? "border-accent bg-accent" : "border-border"
          }`}
        >
          {selected && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3 w-3 text-accent-foreground">
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4.5 4.5L19 7" />
            </svg>
          )}
        </span>
      </div>
      <p className="mt-0.5 text-xs font-semibold text-accent">{price}</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {features.map((feature) => (
          <li key={feature} className="text-xs text-muted">
            {feature}
          </li>
        ))}
      </ul>
    </button>
  );
}
