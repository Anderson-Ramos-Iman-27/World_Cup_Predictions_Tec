export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
  const isBrowser = typeof window !== 'undefined';

  if (
    isBrowser &&
    window.location.port === '3000' &&
    (!configuredUrl ||
      configuredUrl === 'http://localhost/api' ||
      configuredUrl === `${window.location.protocol}//${window.location.hostname}/api`)
  ) {
    return `${window.location.protocol}//${window.location.hostname}:3001/api`;
  }

  return configuredUrl ?? 'http://localhost:3001/api';
}
