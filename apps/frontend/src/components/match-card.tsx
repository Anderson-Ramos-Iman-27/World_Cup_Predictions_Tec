import Link from 'next/link';
import { TeamBadge } from '@/components/team-badge';
import {
  canPredict,
  formatDateTime,
  getStatusLabel,
} from '@/features/user-panel/formatters';
import type { Match } from '@/features/user-panel/types';

type MatchCardProps = {
  match: Match;
  href?: string;
  onNavigate?: () => void;
};

export function MatchCard({ match, href, onNavigate }: MatchCardProps) {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const open = canPredict(match.status, match.utcDate);
  const card = (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,35,66,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,35,66,0.16)]">
      <div
        className={`flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-wide text-white ${
          isLive ? 'bg-rose-500' : isFinished ? 'bg-[#082442]' : 'bg-action'
        }`}
      >
        <span>{isLive ? '● Live' : getStatusLabel(match.status)}</span>
        <span>{open ? 'Predicciones abiertas' : isFinished ? 'Full time' : 'Fixture'}</span>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <TeamBadge name={match.homeTeam.name} crestUrl={match.homeTeam.crestUrl} />
          <div className="min-w-20 rounded-xl bg-slate-50 px-4 py-3 text-center">
            {isFinished || isLive ? (
              <p className="text-2xl font-black text-ink">
                {match.homeScore ?? '-'} - {match.awayScore ?? '-'}
              </p>
            ) : (
              <p className="text-xl font-black text-ink">VS</p>
            )}
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {new Date(match.utcDate).toLocaleDateString('es-PE')}
            </p>
          </div>
          <TeamBadge
            align="right"
            name={match.awayTeam.name}
            crestUrl={match.awayTeam.crestUrl}
          />
        </div>
        <div className="mt-5 border-t border-slate-100 pt-3 text-center text-xs font-semibold text-slate-500">
          {formatDateTime(match.utcDate)}
        </div>
      </div>
    </article>
  );

  if (!href) {
    return card;
  }

  return (
    <Link className="block" href={href} onClick={onNavigate}>
      {card}
    </Link>
  );
}
