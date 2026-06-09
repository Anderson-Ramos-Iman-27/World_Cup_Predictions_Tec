import type { MatchStatus } from './types';
import type { Prediction } from './types';

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function getStatusLabel(status: MatchStatus) {
  const labels: Record<MatchStatus, string> = {
    SCHEDULED: 'Programado',
    LIVE: 'En vivo',
    FINISHED: 'Finalizado',
    POSTPONED: 'Postergado',
    CANCELLED: 'Cancelado',
  };

  return labels[status];
}

export function canPredict(status: MatchStatus, utcDate: string) {
  return status === 'SCHEDULED' && new Date(utcDate).getTime() > Date.now();
}

export function calculateCurrentStreak(predictions: Prediction[]) {
  const scoredPredictions = predictions
    .filter((prediction) => prediction.score)
    .sort(
      (first, second) =>
        new Date(second.match.utcDate).getTime() -
        new Date(first.match.utcDate).getTime(),
    );

  let streak = 0;

  for (const prediction of scoredPredictions) {
    if ((prediction.score?.basePoints ?? 0) <= 0) {
      break;
    }

    streak += 1;
  }

  return streak;
}
