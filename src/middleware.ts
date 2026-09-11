import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function withCors(response: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function getToken(request: NextRequest) {
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) return cookieToken;

  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    return withCors(new NextResponse(null, { status: 204 }));
  }

  const token = getToken(request);

  const publicApiRoutes = [
    '/api/auth/',
    '/api/onboarding',
    '/api/public/',
    '/api/webhooks/',
    '/api/institutions',
    '/api/health',
  ];

  const isPublicApi = publicApiRoutes.some((route) => pathname.startsWith(route));

  if (pathname.startsWith('/api/') && !isPublicApi) {
    if (!token) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return withCors(NextResponse.json({ error: 'Invalid token' }, { status: 401 }));
    }

    if (pathname.startsWith('/api/admin') && payload.userRole !== 'ADMIN') {
      return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    }
    if (pathname.startsWith('/api/lecturer') && payload.userRole !== 'LECTURER') {
      return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    }
    if (pathname.startsWith('/api/student') && payload.userRole !== 'STUDENT') {
      return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', (payload.userRole as string) || '');
    if (payload.institutionId) {
      requestHeaders.set('x-institution-id', payload.institutionId as string);
    }

    return withCors(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    );
  }

  if (pathname.startsWith('/api/')) {
    return withCors(NextResponse.next());
  }

  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const roleStr = String(payload.userRole || '').toLowerCase();
    if (payload.userRole === 'STUDENT') {
      const login = new URL('/login', request.url);
      login.searchParams.set('app', '1');
      const response = NextResponse.redirect(login);
      response.cookies.delete('token');
      return response;
    }
    if (pathname.startsWith('/dashboard/admin') && payload.userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL(`/dashboard/${roleStr}`, request.url));
    }
    if (pathname.startsWith('/dashboard/lecturer') && payload.userRole !== 'LECTURER') {
      return NextResponse.redirect(new URL(`/dashboard/${roleStr}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
