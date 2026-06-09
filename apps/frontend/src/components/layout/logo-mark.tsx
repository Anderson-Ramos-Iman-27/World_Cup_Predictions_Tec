'use client';

import { useState } from 'react';

export function LogoMark() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-action text-xs font-black text-white shadow-[0_10px_20px_rgba(20,87,217,0.35)]">
        WC
      </span>
    );
  }

  return (
    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_10px_20px_rgba(20,87,217,0.26)]">
      <img
        alt="Logo Mundial 2026"
        className="h-full w-full object-contain p-1"
        src="/world-cup-logo.png"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
