'use client';

import { useState } from 'react';

type PasswordFieldProps = {
  label: string;
  name: string;
  placeholder: string;
  autoComplete: string;
  value?: string;
  onChange?: (value: string) => void;
};

export function PasswordField({
  label,
  name,
  placeholder,
  autoComplete,
  value,
  onChange,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <div className="mt-2 flex h-12 items-center rounded-[14px] border border-slate-200 bg-white shadow-sm transition focus-within:border-action focus-within:ring-4 focus-within:ring-blue-100">
        <input
          className="h-full min-w-0 flex-1 rounded-[14px] bg-transparent px-4 text-sm text-ink outline-none"
          name={name}
          type={isVisible ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={8}
          value={value}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          required
          suppressHydrationWarning
        />
        <button
          className="mr-2 rounded-lg px-3 py-2 text-xs font-bold text-action hover:bg-blue-50"
          type="button"
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </label>
  );
}
