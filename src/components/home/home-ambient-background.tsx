const CITY_GLOW_LAYERS = [
  "animate-ambient-drift-a absolute -top-20 left-1/2 h-[32rem] w-[44rem] -translate-x-1/2 rounded-full bg-accent/15 blur-[150px]",
  "animate-ambient-drift-b absolute top-[38%] -left-24 h-96 w-96 rounded-full bg-accent/10 blur-[130px]",
  "animate-ambient-drift-a absolute top-[70%] -right-16 h-[28rem] w-[28rem] rounded-full bg-amber-500/10 blur-[140px]",
];

/** Pontos de interesse: cada um sugere uma experiência possível (restaurante, música, encontro, evento) espalhada pela cidade — nunca um grid uniforme. */
const POINTS_OF_INTEREST = [
  { top: "10%", left: "20%", size: "h-1.5 w-1.5", delay: "0s" },
  { top: "16%", left: "76%", size: "h-1 w-1", delay: "1.2s" },
  { top: "34%", left: "10%", size: "h-1 w-1", delay: "2.4s" },
  { top: "46%", left: "60%", size: "h-1.5 w-1.5", delay: "0.6s" },
  { top: "58%", left: "86%", size: "h-1 w-1", delay: "3.1s" },
  { top: "72%", left: "28%", size: "h-1 w-1", delay: "1.8s" },
];

/** Só 2 pontos "ao vivo" de propósito — um pulso tipo pino de mapa, sugerindo algo acontecendo agora, sem virar poluição visual. */
const LIVE_POINTS = [
  { top: "22%", left: "46%" },
  { top: "64%", left: "16%" },
];

/** Linhas finas conectando pontos próximos — sugestão de rede/mapa, não um grid técnico. */
const CONNECTIONS = [
  { top: "24%", left: "22%", width: "9rem", rotate: "18deg" },
  { top: "60%", left: "58%", width: "7rem", rotate: "-12deg" },
];

/**
 * Camada decorativa "cidade inteligente vista de cima, à noite" atrás de
 * toda a Home — só gradientes, blur e pontos em CSS (ver keyframes em
 * globals.css), sem imagens externas nem dependência nova.
 *
 * Composição, do mais ao menos profundo:
 * 1) vinheta radial (sensação de vista aérea);
 * 2) 3 camadas de luz grandes com deriva lenta (profundidade/movimento);
 * 3) 2 anéis discretos tipo radar (ecoam a própria seção "Radar" da Home);
 * 4) linhas finas conectando pontos próximos (sensação de mapa/rede);
 * 5) pontos de interesse que piscam (cada um = uma experiência possível);
 * 6) 2 pontos "ao vivo" com pulso tipo pino de mapa.
 *
 * Tudo compositável (transform/opacity), sem custo de layout — mobile
 * first. Puramente visual: pointer-events-none, aria-hidden, respeita
 * prefers-reduced-motion (ver globals.css).
 */
export function HomeAmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 60% at 50% 0%, rgba(255,194,30,0.07), transparent 60%), radial-gradient(100% 45% at 50% 100%, rgba(0,0,0,0.45), transparent 70%)",
        }}
      />

      {CITY_GLOW_LAYERS.map((className, index) => (
        <div key={index} className={className} />
      ))}

      <div className="animate-glow-pulse absolute right-[8%] top-[12%] h-40 w-40 rounded-full border border-accent/10" />
      <div className="animate-glow-pulse absolute right-[8%] top-[12%] h-64 w-64 -translate-x-6 -translate-y-6 rounded-full border border-accent/[0.06] [animation-delay:1.2s]" />

      {CONNECTIONS.map((line, index) => (
        <span
          key={index}
          className="absolute h-px opacity-[0.08]"
          style={{
            top: line.top,
            left: line.left,
            width: line.width,
            transform: `rotate(${line.rotate})`,
            background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
          }}
        />
      ))}

      {POINTS_OF_INTEREST.map((point, index) => (
        <span
          key={index}
          className={`animate-twinkle absolute rounded-full bg-accent/60 blur-[0.5px] ${point.size}`}
          style={{ top: point.top, left: point.left, animationDelay: point.delay }}
        />
      ))}

      {LIVE_POINTS.map((point, index) => (
        <span key={index} className="absolute" style={{ top: point.top, left: point.left }}>
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
          <span className="animate-ping-slow absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-accent/70" />
        </span>
      ))}
    </div>
  );
}
