'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PrivateRoute } from '@/components/layout/private-route';
import { TeamBadge } from '@/components/team-badge';
import {
  calculateCurrentStreak,
  formatDateTime,
  getStatusLabel,
} from '@/features/user-panel/formatters';
import type { Prediction } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const currentStreak = calculateCurrentStreak(predictions);

  useEffect(() => {
    apiRequest<Prediction[]>('/predictions/my')
      .then(setPredictions)
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar predicciones'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <PrivateRoute>
      <AppShell
        title="Mis predicciones"
        subtitle="Consulta tus marcadores registrados y puntajes. Las predicciones guardadas no se pueden editar."
      >
        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-action">
              Racha actual
            </p>
            <p className="mt-2 text-3xl font-black text-ink">
              {currentStreak} aciertos consecutivos
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Cada 3 aciertos consecutivos de ganador o mejor suman 2 puntos extra.
            </p>
          </div>
          {isLoading ? <p className="text-sm text-slate-500">Cargando...</p> : null}
          {!isLoading && predictions.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Aun no tienes predicciones. Revisa los partidos disponibles para registrar una.
            </div>
          ) : null}
          {predictions.map((prediction) => (
            <article
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              key={prediction.id}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-600">
                      Predicción global
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                      {getStatusLabel(prediction.match.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <TeamBadge
                      name={prediction.match.homeTeam.name}
                      crestUrl={prediction.match.homeTeam.crestUrl}
                    />
                    <span className="text-xs font-black text-slate-400">VS</span>
                    <TeamBadge
                      align="right"
                      name={prediction.match.awayTeam.name}
                      crestUrl={prediction.match.awayTeam.crestUrl}
                    />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateTime(prediction.match.utcDate)}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-sm font-semibold text-slate-500">
                    {getPredictionTypeLabel(prediction)}
                  </p>
                  <p className="mt-1 text-2xl font-black text-ink">
                    {formatPredictionValue(prediction)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-action">
                    {prediction.score
                      ? `${prediction.score.totalPoints} pts`
                      : 'Pendiente de resultado'}
                  </p>
                </div>
              </div>

              {prediction.score?.reason ? (
                <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {prediction.score.reason}
                </p>
              ) : null}

              <div className="mt-4 flex justify-end">
                <Link
                  className="text-sm font-bold text-action hover:text-[#0b4cc4]"
                  href={`/matches/${prediction.match.id}`}
                >
                  Ver partido
                </Link>
              </div>
            </article>
          ))}
        </div>
      </AppShell>
    </PrivateRoute>
  );
}

function getPredictionTypeLabel(prediction: Prediction) {
  const labels: Record<Prediction['predictionType'], string> = {
    EXACT_SCORE: 'Resultado exacto',
    WINNER: 'Ganador o empate',
    GOAL_DIFFERENCE: 'Diferencia de goles',
  };

  return labels[prediction.predictionType];
}

function formatPredictionValue(prediction: Prediction) {
  if (prediction.predictionType === 'EXACT_SCORE') {
    return `${prediction.homeScore ?? '-'} - ${prediction.awayScore ?? '-'}`;
  }

  const outcome = getOutcomeLabel(prediction.predictedWinner, prediction);

  if (prediction.predictionType === 'WINNER') {
    return outcome;
  }

  return `${outcome} por ${prediction.goalDifference ?? '-'} gol${prediction.goalDifference === 1 ? '' : 'es'}`;
}

function getOutcomeLabel(outcome: Prediction['predictedWinner'], prediction: Prediction) {
  if (outcome === 'HOME') {
    return `Gana ${prediction.match.homeTeam.shortName ?? prediction.match.homeTeam.name}`;
  }

  if (outcome === 'AWAY') {
    return `Gana ${prediction.match.awayTeam.shortName ?? prediction.match.awayTeam.name}`;
  }

  return 'Empate';
}
