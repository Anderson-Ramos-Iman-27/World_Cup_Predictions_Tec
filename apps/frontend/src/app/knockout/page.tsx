'use client';

import Image from 'next/image';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import type { ExternalTeam, KnockoutMatch } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

const stages = [
  { key: 'LAST_32', label: 'Dieciseisavos' },
  { key: 'LAST_16', label: 'Octavos' },
  { key: 'QUARTER_FINALS', label: 'Cuartos' },
  { key: 'SEMI_FINALS', label: 'Semifinales' },
  { key: 'THIRD_PLACE', label: 'Tercer puesto' },
  { key: 'FINAL', label: 'Final' },
];

type ConnectorLine = {
  d: string;
};

export default function KnockoutPage() {
  const [matches, setMatches] = useState<KnockoutMatch[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [connectorLines, setConnectorLines] = useState<ConnectorLine[]>([]);
  const bracketRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, Array<HTMLDivElement | null>>>({});
  const topScrollerRef = useRef<HTMLDivElement | null>(null);
  const mainScrollerRef = useRef<HTMLDivElement | null>(null);
  const syncingScrollRef = useRef(false);

  useEffect(() => {
    apiRequest<KnockoutMatch[]>('/football-data/knockout')
      .then(setMatches)
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar la fase eliminatoria'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const matchesByStage = useMemo(() => {
    const grouped = new Map<string, KnockoutMatch[]>();

    for (const stage of stages) {
      grouped.set(stage.key, []);
    }

    for (const match of matches) {
      grouped.get(match.stage)?.push(match);
    }

    for (const stageMatches of grouped.values()) {
      stageMatches.sort(
        (first, second) =>
          new Date(first.utcDate).getTime() - new Date(second.utcDate).getTime(),
      );
    }

    return grouped;
  }, [matches]);

  useLayoutEffect(() => {
    if (!matches.length) {
      setConnectorLines([]);
      return;
    }

    const computeLines = () => {
      const container = bracketRef.current;
      if (!container) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const paths: ConnectorLine[] = [];

      for (let stageIndex = 0; stageIndex < stages.length - 1; stageIndex += 1) {
        const currentStage = stages[stageIndex];
        const nextStage = stages[stageIndex + 1];
        const currentCards = cardRefs.current[currentStage.key] ?? [];
        const nextCards = cardRefs.current[nextStage.key] ?? [];

        for (let cardIndex = 0; cardIndex < currentCards.length; cardIndex += 1) {
          const source = currentCards[cardIndex];
          const target = nextCards[Math.floor(cardIndex / 2)];

          if (!source || !target) {
            continue;
          }

          const sourceRect = source.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const startX = sourceRect.right - containerRect.left;
          const startY = sourceRect.top + sourceRect.height / 2 - containerRect.top;
          const endX = targetRect.left - containerRect.left;
          const endY = targetRect.top + targetRect.height / 2 - containerRect.top;
          const elbowX = startX + (endX - startX) / 2;

          paths.push({
            d: `M ${startX} ${startY} H ${elbowX} V ${endY} H ${endX}`,
          });
        }
      }

      setConnectorLines(paths);
    };

    const raf = window.requestAnimationFrame(computeLines);
    window.addEventListener('resize', computeLines);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', computeLines);
    };
  }, [matches]);

  useEffect(() => {
    const topScroller = topScrollerRef.current;
    const mainScroller = mainScrollerRef.current;

    if (!topScroller || !mainScroller) {
      return;
    }

    const syncFromTop = () => {
      if (syncingScrollRef.current) {
        syncingScrollRef.current = false;
        return;
      }

      syncingScrollRef.current = true;
      mainScroller.scrollLeft = topScroller.scrollLeft;
    };

    const syncFromMain = () => {
      if (syncingScrollRef.current) {
        syncingScrollRef.current = false;
        return;
      }

      syncingScrollRef.current = true;
      topScroller.scrollLeft = mainScroller.scrollLeft;
    };

    topScroller.addEventListener('scroll', syncFromTop);
    mainScroller.addEventListener('scroll', syncFromMain);

    return () => {
      topScroller.removeEventListener('scroll', syncFromTop);
      mainScroller.removeEventListener('scroll', syncFromMain);
    };
  }, [matches]);

  return (
    <AppShell
      title="Fase eliminatoria"
      subtitle="Sigue el camino hacia la final del Mundial con datos oficiales."
    >
      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? <p className="text-sm text-slate-500">Cargando eliminatorias...</p> : null}

      {!isLoading && matches.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
          La API aún no publica partidos de eliminatorias para esta competencia.
        </div>
      ) : null}

      {matches.length > 0 ? (
        <section className="relative left-1/2 w-screen -translate-x-1/2 border-y border-slate-200 bg-[#eef3f8] py-4 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
          <div
            ref={topScrollerRef}
            className="sticky top-0 z-20 mx-auto mb-3 w-full overflow-x-auto bg-[#eef3f8]/95 px-6 pb-2 backdrop-blur"
          >
            <div className="h-3 min-w-[2100px]" />
          </div>

          <div ref={mainScrollerRef} className="overflow-x-auto px-6 pb-3">
            <div ref={bracketRef} className="relative mx-auto min-h-[1180px] min-w-[2100px]">
              <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
                {connectorLines.map((line, index) => (
                  <path
                    d={line.d}
                    fill="none"
                    key={`${line.d}-${index}`}
                    stroke="#c7d2e0"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                ))}
              </svg>

              <div className="absolute right-14 top-8 z-10 hidden w-44 items-center justify-center rounded-3xl bg-white/82 p-5 shadow-[0_14px_34px_rgba(15,35,66,0.12)] backdrop-blur md:flex">
                <Image
                  alt="Copa del mundo"
                  className="h-40 w-auto object-contain"
                  height={240}
                  src="/world-cup-trophy.png"
                  width={180}
                />
              </div>

              <div className="grid min-h-[1180px] min-w-[2100px] grid-cols-6 gap-12">
                {stages.map((stage) => (
                  <div className="flex flex-col gap-5" key={stage.key}>
                    <header className="rounded-full bg-action px-4 py-2 text-center text-xs font-black uppercase tracking-[0.12em] text-white">
                      {stage.label}
                    </header>
                    <div className="flex flex-1 flex-col justify-around gap-5">
                      {(matchesByStage.get(stage.key) ?? []).map((match, index) => (
                        <div
                          key={match.id}
                          ref={(node) => {
                            if (!cardRefs.current[stage.key]) {
                              cardRefs.current[stage.key] = [];
                            }
                            cardRefs.current[stage.key][index] = node;
                          }}
                        >
                          <KnockoutCard match={match} compact={stage.key === 'FINAL'} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function KnockoutCard({ match, compact }: { match: KnockoutMatch; compact?: boolean }) {
  const homeScore = match.score?.fullTime?.home;
  const awayScore = match.score?.fullTime?.away;
  const hasScore =
    homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined;
  const homeTeam = getTeamDisplay(match.homeTeam);
  const awayTeam = getTeamDisplay(match.awayTeam);

  return (
    <article
      className={`relative rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,35,66,0.10)] ${
        compact ? 'max-w-[240px]' : ''
      }`}
    >
      <p className="mb-3 text-xs font-bold text-slate-500">
        {formatMatchDate(match.utcDate)} · {getExternalStatusLabel(match.status)}
      </p>
      <TeamLine crest={homeTeam.crest} name={homeTeam.name} score={hasScore ? homeScore : null} />
      <div className="my-2 border-t border-slate-100" />
      <TeamLine crest={awayTeam.crest} name={awayTeam.name} score={hasScore ? awayScore : null} />
    </article>
  );
}

function TeamLine({
  crest,
  name,
  score,
}: {
  crest?: string | null;
  name: string;
  score?: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
          {crest ? (
            <Image
              alt={`Bandera de ${name}`}
              className="h-full w-full object-contain p-0.5"
              height={28}
              src={crest}
              width={28}
            />
          ) : (
            <span className="text-[10px] font-black text-slate-500">
              {name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>
        <span className="truncate text-sm font-black text-ink">{name}</span>
      </div>
      <span className="text-lg font-black text-ink">{score ?? '-'}</span>
    </div>
  );
}

function getTeamDisplay(team?: ExternalTeam | null) {
  return {
    name: team?.shortName ?? team?.name ?? team?.tla ?? 'Por definir',
    crest: team?.crest ?? null,
  };
}

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getExternalStatusLabel(status: string) {
  const labels: Record<string, string> = {
    TIMED: 'Programado',
    SCHEDULED: 'Programado',
    IN_PLAY: 'En vivo',
    PAUSED: 'Pausado',
    FINISHED: 'Final',
    POSTPONED: 'Postergado',
    CANCELLED: 'Cancelado',
  };

  return labels[status] ?? status;
}
