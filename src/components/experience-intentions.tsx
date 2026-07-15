import type { ReactElement, SVGProps } from "react";

function IconWrapper(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-5 w-5"
      aria-hidden="true"
      {...props}
    />
  );
}

function CoupleIcon() {
  return (
    <IconWrapper>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.5s-7-4.4-7-9.6A4.15 4.15 0 0 1 9.2 6.7c1.2 0 2.2.5 2.8 1.4.6-.9 1.6-1.4 2.8-1.4A4.15 4.15 0 0 1 19 10.9c0 5.2-7 9.6-7 9.6Z"
      />
    </IconWrapper>
  );
}

function FamilyIcon() {
  return (
    <IconWrapper>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 10v9h13v-9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19v-5h4v5" />
    </IconWrapper>
  );
}

function FriendsIcon() {
  return (
    <IconWrapper>
      <circle cx="8.5" cy="8" r="2.5" />
      <circle cx="16" cy="8" r="2.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 19c0-2.8 2.2-5 5-5s5 2.2 5 5M12.5 19c0-2.5 1.9-4.5 4.3-4.9"
      />
    </IconWrapper>
  );
}

function LiveMusicIcon() {
  return (
    <IconWrapper>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17V5l10-2v12"
      />
      <circle cx="6.5" cy="17" r="2.5" />
      <circle cx="16.5" cy="15" r="2.5" />
    </IconWrapper>
  );
}

function RelaxIcon() {
  return (
    <IconWrapper>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21c4-2 7-5.5 7-10a7 7 0 0 0-7-7c0 5-2 8-5 9 1 3 3 6 5 8Z"
      />
    </IconWrapper>
  );
}

function CelebrateIcon() {
  return (
    <IconWrapper>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20 15 9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 4l1 2M18 6l2 1M16 10l2 .5M8 3.5 8.5 5.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9a3 3 0 1 0 3-3" />
    </IconWrapper>
  );
}

function DiscoverIcon() {
  return (
    <IconWrapper>
      <circle cx="12" cy="12" r="8.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.5 9.5-1.7 4.8-4.8 1.7 1.7-4.8 4.8-1.7Z"
      />
    </IconWrapper>
  );
}

function SurpriseIcon() {
  return (
    <IconWrapper>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </IconWrapper>
  );
}

interface Intention {
  title: string;
  description: string;
  Icon: () => ReactElement;
}

const intentions: Intention[] = [
  {
    title: "Um momento a dois",
    description: "Ambientes intimistas para curtir a companhia de alguém especial.",
    Icon: CoupleIcon,
  },
  {
    title: "Família",
    description: "Espaços preparados para reunir todas as gerações com conforto.",
    Icon: FamilyIcon,
  },
  {
    title: "Amigos",
    description: "Lugares descontraídos para juntar a turma e colocar o papo em dia.",
    Icon: FriendsIcon,
  },
  {
    title: "Música ao vivo",
    description: "Shows, bandas autorais e programação musical acontecendo agora.",
    Icon: LiveMusicIcon,
  },
  {
    title: "Relaxar",
    description: "Ambientes tranquilos para desacelerar e recarregar as energias.",
    Icon: RelaxIcon,
  },
  {
    title: "Comemorar",
    description: "Experiências marcantes para celebrar datas e conquistas.",
    Icon: CelebrateIcon,
  },
  {
    title: "Conhecer algo novo",
    description: "Lugares diferentes do de sempre, para sair da rotina.",
    Icon: DiscoverIcon,
  },
  {
    title: "Surpreenda-me",
    description: "Deixe a decisão com a gente e descubra algo inesperado.",
    Icon: SurpriseIcon,
  },
];

export function ExperienceIntentions() {
  return (
    <section id="intencoes" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          O que você quer viver agora?
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          Escolha um momento e veja experiências pensadas para ele.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {intentions.map(({ title, description, Icon }) => (
            <a
              key={title}
              href="#experiencias"
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-background-elevated p-5 transition-colors hover:border-accent hover:shadow-[0_0_30px_-15px_rgba(255,194,30,0.5)]"
            >
              <span className="inline-flex w-fit items-center justify-center rounded-full bg-accent/10 p-2.5 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <Icon />
              </span>
              <span className="text-sm font-semibold text-foreground sm:text-base">
                {title}
              </span>
              <span className="text-xs text-muted sm:text-sm">{description}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
