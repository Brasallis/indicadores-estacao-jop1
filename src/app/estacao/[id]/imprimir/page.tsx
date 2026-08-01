'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { getStationById } from '@/lib/stations';
import styles from './page.module.css';

export default function PrintForm() {
  const params = useParams();
  const router = useRouter();
  const stationId = params.id as string;
  const station = getStationById(stationId);

  // Gera as 11 catracas padronizadas
  const turnstiles = Array.from({ length: 11 }, (_, i) => {
    return `${station.code}_${String(i + 1).padStart(2, '0')}${i === 0 ? ' PNE' : ''}`;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    alert("Para salvar o documento em PDF, na tela de impressão selecione a opção 'Salvar como PDF' no campo de Destino/Impressora.");
    window.print();
  };

  return (
    <div className={styles.container}>
      <div className={styles.noPrint}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <ArrowLeft size={20} /> Voltar
        </button>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handleDownload} className={styles.downloadButton}>
            <Download size={20} /> Baixar PDF
          </button>
          <button onClick={handlePrint} className={styles.printButton}>
            <Printer size={20} /> Imprimir A4
          </button>
        </div>
      </div>

      <div className={styles.formHeader} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <img src="/logo-linha-uni.png" alt="Linha 6 - Linha Uni" style={{ height: '70px', objectFit: 'contain' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', textAlign: 'left' }}>Formulário de Contagem de Bloqueios</h1>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#64748b', textAlign: 'left', fontWeight: '500' }}>Estação: {station.name} ({station.code})</h2>
        </div>
      </div>

      <div className={styles.metadata}>
        <div>Data: <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
        <div>Turno: ( ) Manhã &nbsp;&nbsp;&nbsp; ( ) Tarde &nbsp;&nbsp;&nbsp; ( ) Noite</div>
      </div>

      <table>
        <thead>
          <tr>
            <th rowSpan={2}>Bloqueio</th>
            <th colSpan={2}>INÍCIO DO TURNO</th>
            <th colSpan={2}>FIM DO TURNO</th>
            <th rowSpan={2}>Status (X)</th>
          </tr>
          <tr>
            <th>Entrada (E)</th>
            <th>Saída (S)</th>
            <th>Entrada (E)</th>
            <th>Saída (S)</th>
          </tr>
        </thead>
        <tbody>
          {turnstiles.map((tid) => (
            <tr key={tid}>
              <td className={styles.turnstileId}>{tid}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.footer}>
        <div className={styles.signature}>
          Assinatura do Operador
        </div>
        <div className={styles.signature}>
          Assinatura do Supervisor
        </div>
      </div>
    </div>
  );
}
