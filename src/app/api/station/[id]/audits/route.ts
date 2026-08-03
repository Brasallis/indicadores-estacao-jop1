import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = "nodejs";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const stationCode = params.id;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'daily'; // daily ou monthly
    const dateFilter = searchParams.get('date'); // YYYY-MM-DD
    const shiftFilter = searchParams.get('shift'); // Manhã, Tarde, Noite, Todos
    const monthFilter = searchParams.get('month'); // YYYY-MM

    // Função auxiliar para buscar num período de datas
    const fetchAuditsForPeriod = async (start: Date, end: Date, shift?: string | null) => {
      let whereClause: any = {
        station: { code: stationCode },
        date: { gte: start, lte: end }
      };

      if (shift && shift !== 'Todos') {
        if (shift === 'Manhã') {
          whereClause.OR = [ { startTime: 'Manhã' }, { startTime: { gte: '06:00', lt: '14:00' } } ];
        } else if (shift === 'Tarde') {
          whereClause.OR = [ { startTime: 'Tarde' }, { startTime: { gte: '14:00', lt: '22:00' } } ];
        } else if (shift === 'Noite') {
          whereClause.OR = [ { startTime: 'Noite' }, { startTime: { gte: '22:00' } } ];
        }
      }

      return await prisma.shiftAudit.findMany({
        where: whereClause,
        include: { readings: true },
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    };

    if (mode === 'daily') {
      const startDate = dateFilter ? new Date(dateFilter) : new Date();
      startDate.setUTCHours(0,0,0,0);
      const endDate = dateFilter ? new Date(dateFilter) : new Date();
      endDate.setUTCHours(23,59,59,999);

      const audits = await fetchAuditsForPeriod(startDate, endDate, shiftFilter);
      return NextResponse.json({ success: true, data: audits, previousData: [] });
    } 
    
    else if (mode === 'monthly') {
      if (!monthFilter) return NextResponse.json({ success: false, error: 'month param required' }, { status: 400 });
      
      const [year, month] = monthFilter.split('-');
      
      // Mês Atual
      const currentStart = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0, 0));
      const currentEnd = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59, 999));
      
      // Mês Anterior
      const prevStart = new Date(Date.UTC(parseInt(year), parseInt(month) - 2, 1, 0, 0, 0, 0));
      const prevEnd = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 0, 23, 59, 59, 999));

      const [currentAudits, previousAudits] = await Promise.all([
        fetchAuditsForPeriod(currentStart, currentEnd, 'Todos'), // Mensal ignora turno normalmente
        fetchAuditsForPeriod(prevStart, prevEnd, 'Todos')
      ]);

      return NextResponse.json({ 
        success: true, 
        data: currentAudits, 
        previousData: previousAudits 
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid mode' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao buscar auditorias no DB:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
