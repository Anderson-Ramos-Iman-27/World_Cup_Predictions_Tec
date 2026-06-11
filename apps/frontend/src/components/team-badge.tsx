import Image from 'next/image';

type TeamBadgeProps = {
  name: string;
  crestUrl?: string | null;
  align?: 'left' | 'right';
};

export function TeamBadge({ name, crestUrl, align = 'left' }: TeamBadgeProps) {
  return (
    <div
      className={`flex items-center gap-3 ${
        align === 'right'
          ? 'flex-row-reverse text-right'
          : 'text-left'
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
        {crestUrl ? (
          <Image
            alt={`Bandera de ${name}`}
            className="h-full w-full object-contain p-1"
            height={40}
            src={crestUrl}
            width={40}
          />
        ) : (
          <span className="text-xs font-black text-slate-500">
            {name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <span className="min-w-0 text-sm font-black leading-snug text-ink sm:text-base">
        {name}
      </span>
    </div>
  );
}
