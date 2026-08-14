import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Verifica se já existem usuários
    const count = await prisma.user.count();
    if (count > 0) {
      return NextResponse.json({ message: 'Usuários já foram criados anteriormente.' });
    }

    // Busca a estação João Paulo I para vincular aos usuários de lá
    const jop1 = await prisma.station.findFirst({
      where: { code: 'JOP-01' }
    });

    const jop1Id = jop1 ? jop1.id : null;

    // 1. Coordenador (Acesso Total - Sem estação fixa)
    const coordPass = await bcrypt.hash('coord123', 10);
    await prisma.user.create({
      data: {
        username: 'coordenador',
        passwordHash: coordPass,
        role: 'COORDINATOR'
      }
    });

    // 2. Administrador da Estação (Acesso ao Dashboard local e Auditorias)
    const adminPass = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        username: 'admin_jop1',
        passwordHash: adminPass,
        role: 'STATION_ADMIN',
        stationId: jop1Id
      }
    });

    // 3. Operador da Estação (Acesso apenas à Auditoria)
    const opPass = await bcrypt.hash('operador123', 10);
    await prisma.user.create({
      data: {
        username: 'operador_jop1',
        passwordHash: opPass,
        role: 'OPERATOR',
        stationId: jop1Id
      }
    });

    return NextResponse.json({ success: true, message: 'Usuários criados com sucesso!' });

  } catch (error: any) {
    console.error('Erro no seed de usuários:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
