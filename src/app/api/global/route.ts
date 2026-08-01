import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { STATIONS } from '@/lib/stations';

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'monthly';
    const value = searchParams.get('value');

    let dateFilter: any = {};
    if (value) {
      if (type === 'daily') {
        const start = new Date(value);
        start.setUTCHours(0,0,0,0);
        const end = new Date(value);
        end.setUTCHours(23,59,59,999);
        dateFilter = { gte: start, lte: end };
      } else if (type === 'monthly') {
        const [year, month] = value.split('-');
        const start = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59, 999));
        dateFilter = { gte: start, lte: end };
      } else if (type === 'semiannual') {
        const [year, half] = value.split('-');
        if (half === '1') {
          const start = new Date(Date.UTC(parseInt(year), 0, 1, 0, 0, 0, 0));
          const end = new Date(Date.UTC(parseInt(year), 5, 30, 23, 59, 59, 999));
          dateFilter = { gte: start, lte: end };
        } else {
          const start = new Date(Date.UTC(parseInt(year), 6, 1, 0, 0, 0, 0));
          const end = new Date(Date.UTC(parseInt(year), 11, 31, 23, 59, 59, 999));
          dateFilter = { gte: start, lte: end };
        }
      } else if (type === 'annual') {
        const start = new Date(Date.UTC(parseInt(value), 0, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(parseInt(value), 11, 31, 23, 59, 59, 999));
        dateFilter = { gte: start, lte: end };
      }
    }

    const audits = await prisma.shiftAudit.findMany({
      where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : undefined,
      include: {
        station: true,
        readings: true,
      }
    });

    let totalEntries = 0;
    let totalExits = 0;
    let brokenTurnstiles = 0;
    let totalTurnstiles = 0;
    
    const stationMetrics: Record<string, { code: string, entries: number, exits: number, broken: number }> = {};
    
    audits.forEach(audit => {
      const sCode = audit.station.code;
      if (!stationMetrics[sCode]) {
         stationMetrics[sCode] = { code: sCode, entries: 0, exits: 0, broken: 0 };
      }
      
      audit.readings.forEach(r => {
        totalTurnstiles++;
        if (r.isOutOfOrder) {
          brokenTurnstiles++;
          stationMetrics[sCode].broken++;
        } else {
          const e = (r.entryEnd ?? 0) - (r.entryStart ?? 0);
          const x = (r.exitEnd ?? 0) - (r.exitStart ?? 0);
          totalEntries += e;
          totalExits += x;
          stationMetrics[sCode].entries += e;
          stationMetrics[sCode].exits += x;
        }
      });
    });

    const ranking = Object.values(stationMetrics).map(metrics => {
      const stationRef = STATIONS.find(s => s.id === metrics.code);
      return {
        id: metrics.code,
        name: stationRef?.name || metrics.code,
        totalVolume: metrics.entries + metrics.exits,
        entries: metrics.entries,
        exits: metrics.exits,
        broken: metrics.broken
      }
    }).sort((a, b) => b.totalVolume - a.totalVolume);

    // Mocks de comunicados da diretoria
    const announcements = [
      { id: 1, type: 'info', title: 'Atualização de Sistema', text: 'O sistema será atualizado na próxima madruga. Favor concluir todas as auditorias até as 23:59.', date: new Date().toISOString() },
      { id: 2, type: 'warning', title: 'Manutenção Preventiva', text: 'Equipe de manutenção agendada para revisar bloqueios JOP_05 e ITA_02 nesta sexta-feira.', date: new Date(Date.now() - 86400000).toISOString() },
      { id: 3, type: 'success', title: 'Recorde de Fluxo', text: 'Linha Uni atinge recorde histórico de passageiros neste semestre. Parabéns a todas as equipes de estação!', date: new Date(Date.now() - 86400000 * 2).toISOString() },
    ];

    // Agrupamento de movimentos por dia da semana (Dom a Sáb)
    const weekDaysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dailyMap: Record<string, { date: string, volume: number, raw: number }> = {};
    
    weekDaysMap.forEach((wd, idx) => {
      dailyMap[wd] = { date: wd, volume: 0, raw: idx };
    });

    audits.forEach(audit => {
      const dateObj = new Date(audit.date);
      // getUTCDay() garante que pegamos o dia correto da data salva (0=Dom, 6=Sáb)
      const dayIndex = dateObj.getUTCDay(); 
      const label = weekDaysMap[dayIndex];
      
      audit.readings.forEach(r => {
        if (!r.isOutOfOrder) {
          const e = (r.entryEnd ?? 0) - (r.entryStart ?? 0);
          const x = (r.exitEnd ?? 0) - (r.exitStart ?? 0);
          if (dailyMap[label]) dailyMap[label].volume += (e + x);
        }
      });
    });

    const dailyMovements = Object.values(dailyMap).sort((a, b) => a.raw - b.raw).map(d => ({
      date: d.date,
      volume: d.volume
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalEntries,
        totalExits,
        totalTurnstiles,
        brokenTurnstiles,
        ranking,
        announcements,
        dailyMovements
      }
    });
  } catch (error) {
    console.error('Error fetching global metrics:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch global metrics' }, { status: 500 });
  }
}
