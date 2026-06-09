import Link from 'next/link';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText: string;
  footerHref: string;
  footerAction: string;
  imageVariant?: 'login' | 'register';
};

export function AuthShell({
  title,
  subtitle,
  children,
  footerText,
  footerHref,
  footerAction,
  imageVariant = 'login',
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#eef3f8] text-ink">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section
          aria-label="Imagen del Mundial"
          className={`auth-image-panel auth-image-panel-${imageVariant} hidden min-h-screen lg:block`}
        />

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[430px]">
            <Link
              className="mb-8 inline-flex items-center text-sm font-bold text-slate-500 transition hover:text-action"
              href="/dashboard"
            >
              ←  Volver al inicio
            </Link>
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-action">
                Mundial 2026
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
            </div>

            {children}

            <p className="mt-10 text-center text-sm text-slate-600">
              {footerText}{' '}
              <Link className="font-bold text-action hover:text-[#0b4cc4]" href={footerHref}>
                {footerAction}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
