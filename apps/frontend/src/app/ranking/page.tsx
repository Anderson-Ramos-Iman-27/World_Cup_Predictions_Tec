'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { RankingPodium } from '@/components/ranking-podium';
import { useAuth } from '@/features/auth/auth-context';
import type { RankingEntry } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

export default function RankingPage() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiRequest<RankingEntry[]>('/rankings/global')
      .then(setRanking)
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar ranking'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AppShell
      title="Ranking global"
      subtitle="Compara el rendimiento acumulado de todos los participantes."
    >
        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
        {!isLoading && ranking.length > 0 ? (
          <div className="mb-6">
            <RankingPodium entries={ranking.slice(0, 3)} />
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
          <div className="grid grid-cols-[70px_1fr_90px_100px_130px] gap-3 border-b border-white/10 bg-[#082442] px-5 py-4 text-xs font-bold uppercase tracking-[0.14em] text-blue-200">
            <span>Pos.</span>
            <span>Participante</span>
            <span className="text-right">Pred.</span>
            <span className="text-right">Puntos</span>
            <span className="text-right">Detalle</span>
          </div>
          {isLoading ? (
            <p className="px-5 py-4 text-sm text-slate-500">Cargando...</p>
          ) : null}
          {!isLoading && ranking.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">Ranking sin datos.</p>
          ) : null}
          {ranking.map((entry) => (
            <div
              className={`grid grid-cols-[70px_1fr_90px_100px_130px] gap-3 px-5 py-4 text-sm ${
                entry.userId === user?.id ? 'bg-blue-50' : 'bg-white'
              }`}
              key={entry.userId}
            >
              <span className="font-black text-ink">
                #{entry.position}
              </span>
              <Link
                className="block rounded-lg px-2 py-1 transition hover:bg-blue-50"
                href={`/users/${entry.userId}/predictions`}
              >
                <strong className="block text-ink">{entry.name}</strong>
                <span className="text-xs text-slate-500">{entry.email}</span>
              </Link>
              <span className="text-right font-semibold text-slate-600">
                {entry.predictionsCount}
              </span>
              <span className="text-right font-black text-action">
                {entry.totalPoints}
              </span>
              <Link
                className="text-right text-sm font-black text-action hover:text-[#0b4cc4]"
                href={`/users/${entry.userId}/predictions`}
              >
                Ver predicciones
              </Link>
            </div>
          ))}
        </section>
    </AppShell>
  );
}
