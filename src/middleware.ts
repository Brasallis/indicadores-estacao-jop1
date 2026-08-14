import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'chave_super_secreta_linha_uni_123';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Rotas públicas que não exigem token
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    const role = payload.role as string;
    const stationCode = payload.stationCode as string | null;

    // Regras de Controle de Acesso (RBAC)
    
    if (role === 'OPERATOR') {
      // Operador NÃO pode acessar o dashboard global, nem relatorio-executivo
      if (pathname === '/' || pathname.startsWith('/relatorio-executivo')) {
        return NextResponse.redirect(new URL(`/estacao/${stationCode?.toLowerCase() || 'jop-01'}`, request.url));
      }
      
      // Operador SÓ pode acessar a estação dele
      if (pathname.startsWith('/estacao/')) {
        const pathStation = pathname.split('/')[2]; // /estacao/[id]/...
        const userStationId = stationCode?.toLowerCase() || 'jop-01';
        if (pathStation && pathStation !== userStationId) {
          return NextResponse.redirect(new URL(`/estacao/${userStationId}`, request.url));
        }
      }
    }

    if (role === 'STATION_ADMIN') {
      // Station Admin NÃO pode acessar o dashboard global, nem relatorio-executivo
      if (pathname === '/' || pathname.startsWith('/relatorio-executivo')) {
        return NextResponse.redirect(new URL(`/estacao/${stationCode?.toLowerCase() || 'jop-01'}`, request.url));
      }

      // Station Admin SÓ pode acessar a estação dele
      if (pathname.startsWith('/estacao/')) {
        const pathStation = pathname.split('/')[2];
        const userStationId = stationCode?.toLowerCase() || 'jop-01';
        if (pathStation && pathStation !== userStationId) {
          return NextResponse.redirect(new URL(`/estacao/${userStationId}`, request.url));
        }
      }
    }

    // Coordenador (COORDINATOR) tem acesso a todas as rotas livremente
    
    // Injetar os headers para o layout saber o usuário logado (opcional, útil)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-role', role);
    requestHeaders.set('x-user-name', String(payload.username));
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    // Token inválido ou expirado
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|logo-linha-uni.png).*)',
  ],
};
