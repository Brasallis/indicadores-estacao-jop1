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

export async function GET(request: Request) {
  const payload = await getAuthPayload();
  if (!payload || payload.role === 'OPERATOR') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const role = payload.role as string;
    const stationId = payload.stationId as string;

    let users: any[] = [];

    if (role === 'COORDINATOR') {
      // Coordenador vê todos os Admins e Operadores
      users = await prisma.user.findMany({
        where: { role: { in: ['STATION_ADMIN', 'OPERATOR'] } },
        include: { station: true },
        orderBy: { username: 'asc' }
      });
    } else if (role === 'STATION_ADMIN') {
      // Admin vê apenas Operadores da sua estação
      users = await prisma.user.findMany({
        where: { 
          role: 'OPERATOR',
          stationId: stationId
        },
        include: { station: true },
        orderBy: { username: 'asc' }
      });
    }

    // Remover hash de senha do retorno
    const safeUsers = users.map(u => {
      const { passwordHash, ...rest } = u;
      return rest;
    });

    return NextResponse.json(safeUsers);
  } catch (error: any) {
    console.error('Erro GET users:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const payload = await getAuthPayload();
  if (!payload || payload.role === 'OPERATOR') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const { username, password, role, stationId } = await request.json();

    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando.' }, { status: 400 });
    }

    // Regras de negócio
    if (payload.role === 'STATION_ADMIN') {
      if (role !== 'OPERATOR') {
        return NextResponse.json({ error: 'Admin só pode criar Operadores.' }, { status: 403 });
      }
      if (stationId !== payload.stationId) {
        return NextResponse.json({ error: 'Admin só pode criar usuários para sua própria estação.' }, { status: 403 });
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return NextResponse.json({ error: 'Nome de usuário já existe.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
        stationId: stationId || null
      }
    });

    return NextResponse.json({ success: true, user: { id: newUser.id, username: newUser.username } });
  } catch (error: any) {
    console.error('Erro POST users:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
