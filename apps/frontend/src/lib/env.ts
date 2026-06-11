export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
  const isBrowser = typeof window !== 'undefined';

  if (isBrowser) {
    if (
      window.location.port === '3000' &&
      (!configuredUrl ||
        configuredUrl === 'http://localhost/api' ||
        configuredUrl === `${window.location.protocol}//${window.location.hostname}/api`)
    ) {
      return `${window.location.protocol}//${window.location.hostname}:3001/api`;
    }

    if (
      !configuredUrl ||
      configuredUrl.includes('localhost') ||
      configuredUrl.includes('127.0.0.1')
    ) {
      return `${window.location.origin}/api`;
    }
  }

  return configuredUrl ?? 'http://localhost:3001/api';
}
