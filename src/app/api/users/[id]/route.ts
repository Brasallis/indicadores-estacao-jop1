import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'chave_super_secreta_linha_uni_123';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload;
  } catch (e) {
    return null;
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const payload = await getAuthPayload();
  if (!payload || payload.role === 'OPERATOR') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const { password, role, stationId } = await request.json();
    const targetUserId = params.id;

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    // Regras de negócio
    if (payload.role === 'STATION_ADMIN') {
      if (targetUser.role !== 'OPERATOR' || targetUser.stationId !== payload.stationId) {
        return NextResponse.json({ error: 'Sem permissão para editar este usuário.' }, { status: 403 });
      }
      if (role && role !== 'OPERATOR') {
        return NextResponse.json({ error: 'Admin não pode alterar o cargo.' }, { status: 403 });
      }
      if (stationId && stationId !== payload.stationId) {
        return NextResponse.json({ error: 'Admin não pode alterar a estação do usuário.' }, { status: 403 });
      }
    }

    const updateData: any = {};
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    if (role) updateData.role = role;
    if (stationId !== undefined) updateData.stationId = stationId;

    await prisma.user.update({
      where: { id: targetUserId },
      data: updateData
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const payload = await getAuthPayload();
  if (!payload || payload.role === 'OPERATOR') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const targetUserId = params.id;
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    // Regras de negócio
    if (payload.role === 'STATION_ADMIN') {
      if (targetUser.role !== 'OPERATOR' || targetUser.stationId !== payload.stationId) {
        return NextResponse.json({ error: 'Sem permissão para excluir este usuário.' }, { status: 403 });
      }
    }

    await prisma.user.delete({ where: { id: targetUserId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno. Verifique se o usuário já possui auditorias vinculadas (se aplicável).' }, { status: 500 });
  }
}
