'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';

export default function EdgeLab() {
  const [status, setStatus] = useState<string>('Aguardando inicialização...');
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const worker = useRef<Worker | null>(null);

  useEffect(() => {
    // Inicializar o Web Worker
    worker.current = new Worker(new URL('../../workers/visionWorker.ts', import.meta.url), {
      type: 'module'
    });

    worker.current.onmessage = (e) => {
      const { status, message, data } = e.data;
      if (status === 'init') {
        setStatus('Modelo pronto para rodar offline!');
      } else if (status === 'downloading') {
        setStatus(`Baixando/Carregando IA: ${message}`);
      } else if (status === 'log') {
        setLogs(prev => [...prev, message]);
      } else if (status === 'complete') {
        setResult(data);
        setIsProcessing(false);
        setStatus('Extração concluída!');
      } else if (status === 'error') {
        setStatus(`Erro: ${message}`);
        setIsProcessing(false);
      }
    };

    return () => {
      worker.current?.terminate();
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImage(event.target.result as string);
        setResult(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const processImage = () => {
    if (!image || !worker.current) return;
    setIsProcessing(true);
    setStatus('Iniciando processamento offline (Zero chamadas de rede)...');
    setLogs([]);
    worker.current.postMessage({ type: 'process', image });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Laboratório Edge AI (Fase 2)</h1>
        <p className={styles.subtitle}>Teste o processamento de imagem 100% offline no navegador.</p>
      </header>

      <div className={styles.labBox}>
        <div style={{ marginBottom: '1rem', fontWeight: 600 }}>Status do Motor AI: <span style={{ color: '#2563eb' }}>{status}</span></div>
        
        {!image ? (
          <label className={styles.uploadArea}>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <div>Clique aqui para selecionar uma foto da catraca</div>
          </label>
        ) : (
          <div>
            <img src={image} alt="Preview" className={styles.imagePreview} />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className={styles.button} 
                onClick={processImage} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Processando localmente...' : 'Extrair Leitura (Offline)'}
              </button>
              <button 
                className={styles.button} 
                style={{ backgroundColor: '#64748b' }}
                onClick={() => setImage(null)}
                disabled={isProcessing}
              >
                Limpar
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className={styles.resultBox}>
            <div className={styles.resultTitle}>Resultado da Extração Óptica:</div>
            <div className={styles.resultText}>{result}</div>
          </div>
        )}

        {logs.length > 0 && (
          <div className={styles.logBox}>
            {logs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
