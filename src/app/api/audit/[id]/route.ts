import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const auditId = params.id;

    const audit = await prisma.shiftAudit.findUnique({
      where: { id: auditId },
      include: {
        readings: true,
        station: true
      }
    });

    if (!audit) {
      return NextResponse.json({ success: false, error: 'Audit not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: audit });
  } catch (error: any) {
    console.error('Erro ao buscar auditoria única no DB:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const auditId = params.id;
    await prisma.shiftAudit.delete({
      where: { id: auditId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar auditoria:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const auditId = params.id;
    const data = await request.json();
    const { date, startTime, endTime, operatorName, readings } = data;

    await prisma.$transaction(async (tx) => {
      await tx.turnstileReading.deleteMany({
        where: { auditId }
      });

      await tx.shiftAudit.update({
        where: { id: auditId },
        data: {
          date: new Date(date),
          startTime,
          endTime,
          operatorName,
          readings: {
            create: readings.map((r: any) => ({
              turnstileId: r.turnstileId,
              entryStart: r.entryStart === '' || r.entryStart === null ? null : parseInt(r.entryStart),
              entryStartImg: r.entryStartImg || null,
              entryEnd: r.entryEnd === '' || r.entryEnd === null ? null : parseInt(r.entryEnd),
              entryEndImg: r.entryEndImg || null,
              exitStart: r.exitStart === '' || r.exitStart === null ? null : parseInt(r.exitStart),
              exitStartImg: r.exitStartImg || null,
              exitEnd: r.exitEnd === '' || r.exitEnd === null ? null : parseInt(r.exitEnd),
              exitEndImg: r.exitEndImg || null,
              isOutOfOrder: r.isOutOfOrder
            }))
          }
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar auditoria:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
