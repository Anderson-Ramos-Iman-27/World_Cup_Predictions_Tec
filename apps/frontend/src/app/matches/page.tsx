'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { MatchCard } from '@/components/match-card';
import { useAuth } from '@/features/auth/auth-context';
import type { Match, MatchStatus } from '@/features/user-panel/types';
import type { Prediction } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

const statuses: Array<{ label: string; value: MatchStatus | 'ALL' }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Programados', value: 'SCHEDULED' },
  { label: 'En vivo', value: 'LIVE' },
  { label: 'Finalizados', value: 'FINISHED' },
];

export default function MatchesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [status, setStatus] = useState<MatchStatus | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
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

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setPredictions([]);
      return;
    }

    apiRequest<Prediction[]>('/predictions/my')
      .then(setPredictions)
      .catch(() => setPredictions([]));
  }, [isAuthLoading, user]);

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

    const orderedMatches = [...matches].sort((left, right) => {
      if (status !== 'ALL') {
        return new Date(left.utcDate).getTime() - new Date(right.utcDate).getTime();
      }

      const statusDifference =
        getStatusSortPriority(left.status) - getStatusSortPriority(right.status);

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return new Date(left.utcDate).getTime() - new Date(right.utcDate).getTime();
    });

    return orderedMatches.filter((match) => {
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
  }, [dateFilter, matches, search, status]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedMatches = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredMatches.slice(start, start + pageSize);
  }, [filteredMatches, safeCurrentPage]);

  const predictionProgressByMatch = useMemo(() => {
    const counts = new Map<string, number>();

    predictions.forEach((prediction) => {
      counts.set(prediction.match.id, (counts.get(prediction.match.id) ?? 0) + 1);
    });

    return counts;
  }, [predictions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, search, status]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
        {paginatedMatches.map((match) => (
          <MatchCard
            href={`/matches/${match.id}`}
            key={match.id}
            match={match}
            predictionProgress={
              user
                ? {
                    current: predictionProgressByMatch.get(match.id) ?? 0,
                    total: 3,
                  }
                : undefined
            }
            onNavigate={() => setNavigationMessage('Abriendo detalle del partido...')}
          />
        ))}
      </div>

      {!isLoading && filteredMatches.length > 0 ? (
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      ) : null}
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

function getStatusSortPriority(status: MatchStatus) {
  const priorities: Record<MatchStatus, number> = {
    LIVE: 0,
    SCHEDULED: 1,
    FINISHED: 2,
    POSTPONED: 3,
    CANCELLED: 4,
  };

  return priorities[status] ?? 99;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <PaginationButton
        ariaLabel="Página anterior"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ArrowLeftIcon />
      </PaginationButton>

      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          <span
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-black text-white/70"
            key={`ellipsis-${index}`}
          >
            ...
          </span>
        ) : (
          <PaginationButton
            active={page === currentPage}
            key={page}
            onClick={() => onPageChange(page)}
          >
            {page}
          </PaginationButton>
        ),
      )}

      <PaginationButton
        ariaLabel="Página siguiente"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ArrowRightIcon />
      </PaginationButton>
    </div>
  );
}

function PaginationButton({
  active = false,
  ariaLabel,
  children,
  disabled = false,
  onClick,
}: {
  active?: boolean;
  ariaLabel?: string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-4 text-sm font-black transition ${
        active
          ? 'bg-action text-white shadow-[0_14px_34px_rgba(15,35,66,0.22)]'
          : 'bg-[#0a1f3a] text-white hover:bg-action'
      } disabled:cursor-not-allowed disabled:opacity-40`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push('ellipsis');
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) {
    pages.push('ellipsis');
  }

  pages.push(totalPages);

  return pages;
}

function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
      <path
        d="M12.5 15 7.5 10l5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
      <path
        d="m7.5 5 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
