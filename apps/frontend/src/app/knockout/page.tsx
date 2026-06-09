'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
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

export default function KnockoutPage() {
  const [matches, setMatches] = useState<KnockoutMatch[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
        <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-auto border-y border-slate-200 bg-[#eef3f8] px-6 py-7 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
          <div className="mx-auto grid min-h-[1040px] min-w-[1760px] grid-cols-6 gap-12">
            {stages.map((stage) => (
              <div className="flex flex-col gap-5" key={stage.key}>
                <header className="rounded-full bg-action px-4 py-2 text-center text-xs font-black uppercase tracking-[0.12em] text-white">
                  {stage.label}
                </header>
                <div className="flex flex-1 flex-col justify-around gap-5">
                  {(matchesByStage.get(stage.key) ?? []).map((match) => (
                    <KnockoutCard
                      key={match.id}
                      match={match}
                      showPreviousConnector={stage.key !== 'LAST_32'}
                      showConnector={stage.key !== 'FINAL'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function KnockoutCard({
  match,
  showPreviousConnector,
  showConnector,
}: {
  match: KnockoutMatch;
  showPreviousConnector: boolean;
  showConnector: boolean;
}) {
  const homeScore = match.score?.fullTime?.home;
  const awayScore = match.score?.fullTime?.away;
  const hasScore = homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined;
  const homeTeam = getTeamDisplay(match.homeTeam);
  const awayTeam = getTeamDisplay(match.awayTeam);

  return (
    <article
      className={`relative rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,35,66,0.10)] ${
        showConnector
          ? 'after:absolute after:left-full after:top-1/2 after:h-px after:w-12 after:bg-slate-300'
          : ''
      } ${
        showPreviousConnector
          ? 'before:absolute before:right-full before:top-1/2 before:h-px before:w-12 before:bg-slate-300'
          : ''
      }`}
    >
      <p className="mb-3 text-xs font-bold text-slate-500">
        {formatMatchDate(match.utcDate)} · {getExternalStatusLabel(match.status)}
      </p>
      <TeamLine
        crest={homeTeam.crest}
        name={homeTeam.name}
        score={hasScore ? homeScore : null}
      />
      <div className="my-2 border-t border-slate-100" />
      <TeamLine
        crest={awayTeam.crest}
        name={awayTeam.name}
        score={hasScore ? awayScore : null}
      />
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
            <Image alt={`Bandera de ${name}`} className="h-full w-full object-contain p-0.5" height={28} src={crest} width={28} />
          ) : (
            <span className="text-[10px] font-black text-slate-500">{name.slice(0, 2).toUpperCase()}</span>
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
