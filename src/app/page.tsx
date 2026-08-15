'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Train, TrendingUp, Users, Settings, Trophy, MessageSquare, AlertTriangle, Info, CheckCircle2, Lightbulb, Zap, Activity, FileText } from 'lucide-react';
import styles from './page.module.css';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { STATIONS } from '@/lib/stations';

export default function Home() {
  const router = useRouter();
  
  const [globalData, setGlobalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'none' | 'kpis' | 'ranking' | 'insights'>('none');
  
  const [filterType, setFilterType] = useState('monthly');
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    if (!filterValue) {
      const today = new Date();
      if (filterType === 'daily') {
        setFilterValue(today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'));
      } else if (filterType === 'monthly') {
        setFilterValue(today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0'));
      } else if (filterType === 'semiannual') {
        setFilterValue(today.getFullYear() + '-1'); // Default 1º Semestre
      } else if (filterType === 'annual') {
        setFilterValue(today.getFullYear().toString());
      }
    }
  }, [filterType, filterValue]);

  useEffect(() => {
    const fetchGlobalData = async () => {
      if (!filterValue) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/global?type=${filterType}&value=${filterValue}`);
        const result = await res.json();
        if (result.success) {
          setGlobalData(result.data);
        }
      } catch (err) {
        console.error('Erro ao carregar dados globais', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGlobalData();
  }, [filterType, filterValue]);

  const handleSelectStation = (stationId: string) => {
    router.push(`/estacao/${stationId}`);
  };

  const getRankClass = (index: number) => {
    if (index === 0) return styles.rank1;
    if (index === 1) return styles.rank2;
    if (index === 2) return styles.rank3;
    return styles.rankOther;
  };

  const getFeedIcon = (type: string) => {
    if (type === 'warning') return <AlertTriangle size={18} color="#f9ab00" />;
    if (type === 'success') return <CheckCircle2 size={18} color="#1e8e3e" />;
    return <Info size={18} color="#1a73e8" />;
  };

  return (
    <main className={styles.container}>
      <header className={styles.header} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <h1 className={styles.title}>Controle de Fluxo - Linha 6 Laranja</h1>
        <p className={styles.subtitle}>
          Visão Executiva Global
        </p>
      </header>

      <div className={styles.menuBar}>
        <button 
          className={`${styles.menuBtn} ${activeTab === 'kpis' ? styles.menuBtnActive : ''}`} 
          onClick={() => setActiveTab(activeTab === 'kpis' ? 'none' : 'kpis')}
        >
          <TrendingUp size={18} /> Métricas Globais
        </button>
        <button 
          className={`${styles.menuBtn} ${activeTab === 'ranking' ? styles.menuBtnActive : ''}`} 
          onClick={() => setActiveTab(activeTab === 'ranking' ? 'none' : 'ranking')}
        >
          <Trophy size={18} /> Ranking de Estações
        </button>
        <button 
          className={`${styles.menuBtn} ${activeTab === 'insights' ? styles.menuBtnActive : ''}`} 
          onClick={() => setActiveTab(activeTab === 'insights' ? 'none' : 'insights')}
        >
          <Lightbulb size={18} /> Insights da Linha
        </button>
        <button 
          className={styles.menuBtn} 
          style={{ backgroundColor: '#202124', color: '#fff', border: 'none' }}
          onClick={() => router.push(`/relatorio-executivo?type=${filterType}&value=${filterValue}`)}
        >
          <FileText size={18} /> Gerar Documento
        </button>
      </div>

      {/* Conteúdos Condicionais do Menu */}
      <div style={{ marginBottom: activeTab !== 'none' ? '3rem' : '0', width: '100%', maxWidth: '1200px' }}>
        
        {(activeTab === 'kpis' || activeTab === 'ranking') && (
          <div className={styles.filterSection}>
            <div className={styles.filterGroup}>
              <label>Período de Análise:</label>
              <select 
                className={styles.filterSelect}
                value={filterType} 
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setFilterValue(''); // Força o useEffect a setar o default do novo tipo
                }}
              >
                <option value="daily">Diário</option>
                <option value="monthly">Mensal</option>
                <option value="semiannual">Semestral</option>
                <option value="annual">Anual</option>
              </select>

              {filterType === 'daily' && (
                <input type="date" className={styles.filterInput} value={filterValue} onChange={(e) => setFilterValue(e.target.value)} />
              )}
              {filterType === 'monthly' && (
                <input type="month" className={styles.filterInput} value={filterValue} onChange={(e) => setFilterValue(e.target.value)} />
              )}
              {filterType === 'semiannual' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" className={styles.filterInput} style={{ width: '80px' }} value={filterValue.split('-')[0] || ''} onChange={(e) => setFilterValue(`${e.target.value}-${filterValue.split('-')[1] || '1'}`)} />
                  <select className={styles.filterSelect} value={filterValue.split('-')[1] || '1'} onChange={(e) => setFilterValue(`${filterValue.split('-')[0] || new Date().getFullYear()}-${e.target.value}`)}>
                    <option value="1">1º Semestre</option>
                    <option value="2">2º Semestre</option>
                  </select>
                </div>
              )}
              {filterType === 'annual' && (
                <input type="number" className={styles.filterInput} style={{ width: '100px' }} value={filterValue} onChange={(e) => setFilterValue(e.target.value)} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'kpis' && (
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>
                <TrendingUp size={16} style={{ marginRight: '6px' }} color="#1a73e8" />
                Fluxo Total (Entradas)
              </span>
              <span className={styles.kpiValue}>
                {isLoading ? '...' : globalData?.totalEntries || 0}
              </span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>
                <Users size={16} style={{ marginRight: '6px' }} color="#1a73e8" />
                Fluxo Total (Saídas)
              </span>
              <span className={styles.kpiValue}>
                {isLoading ? '...' : globalData?.totalExits || 0}
              </span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>
                <Settings size={16} style={{ marginRight: '6px' }} color={globalData?.brokenTurnstiles > 0 ? '#d93025' : '#1e8e3e'} />
                Saúde da Frota (Bloqueio)
              </span>
              <span className={styles.kpiValue} style={{ color: globalData?.brokenTurnstiles > 0 ? '#d93025' : '#202124' }}>
                {isLoading ? '...' : `${globalData?.brokenTurnstiles} Inoperantes`}
              </span>
            </div>
          </div>
        )}

        {activeTab === 'kpis' && globalData?.dailyMovements && globalData.dailyMovements.length > 0 && (
          <div className={styles.sectionCard} style={{ marginTop: '2rem' }}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem' }}>
              <TrendingUp size={20} color="#1a73e8" />
              Volume Diário de Passageiros (Linha 6)
            </h2>
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={globalData.dailyMovements} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                  <XAxis dataKey="date" tick={{ fill: '#5f6368', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
                  <YAxis tick={{ fill: '#5f6368', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(26, 115, 232, 0.1)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="volume" name="Movimento Total" fill="#1a73e8" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <Trophy size={20} color="#f9ab00" />
              Ranking de Movimentação por Estação
            </h2>
            {isLoading ? (
              <p style={{ color: '#5f6368' }}>Carregando dados da rede...</p>
            ) : (
              <table className={styles.rankingTable}>
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Estação</th>
                    <th>Total (Fluxo)</th>
                    <th>Entradas</th>
                    <th>Saídas</th>
                    <th>Defeitos (X)</th>
                  </tr>
                </thead>
                <tbody>
                  {globalData?.ranking?.map((station: any, index: number) => (
                    <tr key={station.id} className={styles.rankingRow}>
                      <td>
                        <span className={`${styles.rankBadge} ${getRankClass(index)}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{station.name}</td>
                      <td><strong>{station.totalVolume}</strong></td>
                      <td style={{ color: '#f9ab00' }}>{station.entries}</td>
                      <td style={{ color: '#1a73e8' }}>{station.exits}</td>
                      <td style={{ color: station.broken > 0 ? '#d93025' : '#1e8e3e' }}>
                        {station.broken}
                      </td>
                    </tr>
                  ))}
                  {globalData?.ranking?.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                        Nenhum dado registrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <Lightbulb size={20} color="#f9ab00" />
              Smart Insights: Rede Linha 6
            </h2>
            <div className={styles.feedList}>
              {isLoading ? (
                <p style={{ color: '#5f6368' }}>Processando inteligência de rede...</p>
              ) : (
                <>
                  {globalData?.ranking?.length > 0 ? (
                    <>
                      <div className={`${styles.feedItem} ${styles.feedInfo}`}>
                        <div className={styles.feedHeader}>
                          <h4 className={styles.feedTitle}>
                            <span style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}><Trophy size={18} color="#1a73e8" /></span>
                            Polo Gerador de Tráfego
                          </h4>
                        </div>
                        <p className={styles.feedText}>
                          A estação <strong>{globalData.ranking[0].name}</strong> é o principal polo da linha neste período, absorvendo sozinha <strong>{globalData.ranking[0].totalVolume}</strong> passageiros. Recomendamos direcionar o maior contingente de equipe de atendimento para esta unidade.
                        </p>
                      </div>

                      <div className={`${styles.feedItem} ${globalData.brokenTurnstiles > 0 ? styles.feedWarning : styles.feedSuccess}`}>
                        <div className={styles.feedHeader}>
                          <h4 className={styles.feedTitle}>
                            <span style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}>
                              {globalData.brokenTurnstiles > 0 ? <AlertTriangle size={18} color="#f9ab00" /> : <CheckCircle2 size={18} color="#1e8e3e" />}
                            </span>
                            Saúde da Frota Global
                          </h4>
                        </div>
                        <p className={styles.feedText}>
                          {globalData.brokenTurnstiles > 0 
                            ? `Atualmente, ${globalData.brokenTurnstiles} equipamentos encontram-se inoperantes em toda a rede. É vital acionar a equipe de manutenção de primeiro nível para não criar gargalos no fluxo nas estações afetadas.` 
                            : `Excelente marca! 100% dos bloqueios mapeados na rede estão ativos e funcionais. A equipe de manutenção preventiva está atingindo o SLA estabelecido.`}
                        </p>
                      </div>

                      <div className={`${styles.feedItem} ${styles.feedInfo}`}>
                        <div className={styles.feedHeader}>
                          <h4 className={styles.feedTitle}>
                            <span style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}><TrendingUp size={18} color="#1a73e8" /></span>
                            Direcionalidade da Linha
                          </h4>
                        </div>
                        <p className={styles.feedText}>
                          O balanço global de usuários registrou <strong>{globalData.totalEntries} entradas</strong> contra <strong>{globalData.totalExits} saídas</strong>. 
                          {globalData.totalEntries > globalData.totalExits 
                            ? ' A Linha 6 atuou predominantemente como linha coletora (alimentadora) neste período, recebendo mais passageiros nas estações locais do que distribuindo.' 
                            : ' A Linha 6 atuou predominantemente como linha dispersora de fluxo neste período, deixando passageiros nas extremidades da rede.'}
                        </p>
                      </div>

                      <div className={`${styles.feedItem} ${styles.feedWarning}`}>
                        <div className={styles.feedHeader}>
                          <h4 className={styles.feedTitle}>
                            <span style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}><Activity size={18} color="#f9ab00" /></span>
                            Concentração de Capacidade
                          </h4>
                        </div>
                        <p className={styles.feedText}>
                          {((globalData.ranking[0].totalVolume / (globalData.totalEntries + globalData.totalExits)) * 100).toFixed(1)}% de todo o fluxo da Linha 6 Laranja foi absorvido unicamente pela estação <strong>{globalData.ranking[0].name}</strong>. Esse desequilíbrio na rede indica um ponto de atenção para gestão de multidões e potencial risco de superlotação em horários de pico nesta localidade.
                        </p>
                      </div>

                      <div className={`${styles.feedItem} ${styles.feedInfo}`}>
                        <div className={styles.feedHeader}>
                          <h4 className={styles.feedTitle}>
                            <span style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}><Zap size={18} color="#1a73e8" /></span>
                            Ociosidade na Extremidade
                          </h4>
                        </div>
                        <p className={styles.feedText}>
                          A estação <strong>{globalData.ranking[globalData.ranking.length - 1].name}</strong> registrou o menor índice de aproveitamento da linha, movimentando apenas <strong>{globalData.ranking[globalData.ranking.length - 1].totalVolume}</strong> passageiros. Recomendamos aproveitar a ociosidade deste terminal para alocar campanhas de marketing físico institucionais ou promover treinamentos da equipe durante o horário de vale.
                        </p>
                      </div>
                    </>
                  ) : (
                    <p style={{ color: '#5f6368' }}>Nenhum dado registrado para gerar insights no período selecionado.</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stations Grid */}
      <h2 className={styles.stationsHeader}>Selecione a Estação para Gestão</h2>
      <div className={styles.grid}>
        {STATIONS.map((station) => (
          <div 
            key={station.id} 
            className={`glass ${styles.card}`}
            onClick={() => handleSelectStation(station.id)}
            style={{ 
              opacity: station.status === 'Futura' ? 0.75 : 1,
              borderLeft: station.status === 'Em operação' ? '4px solid #10B981' : 'none'
            }}
          >
            <Train 
              size={40} 
              className={styles.cardIcon} 
              strokeWidth={1.5} 
              color={station.status === 'Em operação' ? '#10B981' : 'var(--brand-orange)'} 
            />
            <h2 className={styles.cardTitle}>{station.name}</h2>
            <p 
              className={styles.subtitle} 
              style={{ 
                color: station.status === 'Em operação' ? '#10B981' : 'var(--gray-600)',
                fontWeight: station.status === 'Em operação' ? 600 : 400
              }}
            >
              {station.status}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
