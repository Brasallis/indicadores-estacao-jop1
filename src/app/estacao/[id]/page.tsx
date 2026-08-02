'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Download, TrendingUp, Users, AlertTriangle, Settings, Sparkles, FileText, Pencil, Trash2 } from 'lucide-react';
import { ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { getStationById } from '@/lib/stations';
import styles from './page.module.css';

// Mocks removidos. Dados vêm do banco via useEffect.

export default function StationDashboard() {
  const params = useParams();
  const router = useRouter();
  const [filterMode, setFilterMode] = useState<'daily' | 'monthly'>('daily');
  const [dateFilter, setDateFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('Todos');
  const [monthFilter, setMonthFilter] = useState('');
  
  const [differentialData, setDifferentialData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [dailyChartData, setDailyChartData] = useState<any[]>([]);
  const [previousStats, setPreviousStats] = useState({ entries: 0, exits: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const stationId = params.id as string;
  const station = getStationById(stationId);
  const stationName = station.name;
  const stationCode = station.code;

  React.useEffect(() => {
    if (!dateFilter) {
      const today = new Date();
      const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      const localMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
      setDateFilter(localDate);
      setMonthFilter(localMonth);
      return; // Pula este render e aguarda as datas estarem preenchidas
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const url = filterMode === 'daily' 
          ? `/api/station/${stationId}/audits?mode=daily&date=${dateFilter}&shift=${shiftFilter}`
          : `/api/station/${stationId}/audits?mode=monthly&month=${monthFilter}`;

        const res = await fetch(url);
        const result = await res.json();
        if (result.success) {
          const audits = result.data;
          const prevAudits = result.previousData || [];
          
          // Calcular stats do mês anterior para variação MoM
          let pEntries = 0;
          let pExits = 0;
          prevAudits.forEach((pa: any) => {
            pa.readings.forEach((r: any) => {
              if (!r.isOutOfOrder && r.entryEnd !== null && r.entryStart !== null) pEntries += (r.entryEnd - r.entryStart);
              if (!r.isOutOfOrder && r.exitEnd !== null && r.exitStart !== null) pExits += (r.exitEnd - r.exitStart);
            });
          });
          setPreviousStats({ entries: pEntries, exits: pExits });

          // Construir histórico
          const hData = audits.map((a: any) => {
            let tEntries = 0;
            let tExits = 0;
            let isClosed = false;
            a.readings.forEach((r: any) => {
              if (!r.isOutOfOrder && r.entryEnd !== null && r.entryStart !== null) {
                tEntries += (r.entryEnd - r.entryStart);
              }
              if (!r.isOutOfOrder && r.exitEnd !== null && r.exitStart !== null) {
                tExits += (r.exitEnd - r.exitStart);
              }
              if (r.entryEnd !== null || r.exitEnd !== null) {
                isClosed = true;
              }
            });
            return {
              id: a.id,
              date: a.date,
              shift: `${a.startTime} às ${a.endTime}`,
              operator: a.operatorName || 'Não identificado',
              totalEntries: tEntries,
              totalExits: tExits,
              isClosed: isClosed
            };
          });
          setHistoryData(hData);

          // Construir Diferencial consolidado (Mapa de Calor)
          const diffMap: Record<string, any> = {};
          
          // Inicializar 11 catracas vazias dinamicamente com o código da estação
          for(let i=1; i<=11; i++) {
             const tid = `${stationCode}_${String(i).padStart(2, '0')}${i === 1 ? ' PNE' : ''}`;
             diffMap[tid] = { name: tid, entry: 0, exit: 0, prevEntry: 0, prevExit: 0, outOfOrder: false };
          }

          audits.forEach((a: any) => {
             a.readings.forEach((r: any) => {
                if (diffMap[r.turnstileId]) {
                  if (r.isOutOfOrder) diffMap[r.turnstileId].outOfOrder = true;
                  
                  if (!r.isOutOfOrder && r.entryEnd !== null && r.entryStart !== null) {
                    diffMap[r.turnstileId].entry += (r.entryEnd - r.entryStart);
                  }
                  if (!r.isOutOfOrder && r.exitEnd !== null && r.exitStart !== null) {
                    diffMap[r.turnstileId].exit += (r.exitEnd - r.exitStart);
                  }
                }
             });
          });

          // Computar dados do mês anterior para sobreposição
          prevAudits.forEach((a: any) => {
             a.readings.forEach((r: any) => {
                if (diffMap[r.turnstileId] && !r.isOutOfOrder) {
                  if (r.entryEnd !== null && r.entryStart !== null) {
                    diffMap[r.turnstileId].prevEntry += (r.entryEnd - r.entryStart);
                  }
                  if (r.exitEnd !== null && r.exitStart !== null) {
                    diffMap[r.turnstileId].prevExit += (r.exitEnd - r.exitStart);
                  }
                }
             });
          });

          setDifferentialData(Object.values(diffMap));

          // Gráfico Diário Local (Dias da Semana)
          const weekDaysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          const chartMap: Record<string, { date: string, volume: number, raw: number }> = {};
          
          weekDaysMap.forEach((wd, idx) => {
            chartMap[wd] = { date: wd, volume: 0, raw: idx };
          });

          audits.forEach((a: any) => {
            const dateObj = new Date(a.date);
            const dayIndex = dateObj.getUTCDay();
            const label = weekDaysMap[dayIndex];
            
            a.readings.forEach((r: any) => {
              if (!r.isOutOfOrder) {
                const e = (r.entryEnd ?? 0) - (r.entryStart ?? 0);
                const x = (r.exitEnd ?? 0) - (r.exitStart ?? 0);
                if (chartMap[label]) chartMap[label].volume += (e + x);
              }
            });
          });

          const cData = Object.values(chartMap).sort((a, b) => a.raw - b.raw).map(d => ({
            date: d.date,
            volume: d.volume
          }));
          setDailyChartData(cData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [stationId, filterMode, dateFilter, shiftFilter, monthFilter]);

  const handleDelete = async (auditId: string) => {
    if (confirm('Tem certeza que deseja excluir permanentemente esta auditoria?')) {
      try {
        const res = await fetch(`/api/audit/${auditId}`, { method: 'DELETE' });
        if (res.ok) {
          // Atualiza a página simples para recarregar dados novos
          window.location.reload();
        } else {
          alert('Erro ao excluir auditoria.');
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const totalEntries = differentialData.reduce((sum, item) => sum + item.entry, 0);
  const totalExits = differentialData.reduce((sum, item) => sum + item.exit, 0);
  const brokenCount = differentialData.filter(i => i.outOfOrder).length;

  // Cálculos Avançados para o Smart Insights (Estilo Google)
  const totalFlux = totalEntries + totalExits;
  let maxTurnstile = '';
  let maxTurnstileFlux = 0;
  
  differentialData.forEach(d => {
    const flux = d.entry + d.exit;
    if (flux > maxTurnstileFlux) {
      maxTurnstileFlux = flux;
      maxTurnstile = d.name;
    }
  });

  const percentMax = totalFlux > 0 ? ((maxTurnstileFlux / totalFlux) * 100).toFixed(1) : '0';
  const percentInoperantes = ((brokenCount / 11) * 100).toFixed(0);
  const isEntryHeavy = totalEntries > totalExits;
  const directionality = totalFlux > 0 ? (isEntryHeavy ? (totalEntries / totalFlux * 100).toFixed(1) : (totalExits / totalFlux * 100).toFixed(1)) : '0';

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const pct = ((current - previous) / previous) * 100;
    return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };

  // Sugestão 1: Mapa de Calor / Previsibilidade de Pico (Apenas Mensal)
  let peakShift = 'N/A';
  let peakShiftPercent = '0';
  if (filterMode === 'monthly' && historyData.length > 0) {
    const shiftTotals: Record<string, number> = { 'Manhã': 0, 'Tarde': 0, 'Noite': 0 };
    historyData.forEach(audit => {
      // audit.shift é formato "HH:MM às HH:MM"
      const startHour = parseInt(audit.shift.substring(0, 2), 10);
      const flux = audit.totalEntries + audit.totalExits;
      
      if (!isNaN(startHour)) {
        if (startHour >= 6 && startHour < 14) shiftTotals['Manhã'] += flux;
        else if (startHour >= 14 && startHour < 22) shiftTotals['Tarde'] += flux;
        else shiftTotals['Noite'] += flux;
      }
    });

    let maxShiftValue = 0;
    Object.entries(shiftTotals).forEach(([shift, val]) => {
      if (val > maxShiftValue) {
        maxShiftValue = val;
        peakShift = shift;
      }
    });

    if (maxShiftValue > 0 && totalFlux > 0) {
      peakShiftPercent = ((maxShiftValue / totalFlux) * 100).toFixed(0);
    }
  }

  // Sugestão 3: Fraude e Uso Especial (PNE)
  let pneAlert = false;
  let pnePercentage = 0;
  const pneTurnstileData = differentialData.find(d => d.name.includes('PNE'));
  if (pneTurnstileData && totalEntries > 0) {
    pnePercentage = (pneTurnstileData.entry / totalEntries) * 100;
    if (pnePercentage > 15) { // Threshold de 15%
      pneAlert = true;
    }
  }

  // Sugestão 4: Impacto de Eventos Externos
  let externalEventAlert = false;
  const ATYPICAL_THRESHOLD = 3000;
  if (filterMode === 'daily' && totalFlux > ATYPICAL_THRESHOLD) {
    externalEventAlert = true;
  }

  const exportCSV = () => {
    const headers = ['Bloqueio', 'Entradas Líquidas', 'Saídas Líquidas', 'Status Operacional'];
    const rows = differentialData.map(d => [d.name, d.entry, d.exit, d.outOfOrder ? 'Inoperante' : 'Ativa']);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `indicadores_bloqueios_${stationId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <button onClick={() => router.push('/')} className={styles.backButton}>
            <ArrowLeft size={18} /> Voltar para Mapa da Linha
          </button>
          <h1 className={styles.title}>Estação {stationName}</h1>
        </div>
        
        <div className={styles.actions}>
          <button className="btn-primary" onClick={() => router.push(`/estacao/${stationId}/registrar`)}>
            <Plus size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
            Abrir Turno (Check-in)
          </button>
          <button className="btn-primary" style={{ backgroundColor: 'var(--gray-800)' }} onClick={exportCSV}>
            <Download size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
            Exportar CSV
          </button>
        </div>
      </header>

      {/* 1. BARRA DE FILTROS GLOBAL */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Tipo de Visão:</span>
          <select 
            className={styles.filterSelect}
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as 'daily' | 'monthly')}
            style={{ fontWeight: 'bold', color: 'var(--brand-orange)' }}
          >
            <option value="daily">Auditoria Diária</option>
            <option value="monthly">Consolidado Mensal (BI)</option>
          </select>
        </div>

        {filterMode === 'daily' ? (
          <>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Data Base:</span>
              <input 
                type="date" 
                className={styles.filterInput} 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Turno Analisado:</span>
              <select 
                className={styles.filterSelect}
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
              >
                <option value="Todos">Todos os Turnos (Consolidado do Dia)</option>
                <option value="Manhã">Manhã (06:00 - 14:00)</option>
                <option value="Tarde">Tarde (14:00 - 22:00)</option>
                <option value="Noite">Noite (22:00 - 06:00)</option>
              </select>
            </div>
          </>
        ) : (
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Mês de Referência:</span>
            <input 
              type="month" 
              className={styles.filterInput} 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* 2. TOP PANEL: KPIs + SMART INSIGHTS */}
      <div className={styles.topPanelGrid}>
        
        {/* Lado Esquerdo: KPIs (Estilo Material) */}
        <div className={styles.kpiContainer}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}><TrendingUp size={16} style={{display:'inline', marginRight:'4px'}}/> Entradas</span>
            <span className={styles.statValue}>{totalEntries}</span>
            <span className={styles.statSubtitle}>
              {filterMode === 'monthly' && previousStats.entries > 0 ? (
                <span style={{ color: totalEntries >= previousStats.entries ? '#1e8e3e' : '#d93025', fontWeight: 500 }}>
                  {calculateGrowth(totalEntries, previousStats.entries)} vs. mês ant.
                </span>
              ) : 'Volume consolidado'}
            </span>
          </div>
          
          <div className={styles.statCard}>
            <span className={styles.statLabel}><Users size={16} style={{display:'inline', marginRight:'4px'}}/> Saídas</span>
            <span className={styles.statValue}>{totalExits}</span>
            <span className={styles.statSubtitle}>
              {filterMode === 'monthly' && previousStats.exits > 0 ? (
                <span style={{ color: totalExits >= previousStats.exits ? '#1e8e3e' : '#d93025', fontWeight: 500 }}>
                  {calculateGrowth(totalExits, previousStats.exits)} vs. mês ant.
                </span>
              ) : 'Volume consolidado'}
            </span>
          </div>
          
          <div className={styles.statCard}>
            <span className={styles.statLabel}><Settings size={16} style={{display:'inline', marginRight:'4px'}}/> Saúde Operacional</span>
            <span className={styles.statValue}>{11 - brokenCount}/11</span>
            <span className={styles.statSubtitle} style={{ color: brokenCount > 0 ? '#d93025' : '#1e8e3e', fontWeight: 500 }}>
              {brokenCount > 0 ? `${brokenCount} com Defeito` : 'Estabilidade 100%'}
            </span>
          </div>
        </div>

        {/* Lado Direito: IA Insights */}
        <div className={styles.assistantSection}>
          <div className={styles.assistantHeader}>
            <div className={styles.assistantIcon}><Sparkles size={20} /></div>
            <h3>Insights rápidos</h3>
          </div>
          <div className={styles.assistantContent}>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#3c4043', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
              <li>
                <strong>Gargalo Identificado:</strong> O bloqueio <strong>{maxTurnstile}</strong> responde por {percentMax}% de todo o fluxo da estação.
              </li>
              <li>
                <strong>Direcionalidade:</strong> O fluxo é majoritariamente de {isEntryHeavy ? 'Entrada' : 'Saída'} ({directionality}% do total).
              </li>
              <li>
                <strong>Operabilidade:</strong> {brokenCount === 0 ? 'Nenhum equipamento reportou falha (0% de inoperância).' : `${percentInoperantes}% dos bloqueios estão isolados (com X), o que reduz a vazão no horário de pico.`}
              </li>
              {maxTurnstileFlux > 0 && (
                <li>
                  <strong>Manutenção Preditiva:</strong> O bloqueio <strong>{maxTurnstile}</strong> registrou <strong>{maxTurnstileFlux} giros</strong> no período (maior desgaste mecânico). Recomenda-se priorizá-lo na agenda de lubrificação/revisão preventiva.
                </li>
              )}
              {pneAlert && (
                <li style={{ color: '#d93025' }}>
                  <strong>Alerta de Evasão (PNE):</strong> O bloqueio prioritário registrou <strong>{pnePercentage.toFixed(1)}%</strong> de todas as entradas do período. Volume atípico que pode indicar evasão de renda (pulo/carona). Recomenda-se direcionar equipe de segurança.
                </li>
              )}
              {externalEventAlert && (
                <li style={{ color: '#b7791f' }}>
                  <strong>Alerta de Demanda Atípica:</strong> O fluxo registrado (<strong>{totalFlux} passageiros</strong>) está muito acima da normalidade. Isso indica impacto de um evento externo (shows, jogos, clima). Recomenda-se registrar este fator para planejar futuras escalas.
                </li>
              )}
              {filterMode === 'monthly' && peakShift !== 'N/A' && (
                <li>
                  <strong>Previsibilidade de Pico:</strong> Historicamente neste mês, o turno da <strong>{peakShift}</strong> concentra <strong>{peakShiftPercent}%</strong> de todo o fluxo da estação. Recomendada maior alocação de equipe neste horário.
                </li>
              )}
            </ul>
          </div>
        </div>

      </div>

      {/* NOVO GRÁFICO DIÁRIO PARA A ESTAÇÃO */}
      {filterMode === 'monthly' && dailyChartData.length > 0 && (
        <div className={styles.sectionCard} style={{ marginTop: '2rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', fontSize: '1.2rem', color: '#202124' }}>
            <TrendingUp size={20} color="#1a73e8" style={{ marginRight: '8px' }} />
            Dias Mais Movimentados na Estação (Mês Atual)
          </h2>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                <XAxis dataKey="date" tick={{ fill: '#5f6368', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
                <YAxis tick={{ fill: '#5f6368', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(26, 115, 232, 0.1)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="volume" name="Movimento Total" fill="#f9ab00" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. GRÁFICOS (HEATMAPS) */}
      <div className={styles.chartGrid} style={{ display: 'block' }}>
        <div className={styles.chartSection}>
          <h2 className={styles.chartTitle}>Carga Consolidada por Equipamento (Entradas vs Saídas)</h2>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <ComposedChart data={differentialData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntry" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f9ab00" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#f9ab00" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="colorExit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eaed" />
                <XAxis dataKey="name" fontSize={11} tickMargin={8} axisLine={false} tickLine={false} tick={{fill: '#5f6368'}} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#5f6368'}} />
                <Tooltip 
                  cursor={{fill: '#f8f9fa'}} 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #dadce0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', backgroundColor: '#ffffff' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', color: '#5f6368' }} />
                
                <Bar dataKey="entry" name="Entradas" fill="url(#colorEntry)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="exit" name="Saídas" fill="url(#colorExit)" radius={[4, 4, 0, 0]} maxBarSize={24} />

                {filterMode === 'monthly' && (
                  <>
                    <Line type="monotone" dataKey="prevEntry" name="Entradas (Mês Ant.)" stroke="#f29900" strokeWidth={2} strokeDasharray="5 5" dot={{r:3}} activeDot={{r:6}} />
                    <Line type="monotone" dataKey="prevExit" name="Saídas (Mês Ant.)" stroke="#174ea6" strokeWidth={2} strokeDasharray="5 5" dot={{r:3}} activeDot={{r:6}} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. TABELA DE AUDITORIA (DRILL-DOWN) */}
      <div className={styles.tableSection}>
        <h2 className={styles.tableSectionTitle}>Histórico Analítico (Drill-down)</h2>
        <div className={styles.tableContainer}>
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Turno Apurado</th>
                <th>Auditor Responsável</th>
                <th>Entradas</th>
                <th>Saídas</th>
                <th>Total (Fluxo)</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map(audit => (
                <tr key={audit.id}>
                  <td>{new Date(audit.date).toLocaleDateString('pt-BR')}</td>
                  <td>{audit.shift}</td>
                  <td>{audit.operator}</td>
                  <td style={{ color: '#f9ab00', fontWeight: 'bold' }}>{audit.totalEntries}</td>
                  <td style={{ color: '#1a73e8', fontWeight: 'bold' }}>{audit.totalExits}</td>
                  <td><strong>{audit.totalEntries + audit.totalExits}</strong></td>
                  <td className={styles.actionCell}>
                    {!audit.isClosed ? (
                      <button 
                        className={styles.actionBtn} 
                        style={{
                          backgroundColor: '#e6f4ea', 
                          color: '#137333', 
                          border: '1px solid #ceead6',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          width: 'auto'
                        }} 
                        onClick={() => router.push(`/estacao/${stationId}/auditoria/${audit.id}/editar`)} 
                        title="Clique para realizar a leitura de fechamento do turno"
                      >
                        <Pencil size={14} /> Fechar Turno
                      </button>
                    ) : (
                      <button 
                        className={styles.actionBtn} 
                        style={{backgroundColor: '#EFF6FF', color: '#3B82F6', border: '1px solid #BFDBFE'}} 
                        onClick={() => router.push(`/estacao/${stationId}/auditoria/${audit.id}/editar`)} 
                        title="Editar Fechamento"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    <button className={styles.actionBtn} onClick={() => router.push(`/estacao/${stationId}/auditoria/${audit.id}`)} title="Ver A4">
                      <FileText size={16} />
                    </button>
                    <button className={styles.actionBtn} style={{backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA'}} onClick={() => handleDelete(audit.id)} title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {historyData.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} style={{textAlign: 'center', padding: '2rem'}}>Nenhuma auditoria encontrada para este filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
