'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import type { GroupStanding, GroupStandingEntry } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupStanding[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiRequest<GroupStanding[]>('/football-data/standings')
      .then(setGroups)
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar la tabla de grupos'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AppShell
      title="Grupos"
      subtitle="Consulta las tablas oficiales de la fase de grupos del Mundial."
    >
      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
        <p className="text-sm font-semibold leading-6 text-slate-700">
          Clasifican 32 equipos a la fase eliminatoria: los dos primeros de cada grupo y los 8 mejores terceros.
        </p>
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? <p className="text-sm text-slate-500">Cargando grupos...</p> : null}

      <div className="grid gap-7 2xl:grid-cols-2">
        {groups.map((group) => (
          <GroupCard group={group} key={group.group} />
        ))}
      </div>
    </AppShell>
  );
}

function GroupCard({ group }: { group: GroupStanding }) {
  const playedGames = Math.max(...group.table.map((entry) => entry.playedGames), 0);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
      <header className="flex items-center justify-between bg-[#082442] px-4 py-3 text-white">
        <h2 className="text-lg font-black">{group.group}</h2>
        <span className="text-xs font-bold text-blue-200">{playedGames} jugados</span>
      </header>
      <div className="grid grid-cols-[minmax(240px,1fr)_38px_38px_38px_38px_44px_44px_50px] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-black uppercase text-slate-500">
        <span>Equipo</span>
        <span className="text-center">PJ</span>
        <span className="text-center">G</span>
        <span className="text-center">E</span>
        <span className="text-center">P</span>
        <span className="text-center">GF</span>
        <span className="text-center">GC</span>
        <span className="text-right">Pts</span>
      </div>
      <div>
        {group.table.map((entry) => (
          <GroupRow entry={entry} key={entry.team.id} />
        ))}
      </div>
      <footer className="flex flex-col gap-1 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-action" /> 1° y 2°
        </span>
        <span>Avanzan directo · terceros compiten por 8 cupos</span>
      </footer>
    </article>
  );
}

function GroupRow({ entry }: { entry: GroupStandingEntry }) {
  return (
    <div className="grid grid-cols-[minmax(240px,1fr)_38px_38px_38px_38px_44px_44px_50px] items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
            entry.position <= 2 ? 'bg-action text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {entry.position}
        </span>
        <TeamMark crest={entry.team.crest} name={entry.team.name ?? 'Equipo'} />
        <span className="truncate font-black text-ink">
          {entry.team.shortName ?? entry.team.name ?? 'Por definir'}
        </span>
      </div>
      <Cell>{entry.playedGames}</Cell>
      <Cell tone="win">{entry.won}</Cell>
      <Cell>{entry.draw}</Cell>
      <Cell tone="loss">{entry.lost}</Cell>
      <Cell>{entry.goalsFor}</Cell>
      <Cell>{entry.goalsAgainst}</Cell>
      <span className="text-right font-black text-action">{entry.points}</span>
    </div>
  );
}

function Cell({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: 'win' | 'loss';
}) {
  const color = tone === 'win' ? 'text-emerald-600' : tone === 'loss' ? 'text-red-500' : 'text-slate-600';
  return <span className={`text-center font-semibold ${color}`}>{children}</span>;
}

function TeamMark({ crest, name }: { crest?: string | null; name: string }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
      {crest ? (
        <Image alt={`Bandera de ${name}`} className="h-full w-full object-contain p-0.5" height={24} src={crest} width={24} />
      ) : (
        <span className="text-[10px] font-black text-slate-500">{name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}
