'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { MatchCard } from '@/components/match-card';
import type { Match, MatchStatus } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

const statuses: Array<{ label: string; value: MatchStatus | 'ALL' }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Programados', value: 'SCHEDULED' },
  { label: 'En vivo', value: 'LIVE' },
  { label: 'Finalizados', value: 'FINISHED' },
];

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<MatchStatus | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [navigationMessage, setNavigationMessage] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');
    const query = status === 'ALL' ? '' : `?status=${status}`;

    apiRequest<Match[]>(`/matches${query}`)
      .then(setMatches)
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar partidos'),
      )
      .finally(() => setIsLoading(false));
  }, [status]);

  const dateOptions = useMemo(() => {
    const uniqueDates = [...new Set(matches.map((match) => getDateKey(match.utcDate)))];

    return uniqueDates
      .sort()
      .map((value) => ({
        value,
        label: formatDateOption(value),
      }));
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return matches.filter((match) => {
      if (dateFilter !== 'ALL' && getDateKey(match.utcDate) !== dateFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        match.homeTeam.name,
        match.homeTeam.shortName,
        match.awayTeam.name,
        match.awayTeam.shortName,
        match.status,
        formatDateOption(getDateKey(match.utcDate)),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [dateFilter, matches, search]);

  return (
    <AppShell
      title="Partidos"
      subtitle="Revisa los partidos disponibles. Para guardar una predicción debes iniciar sesión."
    >
      {navigationMessage ? <LoadingOverlay message={navigationMessage} /> : null}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-ink">Filtros</h2>
          <button
            className="text-sm font-black text-action hover:text-blue-700"
            type="button"
            onClick={() => {
              setStatus('ALL');
              setDateFilter('ALL');
              setSearch('');
            }}
          >
            Limpiar filtros
          </button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
          <label className="block">
            <span className="text-sm font-black text-ink">Estado</span>
            <select
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-ink shadow-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
              value={status}
              onChange={(event) => setStatus(event.target.value as MatchStatus | 'ALL')}
            >
              {statuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-black text-ink">Fecha</span>
            <select
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-ink shadow-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            >
              <option value="ALL">Todas las fechas</option>
              {dateOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-black text-ink">Buscar</span>
            <input
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-ink shadow-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
              placeholder="Equipo, abreviatura o estado"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
      </section>

      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {isLoading ? <p className="text-sm text-slate-500">Cargando...</p> : null}
        {!isLoading && filteredMatches.length === 0 ? (
          <p className="text-sm text-slate-500">No hay partidos para este filtro.</p>
        ) : null}
        {filteredMatches.map((match) => (
          <MatchCard
            href={`/matches/${match.id}`}
            key={match.id}
            match={match}
            onNavigate={() => setNavigationMessage('Abriendo detalle del partido...')}
          />
        ))}
      </div>
    </AppShell>
  );
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06182c]/70 px-5 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-white/10 bg-white p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-action" />
        <p className="mt-4 text-base font-black text-ink">{message}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Preparando la informacion.
        </p>
      </div>
    </div>
  );
}

function getDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateOption(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}
