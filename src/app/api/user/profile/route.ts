import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'chave_super_secreta_linha_uni_123';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 });
    }

    let userPayload;
    try {
      const { payload } = await jwtVerify(token, encodedSecret);
      userPayload = payload;
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Sessão inválida.' }, { status: 401 });
    }

    const { password, stationId } = await request.json();

    const updateData: any = {};
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    
    // Coordenador não vincula estação (stationId = null)
    if (userPayload.role !== 'COORDINATOR' && stationId !== undefined) {
      updateData.stationId = stationId || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: String(userPayload.sub) },
      data: updateData,
      include: { station: true }
    });

    // Se houve alteração de estação, gerar um novo token e injetar no Cookie
    const newToken = await new SignJWT({
      sub: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      stationId: updatedUser.stationId,
      stationCode: updatedUser.station?.code || null
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(encodedSecret);

    const response = NextResponse.json({ success: true });
    
    response.cookies.set({
      name: 'auth_token',
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 60 * 60, // 12h
    });

    return response;

  } catch (error: any) {
    console.error('Erro ao atualizar perfil:', error);
    return NextResponse.json({ success: false, error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
