'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, TrendingUp, Users, Settings, Trophy, FileText } from 'lucide-react';
import styles from './page.module.css';
import { STATIONS } from '@/lib/stations';

import { Suspense } from 'react';

function RelatorioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterType = searchParams.get('type') || 'monthly';
  const filterValue = searchParams.get('value') || '';

  const [globalData, setGlobalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <div className={styles.loading}>Gerando relatório corporativo...</div>;
  }

  if (!globalData) {
    return <div className={styles.loading}>Nenhum dado encontrado para gerar o relatório.</div>;
  }

  const getPeriodText = () => {
    if (filterType === 'daily') return `Dia: ${filterValue.split('-').reverse().join('/')}`;
    if (filterType === 'monthly') return `Mês Ref: ${filterValue.split('-').reverse().join('/')}`;
    if (filterType === 'semiannual') return `Semestre: ${filterValue.split('-')[1]}º Sem de ${filterValue.split('-')[0]}`;
    if (filterType === 'annual') return `Ano Ref: ${filterValue}`;
    return filterValue;
  };

  return (
    <div className={styles.container}>
      <div className={styles.noPrint}>
        <button className={styles.backButton} onClick={() => router.push('/')}>
          <ArrowLeft size={20} /> Voltar
        </button>
        <button className={styles.printButton} onClick={handlePrint}>
          <Printer size={20} /> Imprimir A4
        </button>
      </div>

      <div className={styles.documentPage}>
        {/* Header do Documento */}
        <div className={styles.docHeader}>
          <img src="/logo-linha-uni.png" alt="Linha 6 - Linha Uni" className={styles.logo} />
          <div className={styles.docTitle}>
            <h1>RELATÓRIO EXECUTIVO DE FLUXO</h1>
            <h2>Linha 6 - Laranja</h2>
          </div>
        </div>

        {/* Metadados */}
        <div className={styles.docMetadata}>
          <div><strong>DATA DO RELATÓRIO:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
          <div><strong>PERÍODO APURADO:</strong> {getPeriodText()}</div>
          <div><strong>Nº DO DOCUMENTO:</strong> RE-{Date.now().toString().slice(-6)}</div>
        </div>

        {/* KPIs Globais */}
        <div className={styles.kpiRow}>
          <div className={styles.kpiBox}>
            <div className={styles.kpiLabel}>Volume Total de Entradas</div>
            <div className={styles.kpiValue}>{globalData.totalEntries.toLocaleString('pt-BR')}</div>
          </div>
          <div className={styles.kpiBox}>
            <div className={styles.kpiLabel}>Volume Total de Saídas</div>
            <div className={styles.kpiValue}>{globalData.totalExits.toLocaleString('pt-BR')}</div>
          </div>
          <div className={styles.kpiBox}>
            <div className={styles.kpiLabel}>Volume Global (Fluxo)</div>
            <div className={styles.kpiValue}>{(globalData.totalEntries + globalData.totalExits).toLocaleString('pt-BR')}</div>
          </div>
          <div className={styles.kpiBox} style={{ borderRight: 'none' }}>
            <div className={styles.kpiLabel}>Bloqueio Inoperantes</div>
            <div className={styles.kpiValue} style={{ color: globalData.brokenTurnstiles > 0 ? '#d93025' : '#1e8e3e' }}>
              {globalData.brokenTurnstiles} / {globalData.totalTurnstiles}
            </div>
          </div>
        </div>

        {/* Ranking Table */}
        <h3 className={styles.sectionTitle}>Desdobramento por Estação (Volume Geral)</h3>
        <table className={styles.docTable}>
          <thead>
            <tr>
              <th>Posição</th>
              <th>Estação</th>
              <th>Entradas Líquidas</th>
              <th>Saídas Líquidas</th>
              <th>Tráfego Consolidado</th>
              <th>Falhas Registradas</th>
            </tr>
          </thead>
          <tbody>
            {globalData.ranking.map((station: any, index: number) => (
              <tr key={station.id}>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}º</td>
                <td style={{ fontWeight: 500 }}>{station.name}</td>
                <td style={{ textAlign: 'right' }}>{station.entries.toLocaleString('pt-BR')}</td>
                <td style={{ textAlign: 'right' }}>{station.exits.toLocaleString('pt-BR')}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>{station.totalVolume.toLocaleString('pt-BR')}</td>
                <td style={{ textAlign: 'center', color: station.broken > 0 ? '#d93025' : '#5f6368' }}>{station.broken}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Assinaturas */}
        <div className={styles.signatureSection}>
          <div className={styles.signatureLine}>
            <span>Gerência de Operações Linha 6</span>
          </div>
          <div className={styles.signatureLine}>
            <span>Diretoria Executiva Linha Uni</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RelatorioExecutivo() {
  return (
    <Suspense fallback={<div className={styles.loading}>Carregando relatório corporativo...</div>}>
      <RelatorioContent />
    </Suspense>
  );
}
