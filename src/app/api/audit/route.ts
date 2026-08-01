import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = "nodejs";
export const maxDuration = 60; // Permite tempo maior para salvar base64 grandes

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { stationId, date, startTime, endTime, operatorName, readings } = data;

    // 1. Garantir que a Estação existe (ou criar se for a primeira vez)
    let station = await prisma.station.findUnique({
      where: { code: stationId }
    });

    if (!station) {
      let stationName = stationId.charAt(0).toUpperCase() + stationId.slice(1).replace('-', ' ');
      if (stationId === 'joao-paulo-1') stationName = 'João Paulo I';
      
      station = await prisma.station.create({
        data: {
          code: stationId,
          name: stationName
        }
      });
    }

    // 2. Criar a Auditoria e atrelar as leituras em uma Transaction
    const audit = await prisma.shiftAudit.create({
      data: {
        stationId: station.id,
        date: new Date(date),
        startTime,
        endTime,
        operatorName,
          readings: {
            create: readings.map((r: any) => ({
              turnstileId: r.turnstileId,
              entryStart: r.entryStart === '' ? null : parseInt(r.entryStart),
              entryStartImg: r.entryStartImg || null,
              entryEnd: r.entryEnd === '' ? null : parseInt(r.entryEnd),
              entryEndImg: r.entryEndImg || null,
              exitStart: r.exitStart === '' ? null : parseInt(r.exitStart),
              exitStartImg: r.exitStartImg || null,
              exitEnd: r.exitEnd === '' ? null : parseInt(r.exitEnd),
              exitEndImg: r.exitEndImg || null,
              isOutOfOrder: r.isOutOfOrder
            }))
          }
      }
    });

    return NextResponse.json({ success: true, auditId: audit.id }, { status: 201 });
  } catch (error) {
    console.error('Erro ao salvar auditoria no DB:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
