import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de usuários...');
  
  const count = await prisma.user.count();
  if (count > 0) {
    console.log('Os usuários já existem no banco de dados.');
    return;
  }

  const jop1 = await prisma.station.findFirst({
    where: { code: 'JOP-01' }
  });

  const jop1Id = jop1 ? jop1.id : null;

  // 1. Coordenador
  const coordPass = await bcrypt.hash('coord123', 10);
  await prisma.user.create({
    data: {
      username: 'coordenador',
      passwordHash: coordPass,
      role: 'COORDINATOR'
    }
  });

  // 2. Administrador da Estação
  const adminPass = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      username: 'admin_jop1',
      passwordHash: adminPass,
      role: 'STATION_ADMIN',
      stationId: jop1Id
    }
  });

  // 3. Operador da Estação
  const opPass = await bcrypt.hash('operador123', 10);
  await prisma.user.create({
    data: {
      username: 'operador_jop1',
      passwordHash: opPass,
      role: 'OPERATOR',
      stationId: jop1Id
    }
  });

  console.log('✅ 3 Usuários criados com sucesso!');
  console.log('-> coordenador / coord123 (Acesso Global)');
  console.log('-> admin_jop1 / admin123 (Acesso à JOP-01)');
  console.log('-> operador_jop1 / operador123 (Apenas Auditoria JOP-01)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
