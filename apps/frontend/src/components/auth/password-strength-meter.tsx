'use client';

import {
  getPasswordRules,
  getPasswordStrengthLabel,
} from '@/features/auth/password-strength';

type PasswordStrengthMeterProps = {
  password: string;
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const rules = getPasswordRules(password);
  const validRules = rules.filter((rule) => rule.isValid).length;
  const strengthLabel = getPasswordStrengthLabel(password);
  const barColor =
    strengthLabel === 'Segura'
      ? 'bg-emerald-500'
      : strengthLabel === 'Media'
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className="space-y-3 rounded-[14px] border border-slate-200 bg-white/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Seguridad
        </span>
        <span className="text-xs font-bold text-slate-700">{strengthLabel}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${(validRules / rules.length) * 100}%` }}
        />
      </div>
      <ul className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
        {rules.map((rule) => (
          <li
            className={rule.isValid ? 'font-semibold text-emerald-700' : 'text-slate-500'}
            key={rule.label}
          >
            {rule.isValid ? 'OK' : 'Falta'} {rule.label.toLowerCase()}
          </li>
        ))}
      </ul>
    </div>
  );
}
