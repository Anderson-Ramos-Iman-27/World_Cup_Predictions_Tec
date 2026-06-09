import type { Metadata } from 'next';
import { AuthProvider } from '@/features/auth/auth-context';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Plataforma de Predicciones del Mundial',
  description: 'Plataforma educativa de predicciones del Mundial con salas, clasificaciones y puntajes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
