import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATH_PREFIXES = [
  '/admin',
  '/predictions',
  '/profile',
  '/rooms',
  '/users',
] as const;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!isRscRequest(request)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('wcpp_session')?.value;

  if (!sessionCookie) {
    return unauthorizedResponse(false);
  }

  try {
    const response = await fetch(`${getApiBaseUrl(request)}/auth/me`, {
      method: 'GET',
      headers: {
        cookie: request.headers.get('cookie') ?? '',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return rejectUnauthorizedRequest(request, true);
    }

    const user = (await response.json()) as { role?: string };

    if (pathname.startsWith('/admin') && user.role !== 'ADMIN') {
      return rejectForbiddenRequest(request, user.role);
    }

    return NextResponse.next();
  } catch {
    return rejectUnauthorizedRequest(request, true);
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/predictions/:path*',
    '/profile/:path*',
    '/rooms/:path*',
    '/users/:path*',
  ],
};

function isProtectedPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function getApiBaseUrl(request: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredUrl?.startsWith('http://') || configuredUrl?.startsWith('https://')) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (configuredUrl?.startsWith('/')) {
    return `${request.nextUrl.origin}${configuredUrl}`.replace(/\/$/, '');
  }

  if (
    request.nextUrl.hostname === 'localhost' ||
    request.nextUrl.hostname === '127.0.0.1'
  ) {
    return 'http://127.0.0.1:3001/api';
  }

  return `${request.nextUrl.origin}/api`;
}

function redirectToLogin(request: NextRequest, clearCookies = false) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);

  const response = NextResponse.redirect(loginUrl);

  if (clearCookies) {
    response.cookies.set('wcpp_session', '', {
      path: '/',
      expires: new Date(0),
    });
    response.cookies.set('wcpp_csrf', '', {
      path: '/',
      expires: new Date(0),
    });
    response.cookies.set('wcpp_refresh', '', {
      path: '/api/auth/refresh',
      expires: new Date(0),
    });
  }

  return response;
}

function redirectByRole(request: NextRequest, role?: string) {
  const target = role === 'ADMIN' ? '/admin' : '/dashboard';
  return NextResponse.redirect(new URL(target, request.url));
}

function rejectUnauthorizedRequest(request: NextRequest, clearCookies = false) {
  if (isRscRequest(request)) {
    return unauthorizedResponse(clearCookies);
  }

  return redirectToLogin(request, clearCookies);
}

function rejectForbiddenRequest(request: NextRequest, role?: string) {
  if (isRscRequest(request)) {
    return new NextResponse(
      JSON.stringify({
        message: 'Forbidden',
        statusCode: 403,
      }),
      {
        status: 403,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        },
      },
    );
  }

  return redirectByRole(request, role);
}

function unauthorizedResponse(clearCookies: boolean) {
  const response = new NextResponse(
    JSON.stringify({
      message: 'Invalid or expired token',
      statusCode: 401,
    }),
    {
      status: 401,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );

  if (clearCookies) {
    response.cookies.set('wcpp_session', '', {
      path: '/',
      expires: new Date(0),
    });
    response.cookies.set('wcpp_csrf', '', {
      path: '/',
      expires: new Date(0),
    });
    response.cookies.set('wcpp_refresh', '', {
      path: '/api/auth/refresh',
      expires: new Date(0),
    });
  }

  return response;
}

function isRscRequest(request: NextRequest) {
  return (
    request.headers.has('rsc') ||
    request.headers.has('next-router-state-tree') ||
    request.nextUrl.searchParams.has('_rsc')
  );
}
