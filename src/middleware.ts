import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Protect API routes except auth
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Role-based access for API routes
    if (pathname.startsWith('/api/admin') && payload.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (pathname.startsWith('/api/lecturer') && payload.userRole !== 'LECTURER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Add user data to headers for downstream access
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.userRole as string);
    if (payload.institutionId) {
      requestHeaders.set('x-institution-id', payload.institutionId as string);
    }
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Protect frontend pages
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Route according to role if trying to access wrong dashboard
    const roleStr = String(payload.userRole || '').toLowerCase();
    if (pathname.startsWith('/dashboard/admin') && payload.userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL(`/dashboard/${roleStr}`, request.url));
    }
    if (pathname.startsWith('/dashboard/lecturer') && payload.userRole !== 'LECTURER') {
      return NextResponse.redirect(new URL(`/dashboard/${roleStr}`, request.url));
    }
    if (pathname.startsWith('/dashboard/student') && payload.userRole !== 'STUDENT') {
      return NextResponse.redirect(new URL(`/dashboard/${roleStr}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
