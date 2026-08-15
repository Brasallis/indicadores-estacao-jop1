import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import { jwtVerify } from "jose";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'chave_super_secreta_linha_uni_123';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Linha 6 - Controle de Bloqueios",
  description: "Sistema de Controle de Fluxo e Bloqueios da Linha 6 Laranja",
  icons: {
    icon: "/logo-linha-uni.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  let role = '';
  let station = '';
  let isLoggedIn = false;
  let username = '';
  let stationId = '';
  let stations: any[] = [];

  if (token) {
    try {
      const { payload } = await jwtVerify(token, encodedSecret);
      role = String(payload.role || '');
      station = String(payload.stationCode || '');
      username = String(payload.username || '');
      stationId = String(payload.stationId || '');
      isLoggedIn = true;

      // Busca as estações no banco apenas se estiver logado (para uso no Dropdown de troca)
      stations = await prisma.station.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true }
      });
    } catch(e) {
      // Ignora erro de token inválido no layout
    }
  }

  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body style={{ margin: 0, padding: 0 }}>
        {isLoggedIn && <Header role={role} stationCode={station} username={username} stationId={stationId} stations={stations} />}
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
