import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const prisma = new PrismaClient();

// Use uma chave secreta no .env em produção. Usando fallback para dev
const JWT_SECRET = process.env.JWT_SECRET || 'chave_super_secreta_linha_uni_123';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Usuário e senha obrigatórios.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { station: true }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado.' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Senha incorreta.' }, { status: 401 });
    }

    // Gerar token JWT
    const token = await new SignJWT({
      sub: user.id,
      username: user.username,
      role: user.role,
      stationId: user.stationId,
      stationCode: user.station?.code || null
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h') // Expira em 12 horas
      .sign(encodedSecret);

    // Configurar o Cookie na resposta
    const response = NextResponse.json({ success: true, role: user.role, stationCode: user.station?.code });
    
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 60 * 60, // 12h
    });

    return response;

  } catch (error: any) {
    console.error('Erro no login:', error);
    return NextResponse.json({ success: false, error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
