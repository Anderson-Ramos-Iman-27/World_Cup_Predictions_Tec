'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField } from '@/components/auth/form-field';
import { PasswordField } from '@/components/auth/password-field';
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter';
import { SubmitButton } from '@/components/auth/submit-button';
import { useAuth } from '@/features/auth/auth-context';
import { isStrongPassword } from '@/features/auth/password-strength';
import { getTurnstileSiteKey } from '@/lib/env';

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
          'error-callback': () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_ID = 'turnstile-script';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileSiteKey = getTurnstileSiteKey();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');

  useEffect(() => {
    if (!turnstileSiteKey || !captchaContainerRef.current) {
      return undefined;
    }

    const renderTurnstile = () => {
      if (
        !window.turnstile ||
        !captchaContainerRef.current ||
        turnstileWidgetIdRef.current
      ) {
        return;
      }

      turnstileWidgetIdRef.current = window.turnstile.render(
        captchaContainerRef.current,
        {
          sitekey: turnstileSiteKey,
          callback: setCaptchaToken,
          'expired-callback': () => setCaptchaToken(''),
          'error-callback': () => {
            setCaptchaToken('');
            setError('No se pudo validar el captcha. Intentalo otra vez.');
          },
        },
      );
    };

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);

    if (existingScript) {
      renderTurnstile();
    } else {
      const script = document.createElement('script');
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = renderTurnstile;
      document.body.appendChild(script);
    }

    return () => {
      if (turnstileWidgetIdRef.current) {
        window.turnstile?.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [turnstileSiteKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email'));
    const nextPassword = String(formData.get('password'));

    if (!isStrongPassword(nextPassword)) {
      setError(
        'La contrasena debe tener mayuscula, minuscula, numero y caracter especial.',
      );
      setIsLoading(false);
      return;
    }

    if (turnstileSiteKey && !captchaToken) {
      setError('Completa el captcha antes de crear tu cuenta.');
      setIsLoading(false);
      return;
    }

    try {
      await register({
        name: String(formData.get('name')),
        email,
        password: nextPassword,
        captchaToken: captchaToken || undefined,
      });
      setSuccess('Cuenta creada. Revisa tu correo e ingresa el codigo de verificacion.');
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo crear la cuenta');
      setCaptchaToken('');
      window.turnstile?.reset(turnstileWidgetIdRef.current ?? undefined);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Unete a salas, predice partidos y compite por el podio."
      footerText="Ya tienes una cuenta?"
      footerHref="/login"
      footerAction="Iniciar sesion"
      imageVariant="register"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? <AuthAlert type="error" message={error} /> : null}
        {success ? <AuthAlert type="success" message={success} /> : null}

        <FormField
          label="Nombre"
          name="name"
          placeholder="Tu nombre"
          autoComplete="name"
        />
        <FormField
          label="Correo electronico"
          name="email"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
        />
        <PasswordField
          label="Contrasena"
          name="password"
          placeholder="Ejemplo: Mundial2026!"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <PasswordStrengthMeter password={password} />

        {turnstileSiteKey ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div ref={captchaContainerRef} />
          </div>
        ) : null}

        <SubmitButton disabled={Boolean(turnstileSiteKey && !captchaToken)} isLoading={isLoading}>
          {turnstileSiteKey && !captchaToken ? 'Valida el captcha' : 'Crear cuenta'}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
