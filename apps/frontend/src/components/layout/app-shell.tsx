'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { LogoMark } from './logo-mark';

type AppShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  heroContent?: React.ReactNode;
};

export function AppShell({ title, subtitle, children, heroContent }: AppShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const links = [
    { href: '/dashboard', label: 'Inicio' },
    { href: '/matches', label: 'Partidos' },
    { href: '/groups', label: 'Grupos' },
    { href: '/knockout', label: 'Eliminatorias' },
    { href: '/rooms', label: 'Salas' },
    { href: '/predictions', label: 'Predicciones' },
    { href: '/ranking', label: 'Clasificación' },
    { href: '/profile', label: 'Perfil' },
  ];
  const publicLinks = [
    { href: '/dashboard', label: 'Inicio' },
    { href: '/matches', label: 'Partidos' },
    { href: '/groups', label: 'Grupos' },
    { href: '/knockout', label: 'Eliminatorias' },
    { href: '/ranking', label: 'Clasificación' },
  ];
  const heroImage = getHeroImage(pathname);

  return (
    <main className="min-h-screen bg-[#eef3f8] text-ink">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#082442] text-white shadow-[0_12px_30px_rgba(8,36,66,0.18)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:h-16 lg:px-6 lg:py-0">
          <Link className="flex items-center gap-3" href="/dashboard">
            <LogoMark />
            <span>
              <span className="block text-sm font-black leading-4">World Cup Predictions</span>
              <span className="block text-xs font-semibold leading-4 text-blue-300">2026</span>
            </span>
          </Link>
          <button
            aria-expanded={isMenuOpen}
            aria-label="Abrir menu de navegacion"
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/15 text-white transition hover:bg-white/10 lg:hidden"
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
          </button>
          <nav
            className={`absolute left-0 right-0 top-full border-b border-white/10 bg-[#082442] px-4 py-4 shadow-xl lg:static lg:flex lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
              isMenuOpen ? 'block' : 'hidden'
            }`}
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm lg:flex-row lg:items-center lg:justify-end lg:gap-3">
            {user ? (
              <>
                {links.map((link) => {
                  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

                  if (link.href === '/profile') {
                    return (
                      <Link
                        aria-current={active ? 'page' : undefined}
                        className={`relative inline-flex items-center gap-2 rounded-xl px-3 py-2 font-bold transition ${
                          active
                            ? 'bg-white text-[#082442] shadow-[0_10px_22px_rgba(255,255,255,0.16)] after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-action'
                            : 'text-blue-200 hover:bg-white/10 hover:text-white'
                        }`}
                        href={link.href}
                        key={link.href}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                            active ? 'bg-action text-white' : 'bg-white/15 text-white'
                          }`}
                        >
                          {user.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span>{link.label}</span>
                      </Link>
                    );
                  }

                  return (
                    <Link
                      aria-current={active ? 'page' : undefined}
                      className={`relative rounded-xl px-3 py-2 font-bold transition ${
                        active
                          ? 'bg-white text-[#082442] shadow-[0_10px_22px_rgba(255,255,255,0.16)] after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-action'
                          : 'text-blue-200 hover:bg-white/10 hover:text-white'
                      }`}
                      href={link.href}
                      key={link.href}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                {user.role === 'ADMIN' ? (
                  <Link
                    aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
                    className={`relative rounded-xl border px-3 py-2 font-bold transition ${
                      pathname.startsWith('/admin')
                        ? 'border-white bg-white text-[#082442] shadow-[0_10px_22px_rgba(255,255,255,0.16)] after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-rose-500'
                        : 'border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25'
                    }`}
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin
                  </Link>
                ) : null}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-blue-100 transition hover:bg-white/10 hover:text-white"
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              </>
            ) : (
              <>
                {publicLinks.map((link) => {
                  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

                  return (
                    <Link
                      aria-current={active ? 'page' : undefined}
                      className={`relative rounded-xl px-3 py-2 font-bold transition ${
                        active
                          ? 'bg-white text-[#082442] shadow-[0_10px_22px_rgba(255,255,255,0.16)] after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-action'
                          : 'text-blue-200 hover:bg-white/10 hover:text-white'
                      }`}
                      href={link.href}
                      key={link.href}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <Link
                  className="rounded-xl px-3 py-2 font-bold text-blue-100 transition hover:bg-white/10 hover:text-white"
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Iniciar sesión
                </Link>
                <Link
                  className="rounded-xl bg-action px-4 py-2 font-black text-white shadow-[0_10px_22px_rgba(20,87,217,0.28)] transition hover:bg-blue-700"
                  href="/register"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Crear cuenta
                </Link>
              </>
            )}
            </div>
          </nav>
        </div>
      </header>

      <section
        className={`relative overflow-hidden bg-[#0d3264] text-white ${
          heroContent ? '' : 'min-h-[360px] sm:min-h-[430px] lg:min-h-[500px]'
        }`}
        style={
          heroContent
            ? undefined
            : {
                backgroundImage: `url(${heroImage})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }
        }
      >
        {heroContent ? (
          <div className="w-full">
            {heroContent}
          </div>
        ) : (
          <>
          <div className="absolute inset-0 bg-gradient-to-r from-[#06182c]/96 via-[#06182c]/82 to-[#06182c]/48" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06182c]/45 via-black/24 to-[#06182c]/50" />
          <div className="absolute inset-0 bg-black/18" />
          <div className="relative z-10 mx-auto flex min-h-[360px] max-w-6xl items-end px-5 py-14 sm:min-h-[430px] lg:min-h-[500px]">
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-300">
                  {user?.role === 'ADMIN' ? 'Administrador' : 'Participante'}
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-normal text-white">
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-blue-50 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>
          </>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8">
        {children}
      </section>

      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06182c]/70 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <h2 className="text-xl font-black text-ink">Cerrar sesión</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tu sesión actual se cerrará en este dispositivo. Podrás volver a ingresar con tu correo y contraseña.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-ink transition hover:border-slate-300 hover:bg-slate-50"
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="h-11 rounded-xl bg-action px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(20,87,217,0.24)] transition hover:bg-blue-700"
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
              >
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function getHeroImage(pathname: string) {
  if (pathname.startsWith('/rooms')) {
    return '/mundial-2026.jpeg';
  }

  if (pathname.startsWith('/matches') || pathname.startsWith('/predictions')) {
    return '/mundial-2026.jpeg';
  }

  if (pathname.startsWith('/groups') || pathname.startsWith('/knockout')) {
    return '/mundial-2026.jpeg';
  }

  if (pathname.startsWith('/ranking') || pathname.startsWith('/profile')) {
    return '/mundial-2026.jpeg';
  }

  return '/mundial-2026.jpeg';
}
