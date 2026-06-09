'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CarouselSlide } from '@/features/user-panel/types';

const fallbackSlides: CarouselSlide[] = [
  {
    id: 'fallback-1',
    title: 'World Cup 2026',
    subtitle: 'Predice, compite por salas y sigue cada resultado.',
    imageUrl: '/opening_img.png',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'fallback-2',
    title: 'Salas privadas',
    subtitle: 'Crea grupos, invita participantes y compite por podios propios.',
    imageUrl: '/carrusel_salas.png',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'fallback-3',
    title: 'Ranking en tiempo real',
    subtitle: 'Revisa puntajes, aciertos y posiciones mientras avanza el torneo.',
    imageUrl: '/carrusel_ranking.png',
    sortOrder: 3,
    isActive: true,
  },
];

export function HomeCarousel({ slides }: { slides: CarouselSlide[] }) {
  const visibleSlides = useMemo(() => {
    const adminSlides = slides.filter((slide) => slide.isActive);
    const fallbackIds = new Set(adminSlides.map((slide) => slide.id));

    return [
      ...adminSlides,
      ...fallbackSlides.filter((slide) => !fallbackIds.has(slide.id)),
    ];
  }, [slides]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (activeIndex >= visibleSlides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, visibleSlides.length]);

  useEffect(() => {
    if (isPaused || visibleSlides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleSlides.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [isPaused, visibleSlides.length]);

  const activeSlide = visibleSlides[activeIndex] ?? visibleSlides[0];

  return (
    <div className="w-full bg-white">
      <section className="relative min-h-[360px] overflow-hidden bg-[#06182c] text-white sm:min-h-[430px] lg:min-h-[500px]">
        <img
          alt={activeSlide.title}
          className="absolute inset-0 h-full w-full object-cover"
          src={activeSlide.imageUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06182c]/95 via-[#06182c]/76 to-[#06182c]/36" />
        <div className="absolute inset-0 bg-black/18" />
        <div className="relative z-10 mx-auto flex min-h-[360px] max-w-7xl items-end px-5 py-14 sm:min-h-[430px] lg:min-h-[500px] lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">Mundial 2026</p>
            <h1 className="mt-4 text-4xl font-black tracking-normal text-white sm:text-5xl lg:text-6xl">
              {activeSlide.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-blue-100 sm:text-lg">
              {activeSlide.subtitle}
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-center gap-3 py-4">
        {visibleSlides.map((slide, index) => (
          <button
            aria-label={`Ver slide ${index + 1}`}
            className={`h-2 rounded-full transition ${
              activeIndex === index ? 'w-8 bg-action' : 'w-2 bg-slate-300 hover:bg-slate-400'
            }`}
            key={slide.id}
            type="button"
            onClick={() => setActiveIndex(index)}
          />
        ))}
        <button
          aria-label={isPaused ? 'Reanudar carrusel' : 'Pausar carrusel'}
          className="ml-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-ink"
          type="button"
          onClick={() => setIsPaused((current) => !current)}
        >
          {isPaused ? (
            <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-current" />
          ) : (
            <span className="flex gap-1">
              <span className="h-3.5 w-1 rounded-full bg-current" />
              <span className="h-3.5 w-1 rounded-full bg-current" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
