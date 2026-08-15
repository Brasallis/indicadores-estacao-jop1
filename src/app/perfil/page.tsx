import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { PrismaClient } from "@prisma/client";
import ProfileClient from "./ProfileClient";
import { redirect } from "next/navigation";

const JWT_SECRET = process.env.JWT_SECRET || 'chave_super_secreta_linha_uni_123';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);
const prisma = new PrismaClient();

export default async function PerfilPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    redirect("/login");
  }

  let userPayload;
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    userPayload = payload;
  } catch (e) {
    redirect("/login");
  }

  const userDb = await prisma.user.findUnique({
    where: { id: String(userPayload.sub) }
  });

  if (!userDb) {
    redirect("/login");
  }

  // Busca todas as estações disponíveis no DB
  const stations = await prisma.station.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem' }}>
      <ProfileClient 
        user={{
          username: userDb.username,
          role: userDb.role,
          stationId: userDb.stationId || ''
        }} 
        stations={stations} 
      />
    </div>
  );
}
