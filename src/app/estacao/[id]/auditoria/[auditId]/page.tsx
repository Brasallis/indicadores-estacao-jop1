'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import styles from './page.module.css';

const getFlow = (start: number | null, end: number | null): number => {
  if (start === null || end === null) return 0;
  if (end >= start) return end - start;
  const diff = start - end;
  if (diff > 9000000) return end + 10000000 - start;
  if (diff > 900000) return end + 1000000 - start;
  if (diff > 90000) return end + 100000 - start;
  return diff; 
};

export default function FormalAuditDocument() {
  const params = useParams();
  const router = useRouter();
  
  const [auditData, setAuditData] = React.useState<any>(null);
  
  const stationId = params.id as string;
  const auditId = params.auditId as string;
  
  let stationName = stationId.charAt(0).toUpperCase() + stationId.slice(1).replace('-', ' ');
  if (stationId === 'joao-paulo-1') stationName = 'João Paulo I';

  React.useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await fetch(`/api/audit/${auditId}`);
        const result = await res.json();
        if (result.success) {
          setAuditData(result.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAudit();
  }, [auditId]);

  if (!auditData) return <div className={styles.documentBody}>Carregando documento...</div>;

  let totalEntries = 0;
  let totalExits = 0;
  let inoperantes = 0;
  let maxFlux = 0;
  let maxFluxTurnstile = '-';

  auditData.readings.forEach((r: any) => {
    if (r.isOutOfOrder) {
      inoperantes++;
    } else {
      const diffEntry = getFlow(r.entryStart, r.entryEnd);
      const diffExit = getFlow(r.exitStart, r.exitEnd);
      
      totalEntries += diffEntry;
      totalExits += diffExit;
      
      const totalFlux = diffEntry + diffExit;
      if (totalFlux > maxFlux) {
        maxFlux = totalFlux;
        maxFluxTurnstile = r.turnstileId;
      }
    }
  });

  return (
    <div className={styles.documentBody}>
      <div className={styles.screenControls}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <ArrowLeft size={18} /> Voltar para Dashboard
        </button>
        <button onClick={() => window.print()} className={styles.printBtn}>
          <Printer size={18} /> Imprimir / Gerar PDF A4
        </button>
      </div>

      <div className={styles.a4Paper} translate="no">
        {/* Hack avançado para margens perfeitas sem header/footer do navegador */}
        <table className={styles.printMarginTable}>
          <thead><tr><td><div className={styles.printMarginTop}></div></td></tr></thead>
          <tfoot><tr><td><div className={styles.printMarginBottom}></div></td></tr></tfoot>
          <tbody>
            <tr>
              <td>
                <div className={styles.documentContent}>
                  <div className={styles.header}>
                    <div>
                      <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0', color: '#000000', letterSpacing: '-0.02em' }}>Relatório de Auditoria</h1>
                      <p style={{ margin: 0, fontSize: '1rem', color: '#5f6368', fontWeight: 500 }}>Linha 6 - Laranja | Concessionária Linha Universidade</p>
                    </div>
                    <img src="/logo-linha-uni.png" alt="Logo Linha Uni" style={{ height: '75px', objectFit: 'contain' }} />
                  </div>

                  <div className={styles.metadataGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>ID do Documento</span>
            <span className={styles.metaValue}>{auditData.id}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Estação</span>
            <span className={styles.metaValue}>{stationName}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Data / Turno</span>
            <span className={styles.metaValue}>{new Date(auditData.date).toLocaleDateString('pt-BR')} - {auditData.endTime ? `${auditData.startTime} às ${auditData.endTime}` : auditData.startTime}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Responsável (Auditor)</span>
            <span className={styles.metaValue}>{auditData.operatorName || 'Não identificado'}</span>
          </div>
        </div>

                  <div className={styles.summaryBox}>
                    <h3>Resumo do Turno</h3>
                    <p>
                      Neste turno, compreendido entre <strong>{auditData.startTime} e {auditData.endTime}</strong>, a estação <strong>{stationName}</strong> registrou um fluxo total de <strong style={{color: '#10B981'}}>{totalEntries} entradas</strong> e <strong style={{color: '#EF4444'}}>{totalExits} saídas</strong>. 
                      {inoperantes > 0 
                        ? ` Foram identificados ${inoperantes} bloqueio(s) inoperante(s). ` 
                        : ' Todos os bloqueios operaram normalmente. '}
                      O bloqueio com maior movimentação foi o <strong>{maxFluxTurnstile}</strong>, contabilizando {maxFlux} acessos.
                    </p>
                  </div>

                  <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className={styles.sectionTitle}>Tabela de Contagem Diferencial (Comprovada)</h2>
                    <div className={styles.tableWrapper}>
            <table className={styles.auditTable}>
              <thead>
                <tr>
                  <th rowSpan={2}>Bloqueio</th>
                  <th colSpan={2}>Início do Turno</th>
                  <th colSpan={2}>Fim do Turno</th>
                  <th colSpan={2}>Fluxo do Turno (Líquido)</th>
                  <th rowSpan={2}>Status Final</th>
                </tr>
                <tr>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                </tr>
              </thead>
              <tbody>
                {auditData.readings.map((r: any) => {
                  const diffEntry = getFlow(r.entryStart, r.entryEnd);
                  const diffExit = getFlow(r.exitStart, r.exitEnd);
                  
                  return (
                    <tr key={r.turnstileId} style={{ backgroundColor: r.isOutOfOrder ? '#fef2f2' : 'transparent' }}>
                      <td><strong>{r.turnstileId}</strong></td>
                      
                      {/* Inicio Entrada */}
                      <td>{r.isOutOfOrder && r.entryStart === null ? '-' : r.entryStart}</td>
                      
                      {/* Inicio Saida */}
                      <td>{r.isOutOfOrder && r.exitStart === null ? '-' : r.exitStart}</td>
                      
                      {/* Fim Entrada */}
                      <td>{r.isOutOfOrder ? 'X' : r.entryEnd}</td>
                      
                      {/* Fim Saida */}
                      <td>{r.isOutOfOrder ? 'X' : r.exitEnd}</td>
                      
                      <td><strong style={{ color: '#10B981' }}>{diffEntry}</strong></td>
                      <td><strong style={{ color: '#EF4444' }}>{diffExit}</strong></td>
                      <td>
                        {r.isOutOfOrder ? (
                          <span style={{ color: '#EF4444', fontWeight: 'bold' }}>Inop.</span>
                        ) : 'Ativo'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold', paddingRight: '1rem', color: '#334155', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>TOTAL CONSOLIDADO DO TURNO:</td>
                  <td style={{ fontSize: '1.1rem', color: '#10B981' }}><strong>{totalEntries}</strong></td>
                  <td style={{ fontSize: '1.1rem', color: '#EF4444' }}><strong>{totalExits}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
                    </div>
                  </div>

                  {/* Anexo Fotográfico */}
                  <div className={styles.annexSection}>
                    <h2 className={styles.sectionTitle}>Anexo: Evidências Fotográficas</h2>
                    
                    <div className={styles.imageGridList}>
            {auditData.readings.map((r: any) => {
              if (!r.entryStartImg && !r.exitStartImg && !r.entryEndImg && !r.exitEndImg) return null;
              
              return (
                <div key={r.turnstileId} className={styles.imageCardGroup}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#0F172A', fontSize: '1.2rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>
                    Bloqueio: {r.turnstileId} {r.isOutOfOrder ? '(Inoperante)' : ''}
                  </h4>
                  
                  <div className={styles.imageGrid}>
                    {/* Imagens do Início */}
                    <div className={styles.imageColumn}>
                      <strong style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem', display: 'block' }}>INÍCIO DO TURNO</strong>
                      <div className={styles.imageRow}>
                        {r.entryStartImg && (
                          <div className={styles.imageWrapper}>
                            <div className={styles.imageLabel}>Entrada</div>
                            <img src={r.entryStartImg} alt="Entrada Início" className={styles.largeImage} />
                          </div>
                        )}
                        {r.exitStartImg && (
                          <div className={styles.imageWrapper}>
                            <div className={styles.imageLabel}>Saída</div>
                            <img src={r.exitStartImg} alt="Saída Início" className={styles.largeImage} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Imagens do Fim */}
                    <div className={styles.imageColumn}>
                      <strong style={{ fontSize: '0.9rem', color: '#EA580C', marginBottom: '0.5rem', display: 'block' }}>FIM DO TURNO</strong>
                      <div className={styles.imageRow}>
                        {r.entryEndImg && (
                          <div className={styles.imageWrapper}>
                            <div className={styles.imageLabel} style={{ color: '#EA580C' }}>Entrada</div>
                            <img src={r.entryEndImg} alt="Entrada Fim" className={styles.largeImage} />
                          </div>
                        )}
                        {r.exitEndImg && (
                          <div className={styles.imageWrapper}>
                            <div className={styles.imageLabel} style={{ color: '#EA580C' }}>Saída</div>
                            <img src={r.exitEndImg} alt="Saída Fim" className={styles.largeImage} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.signatureSection}>
          <div className={styles.signatureBox}>
            <div className={styles.signatureLine}></div>
            <span className={styles.signatureName}>{auditData.operatorName || 'Auditor'}</span>
            <span className={styles.signatureRole}>Auditor Responsável</span>
          </div>
          
          <div className={styles.signatureBox}>
            <div className={styles.signatureLine}></div>
            <span className={styles.signatureName}>____________________________</span>
            <span className={styles.signatureRole}>Gerência de Estação</span>
          </div>
        </div>

        <div className={styles.footer}>
          Relatório gerado digitalmente em {new Date().toLocaleString('pt-BR')} - Sistema de Indicadores Linha Uni
        </div>
      </div>
    </td>
  </tr>
</tbody>
</table>
</div>
</div>
);
}
