'use client';

import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField } from '@/components/auth/form-field';
import { SubmitButton } from '@/components/auth/submit-button';
import { useAuth } from '@/features/auth/auth-context';

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const { resendVerificationCode, verifyEmail } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const email = searchParams.get('email') ?? '';

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setResendSeconds((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [resendSeconds]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      await verifyEmail(String(formData.get('email')), String(formData.get('code')));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo verificar la cuenta');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    const currentEmail = (
      document.querySelector('input[name="email"]') as HTMLInputElement | null
    )?.value;

    if (!currentEmail) {
      setError('Ingresa tu correo para reenviar el código.');
      return;
    }

    setError('');
    setSuccess('');
    setIsResending(true);

    try {
      const message = await resendVerificationCode(currentEmail);
      setSuccess(message);
      setResendSeconds(60);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo reenviar el código');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell
      title="Verifica tu correo"
      subtitle="Ingresa el código enviado a tu correo para activar tu cuenta. (Revisa tu bandeja de entrada y spam)"
      footerText="Ya verificaste tu cuenta?"
      footerHref="/login"
      footerAction="Iniciar sesion"
      imageVariant="register"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? <AuthAlert type="error" message={error} /> : null}
        {success ? <AuthAlert type="success" message={success} /> : null}
        <FormField
          label="Correo electronico"
          name="email"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
          required
          defaultValue={email}
        />
        <FormField
          label="Código"
          name="code"
          placeholder="A7K9P2QX"
          autoComplete="one-time-code"
          minLength={8}
        />
        <div className="rounded-[14px] border border-slate-200 bg-white/70 p-3 text-sm text-slate-600">
          <div className="flex items-center justify-between gap-4">
            <span>No recibiste el código?</span>
            <button
              className="font-bold text-action hover:text-[#0b4cc4] disabled:cursor-not-allowed disabled:text-slate-400"
              type="button"
              disabled={isResending || resendSeconds > 0}
              onClick={handleResend}
            >
              {resendSeconds > 0
                ? `Reenviar en ${resendSeconds}s`
                : isResending
                  ? 'Enviando...'
                  : 'Reenviar código'}
            </button>
          </div>
        </div>
        <SubmitButton isLoading={isLoading}>Verificar cuenta</SubmitButton>
      </form>
    </AuthShell>
  );
}
